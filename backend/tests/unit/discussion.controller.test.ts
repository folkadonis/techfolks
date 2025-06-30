import { Request, Response, NextFunction } from 'express';
import { DiscussionController } from '../../src/controllers/discussion.controller';
import { AppDataSource } from '../../src/config/database';
import { AuthRequest } from '../../src/middleware/auth.middleware';
import { UserRole } from '../../src/types/enums';
import { socketService } from '../../src/services/socketService';

// Mock dependencies
jest.mock('../../src/config/database');
jest.mock('../../src/services/socketService');

describe('DiscussionController', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      body: {},
      params: {},
      query: {},
      user: {
        userId: 1,
        username: 'testuser',
        role: UserRole.USER
      }
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    mockNext = jest.fn();

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('createDiscussion', () => {
    it('should create a new discussion successfully', async () => {
      const discussionData = {
        title: 'Test Discussion',
        content: 'This is a test discussion content',
        problem_id: 1
      };

      mockRequest.body = discussionData;

      const mockDiscussion = {
        id: 1,
        ...discussionData,
        user_id: 1,
        created_at: new Date()
      };

      const mockUserInfo = {
        username: 'testuser',
        full_name: 'Test User',
        avatar_url: null
      };

      (AppDataSource.query as jest.Mock)
        .mockResolvedValueOnce([mockDiscussion]) // Insert discussion
        .mockResolvedValueOnce([mockUserInfo]); // Get user info

      await DiscussionController.createDiscussion(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(AppDataSource.query).toHaveBeenCalledTimes(2);
      expect(socketService.broadcast).toHaveBeenCalledWith('discussion-created', {
        type: 'problem',
        id: 1,
        discussion: expect.objectContaining({
          ...mockDiscussion,
          user: mockUserInfo
        })
      });
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Discussion created successfully',
        data: expect.objectContaining({
          ...mockDiscussion,
          user: mockUserInfo
        })
      });
    });

    it('should require at least one context (problem, contest, or parent)', async () => {
      mockRequest.body = {
        title: 'Test Discussion',
        content: 'This is a test discussion content'
      };

      await DiscussionController.createDiscussion(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Discussion must be associated with a problem, contest, or be a reply'
      });
    });

    it('should validate parent discussion exists for replies', async () => {
      mockRequest.body = {
        content: 'This is a reply',
        parent_id: 999
      };

      (AppDataSource.query as jest.Mock).mockResolvedValueOnce([]); // No parent found

      await DiscussionController.createDiscussion(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Parent discussion not found'
      });
    });

    it('should handle database errors', async () => {
      mockRequest.body = {
        title: 'Test Discussion',
        content: 'This is a test discussion content',
        problem_id: 1
      };

      const error = new Error('Database error');
      (AppDataSource.query as jest.Mock).mockRejectedValueOnce(error);

      await DiscussionController.createDiscussion(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('updateDiscussion', () => {
    it('should update discussion by owner', async () => {
      mockRequest.params = { id: '1' };
      mockRequest.body = { content: 'Updated content' };

      const mockDiscussion = {
        id: 1,
        user_id: 1,
        content: 'Original content'
      };

      const updatedDiscussion = {
        ...mockDiscussion,
        content: 'Updated content',
        updated_at: new Date()
      };

      (AppDataSource.query as jest.Mock)
        .mockResolvedValueOnce([mockDiscussion]) // Get discussion
        .mockResolvedValueOnce([updatedDiscussion]); // Update discussion

      await DiscussionController.updateDiscussion(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Discussion updated successfully',
        data: updatedDiscussion
      });
    });

    it('should allow admin/moderator to update any discussion', async () => {
      mockRequest.params = { id: '1' };
      mockRequest.body = { content: 'Updated content' };
      mockRequest.user!.role = UserRole.ADMIN;

      const mockDiscussion = {
        id: 1,
        user_id: 2, // Different user
        content: 'Original content'
      };

      (AppDataSource.query as jest.Mock)
        .mockResolvedValueOnce([mockDiscussion])
        .mockResolvedValueOnce([{ ...mockDiscussion, content: 'Updated content' }]);

      await DiscussionController.updateDiscussion(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should deny update for non-owner regular users', async () => {
      mockRequest.params = { id: '1' };
      mockRequest.body = { content: 'Updated content' };

      const mockDiscussion = {
        id: 1,
        user_id: 2, // Different user
        content: 'Original content'
      };

      (AppDataSource.query as jest.Mock).mockResolvedValueOnce([mockDiscussion]);

      await DiscussionController.updateDiscussion(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'You do not have permission to edit this discussion'
      });
    });
  });

  describe('voteDiscussion', () => {
    it('should record an upvote', async () => {
      mockRequest.params = { id: '1' };
      mockRequest.body = { vote: 1 };

      (AppDataSource.query as jest.Mock)
        .mockResolvedValueOnce([{ id: 1 }]) // Discussion exists
        .mockResolvedValueOnce([]) // Insert vote
        .mockResolvedValueOnce([{ upvotes: 5, downvotes: 2 }]) // Get vote counts
        .mockResolvedValueOnce([]); // Update discussion

      await DiscussionController.voteDiscussion(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Vote recorded successfully',
        data: {
          upvotes: 5,
          downvotes: 2,
          user_vote: 1
        }
      });
    });

    it('should remove vote when vote is 0', async () => {
      mockRequest.params = { id: '1' };
      mockRequest.body = { vote: 0 };

      (AppDataSource.query as jest.Mock)
        .mockResolvedValueOnce([{ id: 1 }]) // Discussion exists
        .mockResolvedValueOnce([]) // Delete vote
        .mockResolvedValueOnce([{ upvotes: 4, downvotes: 2 }]) // Get vote counts
        .mockResolvedValueOnce([]); // Update discussion

      await DiscussionController.voteDiscussion(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(AppDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM discussion_votes'),
        [1, '1']
      );
    });

    it('should validate vote value', async () => {
      mockRequest.params = { id: '1' };
      mockRequest.body = { vote: 5 }; // Invalid vote value

      await DiscussionController.voteDiscussion(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid vote value'
      });
    });
  });

  describe('getDiscussions', () => {
    it('should get discussions with pagination', async () => {
      mockRequest.query = {
        problem_id: '1',
        page: '1',
        limit: '20'
      };

      const mockDiscussions = [
        {
          id: 1,
          content: 'Discussion 1',
          username: 'user1',
          upvotes: 5,
          downvotes: 1,
          reply_count: 3
        },
        {
          id: 2,
          content: 'Discussion 2',
          username: 'user2',
          upvotes: 3,
          downvotes: 0,
          reply_count: 1
        }
      ];

      (AppDataSource.query as jest.Mock)
        .mockResolvedValueOnce([{ total: '25' }]) // Count query
        .mockResolvedValueOnce(mockDiscussions) // Get discussions
        .mockResolvedValueOnce([]); // User votes (empty for unauthenticated)

      await DiscussionController.getDiscussions(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockDiscussions,
        pagination: {
          page: 1,
          limit: 20,
          total: 25,
          totalPages: 2
        }
      });
    });

    it('should include user votes for authenticated users', async () => {
      mockRequest.query = { problem_id: '1' };
      mockRequest.user = { userId: 1, username: 'testuser', role: UserRole.USER };

      const mockDiscussions = [{ id: 1 }, { id: 2 }];
      const mockUserVotes = [
        { discussion_id: 1, vote: 1 },
        { discussion_id: 2, vote: -1 }
      ];

      (AppDataSource.query as jest.Mock)
        .mockResolvedValueOnce([{ total: '2' }])
        .mockResolvedValueOnce(mockDiscussions)
        .mockResolvedValueOnce(mockUserVotes);

      await DiscussionController.getDiscussions(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data[0].user_vote).toBe(1);
      expect(responseData.data[1].user_vote).toBe(-1);
    });
  });

  describe('pinDiscussion', () => {
    it('should allow admin/moderator to pin discussion', async () => {
      mockRequest.params = { id: '1' };
      mockRequest.body = { pinned: true };
      mockRequest.user!.role = UserRole.ADMIN;

      (AppDataSource.query as jest.Mock).mockResolvedValueOnce([]);

      await DiscussionController.pinDiscussion(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(AppDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE discussions'),
        [true, '1']
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Discussion pinned'
      });
    });

    it('should deny pin for regular users', async () => {
      mockRequest.params = { id: '1' };
      mockRequest.body = { pinned: true };

      await DiscussionController.pinDiscussion(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Only admins and moderators can pin discussions'
      });
    });
  });

  describe('createAnnouncement', () => {
    it('should create announcement and emit notification', async () => {
      mockRequest.body = {
        title: 'Important Announcement',
        content: 'This is an important announcement',
        contest_id: 1
      };
      mockRequest.user!.role = UserRole.ADMIN;

      const mockAnnouncement = {
        id: 1,
        title: 'Important Announcement',
        content: 'This is an important announcement',
        created_at: new Date()
      };

      (AppDataSource.query as jest.Mock).mockResolvedValueOnce([mockAnnouncement]);

      await DiscussionController.createAnnouncement(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(socketService.emitToContest).toHaveBeenCalledWith(1, 'announcement', {
        title: 'Important Announcement',
        content: 'This is an important announcement',
        created_at: mockAnnouncement.created_at
      });
      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it('should broadcast globally for non-contest announcements', async () => {
      mockRequest.body = {
        title: 'Global Announcement',
        content: 'This is a global announcement'
      };
      mockRequest.user!.role = UserRole.ADMIN;

      const mockAnnouncement = {
        id: 1,
        created_at: new Date()
      };

      (AppDataSource.query as jest.Mock).mockResolvedValueOnce([mockAnnouncement]);

      await DiscussionController.createAnnouncement(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(socketService.broadcast).toHaveBeenCalledWith('announcement', {
        title: 'Global Announcement',
        content: 'This is a global announcement',
        problem_id: undefined,
        created_at: mockAnnouncement.created_at
      });
    });
  });
});