import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserRole } from '../types/enums';
import { socketService } from '../services/socketService';

export class DiscussionController {
  static async createDiscussion(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { title, content, problem_id, contest_id, parent_id } = req.body;
      const userId = req.user!.userId;

      // Validate at least one context (problem or contest)
      if (!problem_id && !contest_id && !parent_id) {
        return res.status(400).json({
          success: false,
          message: 'Discussion must be associated with a problem, contest, or be a reply'
        });
      }

      // If it's a reply, validate parent exists
      if (parent_id) {
        const parent = await AppDataSource.query(`
          SELECT id FROM discussions WHERE id = $1
        `, [parent_id]);

        if (parent.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'Parent discussion not found'
          });
        }
      }

      // Create discussion
      const result = await AppDataSource.query(`
        INSERT INTO discussions (user_id, problem_id, contest_id, parent_id, title, content)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [userId, problem_id || null, contest_id || null, parent_id || null, title || null, content]);

      const discussion = result[0];

      // Get user info
      const userInfo = await AppDataSource.query(`
        SELECT username, full_name, avatar_url FROM users WHERE id = $1
      `, [userId]);

      discussion.user = userInfo[0];

      // Emit real-time update
      if (problem_id) {
        socketService.broadcast('discussion-created', {
          type: 'problem',
          id: problem_id,
          discussion
        });
      } else if (contest_id) {
        socketService.emitToContest(contest_id, 'discussion-created', {
          type: 'contest',
          discussion
        });
      }

      res.status(201).json({
        success: true,
        message: 'Discussion created successfully',
        data: discussion
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateDiscussion(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { content } = req.body;
      const userId = req.user!.userId;

      // Get discussion
      const discussions = await AppDataSource.query(`
        SELECT * FROM discussions WHERE id = $1
      `, [id]);

      if (discussions.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Discussion not found'
        });
      }

      const discussion = discussions[0];

      // Check permissions
      if (discussion.user_id !== userId && req.user!.role !== UserRole.ADMIN && req.user!.role !== UserRole.MODERATOR) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to edit this discussion'
        });
      }

      // Update discussion
      const updated = await AppDataSource.query(`
        UPDATE discussions
        SET content = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `, [content, id]);

      res.json({
        success: true,
        message: 'Discussion updated successfully',
        data: updated[0]
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteDiscussion(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      // Get discussion
      const discussions = await AppDataSource.query(`
        SELECT * FROM discussions WHERE id = $1
      `, [id]);

      if (discussions.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Discussion not found'
        });
      }

      const discussion = discussions[0];

      // Check permissions
      if (discussion.user_id !== userId && req.user!.role !== UserRole.ADMIN && req.user!.role !== UserRole.MODERATOR) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to delete this discussion'
        });
      }

      // Soft delete by setting content
      await AppDataSource.query(`
        UPDATE discussions
        SET content = '[deleted]', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [id]);

      res.json({
        success: true,
        message: 'Discussion deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async getDiscussions(req: Request, res: Response, next: NextFunction) {
    try {
      const { 
        problem_id, 
        contest_id, 
        parent_id,
        page = 1, 
        limit = 20,
        sort = 'created_at',
        order = 'DESC'
      } = req.query;

      let whereConditions = [];
      let params = [];
      let paramCount = 0;

      if (problem_id) {
        whereConditions.push(`d.problem_id = $${++paramCount}`);
        params.push(problem_id);
      }

      if (contest_id) {
        whereConditions.push(`d.contest_id = $${++paramCount}`);
        params.push(contest_id);
      }

      if (parent_id !== undefined) {
        if (parent_id === 'null' || parent_id === '0') {
          whereConditions.push(`d.parent_id IS NULL`);
        } else {
          whereConditions.push(`d.parent_id = $${++paramCount}`);
          params.push(parent_id);
        }
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM discussions d
        ${whereClause}
      `;
      const countResult = await AppDataSource.query(countQuery, params);
      const total = parseInt(countResult[0].total);

      // Get discussions with user info and vote counts
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      const allowedSortFields = ['created_at', 'upvotes'];
      const sortField = allowedSortFields.includes(sort as string) ? sort : 'created_at';
      const sortOrder = order === 'ASC' ? 'ASC' : 'DESC';

      params.push(limitNum, offset);

      const query = `
        SELECT 
          d.*,
          u.username,
          u.full_name,
          u.avatar_url,
          u.rating,
          COALESCE(SUM(CASE WHEN dv.vote = 1 THEN 1 ELSE 0 END), 0) as upvotes,
          COALESCE(SUM(CASE WHEN dv.vote = -1 THEN 1 ELSE 0 END), 0) as downvotes,
          (
            SELECT COUNT(*) 
            FROM discussions 
            WHERE parent_id = d.id
          ) as reply_count
        FROM discussions d
        INNER JOIN users u ON d.user_id = u.id
        LEFT JOIN discussion_votes dv ON d.id = dv.discussion_id
        ${whereClause}
        GROUP BY d.id, u.id
        ORDER BY ${sortField === 'upvotes' ? 'upvotes' : `d.${sortField}`} ${sortOrder}
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;

      const discussions = await AppDataSource.query(query, params);

      // Get current user's votes if authenticated
      const userId = (req as AuthRequest).user?.userId;
      if (userId && discussions.length > 0) {
        const discussionIds = discussions.map((d: any) => d.id);
        const userVotes = await AppDataSource.query(`
          SELECT discussion_id, vote
          FROM discussion_votes
          WHERE user_id = $1 AND discussion_id = ANY($2)
        `, [userId, discussionIds]);

        const voteMap = userVotes.reduce((acc: any, v: any) => {
          acc[v.discussion_id] = v.vote;
          return acc;
        }, {});

        discussions.forEach((d: any) => {
          d.user_vote = voteMap[d.id] || 0;
        });
      }

      res.json({
        success: true,
        data: discussions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async voteDiscussion(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { vote } = req.body; // 1 for upvote, -1 for downvote, 0 to remove vote
      const userId = req.user!.userId;

      // Validate vote value
      if (![-1, 0, 1].includes(vote)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid vote value'
        });
      }

      // Check if discussion exists
      const discussions = await AppDataSource.query(`
        SELECT id FROM discussions WHERE id = $1
      `, [id]);

      if (discussions.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Discussion not found'
        });
      }

      if (vote === 0) {
        // Remove vote
        await AppDataSource.query(`
          DELETE FROM discussion_votes
          WHERE user_id = $1 AND discussion_id = $2
        `, [userId, id]);
      } else {
        // Insert or update vote
        await AppDataSource.query(`
          INSERT INTO discussion_votes (user_id, discussion_id, vote)
          VALUES ($1, $2, $3)
          ON CONFLICT (user_id, discussion_id)
          DO UPDATE SET vote = $3
        `, [userId, id, vote]);
      }

      // Get updated vote counts
      const voteCounts = await AppDataSource.query(`
        SELECT 
          COALESCE(SUM(CASE WHEN vote = 1 THEN 1 ELSE 0 END), 0) as upvotes,
          COALESCE(SUM(CASE WHEN vote = -1 THEN 1 ELSE 0 END), 0) as downvotes
        FROM discussion_votes
        WHERE discussion_id = $1
      `, [id]);

      // Update discussion upvotes count
      await AppDataSource.query(`
        UPDATE discussions
        SET upvotes = $1
        WHERE id = $2
      `, [voteCounts[0].upvotes, id]);

      res.json({
        success: true,
        message: 'Vote recorded successfully',
        data: {
          upvotes: parseInt(voteCounts[0].upvotes),
          downvotes: parseInt(voteCounts[0].downvotes),
          user_vote: vote
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async pinDiscussion(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { pinned } = req.body;

      // Only admins and moderators can pin discussions
      if (req.user!.role !== UserRole.ADMIN && req.user!.role !== UserRole.MODERATOR) {
        return res.status(403).json({
          success: false,
          message: 'Only admins and moderators can pin discussions'
        });
      }

      await AppDataSource.query(`
        UPDATE discussions
        SET is_pinned = $1
        WHERE id = $2
      `, [pinned, id]);

      res.json({
        success: true,
        message: pinned ? 'Discussion pinned' : 'Discussion unpinned'
      });
    } catch (error) {
      next(error);
    }
  }

  static async createAnnouncement(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { title, content, problem_id, contest_id } = req.body;
      const userId = req.user!.userId;

      // Only admins and moderators can create announcements
      if (req.user!.role !== UserRole.ADMIN && req.user!.role !== UserRole.MODERATOR) {
        return res.status(403).json({
          success: false,
          message: 'Only admins and moderators can create announcements'
        });
      }

      const result = await AppDataSource.query(`
        INSERT INTO discussions (user_id, problem_id, contest_id, title, content, is_announcement, is_pinned)
        VALUES ($1, $2, $3, $4, $5, true, true)
        RETURNING *
      `, [userId, problem_id || null, contest_id || null, title, content]);

      const announcement = result[0];

      // Emit real-time notification
      if (contest_id) {
        socketService.emitToContest(contest_id, 'announcement', {
          title,
          content,
          created_at: announcement.created_at
        });
      } else {
        socketService.broadcast('announcement', {
          title,
          content,
          problem_id,
          created_at: announcement.created_at
        });
      }

      res.status(201).json({
        success: true,
        message: 'Announcement created successfully',
        data: announcement
      });
    } catch (error) {
      next(error);
    }
  }
}