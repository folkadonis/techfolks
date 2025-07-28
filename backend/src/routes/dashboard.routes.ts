import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * /api/dashboard:
 *   get:
 *     summary: Get user dashboard statistics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     problemsSolved:
 *                       type: integer
 *                     contestsParticipated:
 *                       type: integer
 *                     currentRating:
 *                       type: integer
 *                     maxRating:
 *                       type: integer
 *                     totalSubmissions:
 *                       type: integer
 *                     acceptedSubmissions:
 *                       type: integer
 *                     accuracyRate:
 *                       type: integer
 *                     recentSubmissions:
 *                       type: array
 *                     upcomingContests:
 *                       type: array
 *                     recentContests:
 *                       type: array
 *       401:
 *         description: Authentication required
 */
router.get('/', authenticate, DashboardController.getDashboardStats);

export default router;