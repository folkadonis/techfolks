import { Router } from 'express';
import { TeamController } from '../controllers/team.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { body, param, query } from 'express-validator';

const router = Router();

// Get all teams (public)
router.get('/',
  [
    query('search').optional().isString().trim(),
    query('is_public').optional().isBoolean(),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('sort').optional().isIn(['created_at', 'name', 'member_count']).withMessage('Invalid sort field'),
    query('order').optional().isIn(['ASC', 'DESC']).withMessage('Invalid sort order')
  ],
  validate,
  TeamController.getTeams
);

// Get team details (public)
router.get('/:id',
  [
    param('id').isInt().withMessage('Invalid team ID')
  ],
  validate,
  TeamController.getTeam
);

// Create team (requires authentication)
router.post('/',
  authenticate,
  [
    body('name').notEmpty().isString().trim().isLength({ min: 3, max: 100 })
      .withMessage('Team name must be between 3 and 100 characters'),
    body('description').optional().isString().trim().isLength({ max: 500 })
      .withMessage('Description must not exceed 500 characters'),
    body('is_public').optional().isBoolean()
      .withMessage('is_public must be a boolean value')
  ],
  validate,
  TeamController.createTeam
);

// Update team (requires authentication and team leader role)
router.put('/:id',
  authenticate,
  [
    param('id').isInt().withMessage('Invalid team ID'),
    body('name').notEmpty().isString().trim().isLength({ min: 3, max: 100 })
      .withMessage('Team name must be between 3 and 100 characters'),
    body('description').optional().isString().trim().isLength({ max: 500 })
      .withMessage('Description must not exceed 500 characters'),
    body('is_public').optional().isBoolean()
      .withMessage('is_public must be a boolean value')
  ],
  validate,
  TeamController.updateTeam
);

// Join team with invite code (requires authentication)
router.post('/join',
  authenticate,
  [
    body('invite_code').notEmpty().isString().trim()
      .withMessage('Invite code is required')
  ],
  validate,
  TeamController.joinTeam
);

// Leave team (requires authentication)
router.post('/:id/leave',
  authenticate,
  [
    param('id').isInt().withMessage('Invalid team ID')
  ],
  validate,
  TeamController.leaveTeam
);

// Update member role (requires authentication and team leader role)
router.put('/:id/members/:user_id/role',
  authenticate,
  [
    param('id').isInt().withMessage('Invalid team ID'),
    param('user_id').isInt().withMessage('Invalid user ID'),
    body('role').isIn(['member', 'co-leader']).withMessage('Invalid role')
  ],
  validate,
  TeamController.updateMemberRole
);

// Register team for contest (requires authentication)
router.post('/contest/register',
  authenticate,
  [
    body('team_id').isInt().withMessage('Team ID is required'),
    body('contest_id').isInt().withMessage('Contest ID is required')
  ],
  validate,
  TeamController.registerForContest
);

// Get team contests
router.get('/:team_id/contests',
  [
    param('team_id').isInt().withMessage('Invalid team ID'),
    query('status').optional().isIn(['upcoming', 'ongoing', 'past']).withMessage('Invalid status'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
  ],
  validate,
  TeamController.getTeamContests
);

export default router;