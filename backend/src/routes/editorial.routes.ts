import { Router } from 'express';
import { EditorialController } from '../controllers/editorial.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { body, param, query } from 'express-validator';
import { UserRole } from '../types/enums';

const router = Router();

// Get editorial for a problem (public)
router.get('/problem/:problem_id',
  [
    param('problem_id').isInt().withMessage('Invalid problem ID')
  ],
  validate,
  EditorialController.getEditorial
);

// Create editorial (requires authentication and permission)
router.post('/',
  authenticate,
  [
    body('problem_id').isInt().withMessage('Problem ID is required'),
    body('content').notEmpty().isString().trim().isLength({ min: 100, max: 50000 })
      .withMessage('Content must be between 100 and 50000 characters'),
    body('solution_approach').notEmpty().isString().trim()
      .withMessage('Solution approach is required'),
    body('time_complexity').notEmpty().isString().trim()
      .withMessage('Time complexity is required'),
    body('space_complexity').notEmpty().isString().trim()
      .withMessage('Space complexity is required'),
    body('code_snippets').optional().isArray()
      .withMessage('Code snippets must be an array'),
    body('code_snippets.*.language').isString()
      .withMessage('Language is required for each code snippet'),
    body('code_snippets.*.code').isString()
      .withMessage('Code is required for each snippet')
  ],
  validate,
  EditorialController.createEditorial
);

// Update editorial (requires authentication and permission)
router.put('/:id',
  authenticate,
  [
    param('id').isInt().withMessage('Invalid editorial ID'),
    body('content').notEmpty().isString().trim().isLength({ min: 100, max: 50000 })
      .withMessage('Content must be between 100 and 50000 characters'),
    body('solution_approach').notEmpty().isString().trim()
      .withMessage('Solution approach is required'),
    body('time_complexity').notEmpty().isString().trim()
      .withMessage('Time complexity is required'),
    body('space_complexity').notEmpty().isString().trim()
      .withMessage('Space complexity is required'),
    body('code_snippets').optional().isArray()
      .withMessage('Code snippets must be an array')
  ],
  validate,
  EditorialController.updateEditorial
);

// Submit a solution to an editorial (requires authentication)
router.post('/solution',
  authenticate,
  [
    body('editorial_id').isInt().withMessage('Editorial ID is required'),
    body('language').notEmpty().isString().trim()
      .withMessage('Language is required'),
    body('code').notEmpty().isString().trim().isLength({ min: 10, max: 10000 })
      .withMessage('Code must be between 10 and 10000 characters'),
    body('explanation').optional().isString().trim().isLength({ max: 5000 })
      .withMessage('Explanation must not exceed 5000 characters')
  ],
  validate,
  EditorialController.submitSolution
);

// Get solutions for an editorial (public)
router.get('/:editorial_id/solutions',
  [
    param('editorial_id').isInt().withMessage('Invalid editorial ID'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
    query('language').optional().isString().withMessage('Invalid language')
  ],
  validate,
  EditorialController.getSolutions
);

// Vote on a solution (requires authentication)
router.post('/solution/:id/vote',
  authenticate,
  [
    param('id').isInt().withMessage('Invalid solution ID'),
    body('vote').isIn([-1, 0, 1]).withMessage('Vote must be -1, 0, or 1')
  ],
  validate,
  EditorialController.voteSolution
);

// Approve/reject solution (admin/moderator only)
router.post('/solution/:id/approve',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.MODERATOR),
  [
    param('id').isInt().withMessage('Invalid solution ID'),
    body('approved').isBoolean().withMessage('Approved must be a boolean value')
  ],
  validate,
  EditorialController.approveSolution
);

export default router;