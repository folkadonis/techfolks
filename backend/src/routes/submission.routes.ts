import { Router } from 'express';
import { SubmissionController } from '../controllers/submission.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { submissionValidationRules, validate } from '../middleware/validation.middleware';
import { UserRole } from '../types/enums';

const router = Router();

/**
 * @swagger
 * /submissions:
 *   post:
 *     summary: Submit a solution
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - problem_id
 *               - language
 *               - source_code
 *             properties:
 *               problem_id:
 *                 type: integer
 *               language:
 *                 type: string
 *                 enum: [c, cpp, java, python, javascript, go, rust, csharp]
 *               source_code:
 *                 type: string
 *               contest_id:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Submission created and queued for processing
 *       404:
 *         description: Problem not found
 *       403:
 *         description: Access denied
 */
router.post(
  '/',
  authenticate,
  submissionValidationRules.create,
  validate,
  SubmissionController.createSubmission
);

/**
 * @swagger
 * /submissions:
 *   get:
 *     summary: Get list of submissions
 *     tags: [Submissions]
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
 *         name: user_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: problem_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: contest_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: verdict
 *         schema:
 *           type: string
 *           enum: [pending, accepted, wrong_answer, time_limit_exceeded, memory_limit_exceeded, runtime_error, compilation_error]
 *       - in: query
 *         name: language
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of submissions with pagination
 */
router.get('/', SubmissionController.getSubmissions);

/**
 * @swagger
 * /submissions/my:
 *   get:
 *     summary: Get user's own submissions
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
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
 *         name: problem_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: verdict
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of user's submissions
 *       401:
 *         description: Authentication required
 */
router.get('/my', authenticate, SubmissionController.getUserSubmissions);

/**
 * @swagger
 * /submissions/run:
 *   post:
 *     summary: Run code without submitting
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - language
 *               - source_code
 *             properties:
 *               language:
 *                 type: string
 *                 enum: [c, cpp, java, python, javascript, go, rust, csharp]
 *               source_code:
 *                 type: string
 *               input:
 *                 type: string
 *     responses:
 *       200:
 *         description: Code execution result
 *       400:
 *         description: Invalid input
 */
router.post(
  '/run',
  authenticate,
  submissionValidationRules.runCode,
  validate,
  SubmissionController.runCode
);

/**
 * @swagger
 * /submissions/{id}:
 *   get:
 *     summary: Get submission details
 *     tags: [Submissions]
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
 *         description: Submission details
 *       404:
 *         description: Submission not found
 *       403:
 *         description: Access denied
 */
router.get('/:id', authenticate, SubmissionController.getSubmission);

/**
 * @swagger
 * /submissions/{id}/status:
 *   get:
 *     summary: Get submission status only
 *     tags: [Submissions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Submission status
 *       404:
 *         description: Submission not found
 */
router.get('/:id/status', SubmissionController.getSubmissionStatus);

/**
 * @swagger
 * /submissions/{id}/rejudge:
 *   post:
 *     summary: Rejudge a submission
 *     tags: [Submissions]
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
 *         description: Submission queued for rejudging
 *       404:
 *         description: Submission not found
 *       403:
 *         description: Only admins can rejudge
 */
router.post(
  '/:id/rejudge',
  authenticate,
  authorize(UserRole.ADMIN),
  SubmissionController.rejudgeSubmission
);

export default router;