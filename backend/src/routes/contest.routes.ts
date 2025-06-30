import { Router } from 'express';
import { ContestController } from '../controllers/contest.controller';
import { authenticate, authorize, optionalAuth } from '../middleware/auth.middleware';
import { contestValidationRules, validate } from '../middleware/validation.middleware';
import { UserRole } from '../types/enums';

const router = Router();

/**
 * @swagger
 * /contests:
 *   get:
 *     summary: Get list of contests
 *     tags: [Contests]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [upcoming, running, ended]
 *       - in: query
 *         name: contest_type
 *         schema:
 *           type: string
 *           enum: [ACM_ICPC, IOI, AtCoder, CodeForces]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [start_time, end_time, title, created_at]
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *     responses:
 *       200:
 *         description: List of contests with pagination
 */
router.get('/', optionalAuth, ContestController.getContests);

/**
 * @swagger
 * /contests/my:
 *   get:
 *     summary: Get user's registered contests
 *     tags: [Contests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [upcoming, running, ended]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of user's contests
 *       401:
 *         description: Authentication required
 */
router.get('/my', authenticate, ContestController.getMyContests);

/**
 * @swagger
 * /contests/{slug}:
 *   get:
 *     summary: Get contest details by slug
 *     tags: [Contests]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Contest details with problems
 *       404:
 *         description: Contest not found
 *       403:
 *         description: Access denied (private contest)
 */
router.get('/:slug', optionalAuth, ContestController.getContest);

/**
 * @swagger
 * /contests:
 *   post:
 *     summary: Create a new contest
 *     tags: [Contests]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - contest_type
 *               - start_time
 *               - end_time
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               contest_type:
 *                 type: string
 *                 enum: [ACM_ICPC, IOI, AtCoder, CodeForces]
 *               start_time:
 *                 type: string
 *                 format: date-time
 *               end_time:
 *                 type: string
 *                 format: date-time
 *               is_public:
 *                 type: boolean
 *                 default: true
 *               registration_open:
 *                 type: boolean
 *                 default: true
 *               problem_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       201:
 *         description: Contest created successfully
 *       403:
 *         description: Only admins can create contests
 */
router.post(
  '/',
  authenticate,
  authorize(UserRole.ADMIN),
  contestValidationRules.create,
  validate,
  ContestController.createContest
);

/**
 * @swagger
 * /contests/{id}:
 *   put:
 *     summary: Update a contest
 *     tags: [Contests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               contest_type:
 *                 type: string
 *                 enum: [ACM_ICPC, IOI, AtCoder, CodeForces]
 *               start_time:
 *                 type: string
 *                 format: date-time
 *               end_time:
 *                 type: string
 *                 format: date-time
 *               is_public:
 *                 type: boolean
 *               registration_open:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Contest updated successfully
 *       404:
 *         description: Contest not found
 *       403:
 *         description: Only admins can update contests
 */
router.put(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  contestValidationRules.update,
  validate,
  ContestController.updateContest
);

/**
 * @swagger
 * /contests/{id}:
 *   delete:
 *     summary: Delete a contest
 *     tags: [Contests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Contest deleted successfully
 *       404:
 *         description: Contest not found
 *       403:
 *         description: Only admins can delete contests
 *       400:
 *         description: Cannot delete a contest that has started
 */
router.delete(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  ContestController.deleteContest
);

/**
 * @swagger
 * /contests/{id}/register:
 *   post:
 *     summary: Register for a contest
 *     tags: [Contests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Successfully registered for contest
 *       404:
 *         description: Contest not found
 *       400:
 *         description: Registration closed or already registered
 */
router.post(
  '/:id/register',
  authenticate,
  ContestController.registerForContest
);

/**
 * @swagger
 * /contests/{id}/standings:
 *   get:
 *     summary: Get contest standings/leaderboard
 *     tags: [Contests]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *     responses:
 *       200:
 *         description: Contest standings
 *       404:
 *         description: Contest not found
 *       400:
 *         description: Contest has not started yet
 */
router.get('/:id/standings', ContestController.getContestStandings);

export default router;