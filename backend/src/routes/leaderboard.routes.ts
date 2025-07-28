import { Router } from 'express';
import { query } from 'express-validator';
import { validate } from '../middleware/validation.middleware';
import * as leaderboardController from '../controllers/leaderboard.controller';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     LeaderboardEntry:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         username:
 *           type: string
 *         rating:
 *           type: integer
 *         max_rating:
 *           type: integer
 *         problems_solved:
 *           type: integer
 *         contests_participated:
 *           type: integer
 *         rank:
 *           type: integer
 *         country:
 *           type: string
 *         avatar_url:
 *           type: string
 *         last_active:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/leaderboard/global:
 *   get:
 *     summary: Get global leaderboard
 *     tags: [Leaderboard]
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
 *           default: 50
 *           maximum: 100
 *       - in: query
 *         name: timeFrame
 *         schema:
 *           type: string
 *           enum: [all-time, monthly, weekly]
 *           default: all-time
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [rating, problems, contests]
 *           default: rating
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Leaderboard data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/LeaderboardEntry'
 *                 pagination:
 *                   type: object
 */
router.get('/global',
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('timeFrame').optional().isIn(['all-time', 'monthly', 'weekly']),
  query('category').optional().isIn(['rating', 'problems', 'contests']),
  query('search').optional().isString().trim(),
  validate,
  leaderboardController.getGlobalLeaderboard
);

/**
 * @swagger
 * /api/leaderboard/weekly:
 *   get:
 *     summary: Get weekly leaderboard
 *     tags: [Leaderboard]
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
 *           default: 50
 *     responses:
 *       200:
 *         description: Weekly leaderboard data
 */
router.get('/weekly',
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  validate,
  leaderboardController.getWeeklyLeaderboard
);

/**
 * @swagger
 * /api/leaderboard/monthly:
 *   get:
 *     summary: Get monthly leaderboard
 *     tags: [Leaderboard]
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
 *           default: 50
 *     responses:
 *       200:
 *         description: Monthly leaderboard data
 */
router.get('/monthly',
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  validate,
  leaderboardController.getMonthlyLeaderboard
);

/**
 * @swagger
 * /api/leaderboard/user/{userId}:
 *   get:
 *     summary: Get user's leaderboard position
 *     tags: [Leaderboard]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: User's leaderboard position
 */
router.get('/user/:userId',
  leaderboardController.getUserPosition
);

export default router;