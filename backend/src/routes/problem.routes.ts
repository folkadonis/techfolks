import { Router } from 'express';
import { ProblemController } from '../controllers/problem.controller';
import { SubmissionController } from '../controllers/submission.controller';
import { authenticate, authorize, optionalAuth } from '../middleware/auth.middleware';
import { problemValidationRules, submissionValidationRules, validate } from '../middleware/validation.middleware';
import { UserRole } from '../types/enums';

const router = Router();

/**
 * @swagger
 * /problems:
 *   get:
 *     summary: Get list of problems
 *     tags: [Problems]
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
 *         name: difficulty
 *         schema:
 *           type: string
 *           enum: [easy, medium, hard]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [created_at, title, difficulty]
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *     responses:
 *       200:
 *         description: List of problems with pagination
 */
router.get('/', optionalAuth, ProblemController.getProblems);

/**
 * @swagger
 * /problems/user:
 *   get:
 *     summary: Get user's problem solving status
 *     tags: [Problems]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [solved, attempted, unsolved]
 *     responses:
 *       200:
 *         description: List of problems with user's solving status
 *       401:
 *         description: Authentication required
 */
router.get('/user', authenticate, ProblemController.getUserProblems);

/**
 * @swagger
 * /problems/{slug}:
 *   get:
 *     summary: Get problem details by slug
 *     tags: [Problems]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Problem details with statistics
 *       404:
 *         description: Problem not found
 *       403:
 *         description: Access denied
 */
router.get('/:slug', optionalAuth, ProblemController.getProblem);

/**
 * @swagger
 * /problems:
 *   post:
 *     summary: Create a new problem
 *     tags: [Problems]
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
 *               - statement
 *               - constraints
 *               - difficulty
 *             properties:
 *               title:
 *                 type: string
 *               statement:
 *                 type: string
 *               input_format:
 *                 type: string
 *               output_format:
 *                 type: string
 *               constraints:
 *                 type: string
 *               difficulty:
 *                 type: string
 *                 enum: [easy, medium, hard]
 *               time_limit:
 *                 type: integer
 *                 default: 1000
 *               memory_limit:
 *                 type: integer
 *                 default: 256
 *               is_public:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: Problem created successfully
 *       403:
 *         description: Insufficient permissions
 */
router.post(
  '/',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.PROBLEM_SETTER),
  problemValidationRules.create,
  validate,
  ProblemController.createProblem
);

/**
 * @swagger
 * /problems/{id}:
 *   put:
 *     summary: Update a problem
 *     tags: [Problems]
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
 *               statement:
 *                 type: string
 *               input_format:
 *                 type: string
 *               output_format:
 *                 type: string
 *               constraints:
 *                 type: string
 *               difficulty:
 *                 type: string
 *                 enum: [easy, medium, hard]
 *               time_limit:
 *                 type: integer
 *               memory_limit:
 *                 type: integer
 *               is_public:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Problem updated successfully
 *       404:
 *         description: Problem not found
 *       403:
 *         description: Insufficient permissions
 */
router.put(
  '/:id',
  authenticate,
  problemValidationRules.update,
  validate,
  ProblemController.updateProblem
);

/**
 * @swagger
 * /problems/{id}:
 *   delete:
 *     summary: Delete a problem
 *     tags: [Problems]
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
 *         description: Problem deleted successfully
 *       404:
 *         description: Problem not found
 *       403:
 *         description: Only admins can delete problems
 */
router.delete(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  ProblemController.deleteProblem
);

/**
 * @swagger
 * /problems/{id}/submit:
 *   post:
 *     summary: Submit solution for a problem
 *     tags: [Problems]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - language
 *             properties:
 *               code:
 *                 type: string
 *               language:
 *                 type: string
 *                 enum: [cpp, python, java, javascript, c, go, rust, csharp]
 *     responses:
 *       201:
 *         description: Submission created successfully
 *       404:
 *         description: Problem not found
 */
router.post(
  '/:id/submit',
  authenticate,
  submissionValidationRules.create,
  validate,
  SubmissionController.submitSolution
);

/**
 * @swagger
 * /problems/{id}/submissions:
 *   get:
 *     summary: Get submissions for a problem
 *     tags: [Problems]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
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
 *         description: List of submissions for the problem
 *       404:
 *         description: Problem not found
 */
router.get(
  '/:id/submissions',
  authenticate,
  SubmissionController.getProblemSubmissions
);

export default router;