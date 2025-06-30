import { Router } from 'express';
import { DiscussionController } from '../controllers/discussion.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { body, query, param } from 'express-validator';

const router = Router();

// Get discussions
router.get('/',
  [
    query('problem_id').optional().isInt().withMessage('Invalid problem ID'),
    query('contest_id').optional().isInt().withMessage('Invalid contest ID'),
    query('parent_id').optional().custom((value) => {
      return value === 'null' || value === '0' || !isNaN(parseInt(value));
    }).withMessage('Invalid parent ID'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('sort').optional().isIn(['created_at', 'upvotes']).withMessage('Invalid sort field'),
    query('order').optional().isIn(['ASC', 'DESC']).withMessage('Invalid sort order')
  ],
  validate,
  DiscussionController.getDiscussions
);

// Create discussion (requires authentication)
router.post('/',
  authenticate,
  [
    body('title').optional().isString().trim().isLength({ min: 3, max: 200 })
      .withMessage('Title must be between 3 and 200 characters'),
    body('content').notEmpty().isString().trim().isLength({ min: 10, max: 10000 })
      .withMessage('Content must be between 10 and 10000 characters'),
    body('problem_id').optional().isInt().withMessage('Invalid problem ID'),
    body('contest_id').optional().isInt().withMessage('Invalid contest ID'),
    body('parent_id').optional().isInt().withMessage('Invalid parent ID')
  ],
  validate,
  DiscussionController.createDiscussion
);

// Update discussion (requires authentication)
router.put('/:id',
  authenticate,
  [
    param('id').isInt().withMessage('Invalid discussion ID'),
    body('content').notEmpty().isString().trim().isLength({ min: 10, max: 10000 })
      .withMessage('Content must be between 10 and 10000 characters')
  ],
  validate,
  DiscussionController.updateDiscussion
);

// Delete discussion (requires authentication)
router.delete('/:id',
  authenticate,
  [
    param('id').isInt().withMessage('Invalid discussion ID')
  ],
  validate,
  DiscussionController.deleteDiscussion
);

// Vote on discussion (requires authentication)
router.post('/:id/vote',
  authenticate,
  [
    param('id').isInt().withMessage('Invalid discussion ID'),
    body('vote').isIn([-1, 0, 1]).withMessage('Vote must be -1, 0, or 1')
  ],
  validate,
  DiscussionController.voteDiscussion
);

// Pin/unpin discussion (requires admin/moderator)
router.post('/:id/pin',
  authenticate,
  [
    param('id').isInt().withMessage('Invalid discussion ID'),
    body('pinned').isBoolean().withMessage('Pinned must be a boolean value')
  ],
  validate,
  DiscussionController.pinDiscussion
);

// Create announcement (requires admin/moderator)
router.post('/announcement',
  authenticate,
  [
    body('title').notEmpty().isString().trim().isLength({ min: 3, max: 200 })
      .withMessage('Title must be between 3 and 200 characters'),
    body('content').notEmpty().isString().trim().isLength({ min: 10, max: 10000 })
      .withMessage('Content must be between 10 and 10000 characters'),
    body('problem_id').optional().isInt().withMessage('Invalid problem ID'),
    body('contest_id').optional().isInt().withMessage('Invalid contest ID')
  ],
  validate,
  DiscussionController.createAnnouncement
);

export default router;