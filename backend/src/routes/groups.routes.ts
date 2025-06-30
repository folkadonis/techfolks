import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authMiddleware } from '../middleware/auth.middleware';
import { validationMiddleware } from '../middleware/validation.middleware';
import * as groupsController from '../controllers/groups.controller';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Group:
 *       type: object
 *       required:
 *         - name
 *         - description
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *           minLength: 3
 *           maxLength: 100
 *         description:
 *           type: string
 *           maxLength: 500
 *         invite_code:
 *           type: string
 *         is_private:
 *           type: boolean
 *         owner_id:
 *           type: string
 *           format: uuid
 *         member_count:
 *           type: integer
 *         contest_count:
 *           type: integer
 *         created_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/groups:
 *   get:
 *     summary: Get all public groups
 *     tags: [Groups]
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
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of groups
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 groups:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Group'
 *                 pagination:
 *                   type: object
 */
router.get('/', 
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().isString().trim(),
  validationMiddleware,
  groupsController.getGroups
);

/**
 * @swagger
 * /api/groups/my:
 *   get:
 *     summary: Get user's groups
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's groups
 */
router.get('/my', authMiddleware, groupsController.getUserGroups);

/**
 * @swagger
 * /api/groups/{id}:
 *   get:
 *     summary: Get group by ID
 *     tags: [Groups]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Group details
 *       404:
 *         description: Group not found
 */
router.get('/:id',
  param('id').isUUID(),
  validationMiddleware,
  groupsController.getGroupById
);

/**
 * @swagger
 * /api/groups:
 *   post:
 *     summary: Create a new group
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               is_private:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: Group created successfully
 *       400:
 *         description: Validation error
 */
router.post('/',
  authMiddleware,
  body('name')
    .isString()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Name must be between 3 and 100 characters'),
  body('description')
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  body('is_private')
    .optional()
    .isBoolean()
    .withMessage('is_private must be a boolean'),
  validationMiddleware,
  groupsController.createGroup
);

/**
 * @swagger
 * /api/groups/{id}:
 *   put:
 *     summary: Update group (owner only)
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               is_private:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Group updated successfully
 *       403:
 *         description: Only group owner can update
 *       404:
 *         description: Group not found
 */
router.put('/:id',
  authMiddleware,
  param('id').isUUID(),
  body('name')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 3, max: 100 }),
  body('description')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 }),
  body('is_private')
    .optional()
    .isBoolean(),
  validationMiddleware,
  groupsController.updateGroup
);

/**
 * @swagger
 * /api/groups/{id}:
 *   delete:
 *     summary: Delete group (owner or admin only)
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Group deleted successfully
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Group not found
 */
router.delete('/:id',
  authMiddleware,
  param('id').isUUID(),
  validationMiddleware,
  groupsController.deleteGroup
);

/**
 * @swagger
 * /api/groups/join/{code}:
 *   post:
 *     summary: Join group by invite code
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully joined group
 *       400:
 *         description: Invalid invite code or already a member
 *       404:
 *         description: Group not found
 */
router.post('/join/:code',
  authMiddleware,
  param('code').isString().trim().isLength({ min: 6, max: 10 }),
  validationMiddleware,
  groupsController.joinGroup
);

/**
 * @swagger
 * /api/groups/{id}/leave:
 *   post:
 *     summary: Leave group
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Successfully left group
 *       400:
 *         description: Cannot leave group (e.g., owner)
 *       404:
 *         description: Group not found
 */
router.post('/:id/leave',
  authMiddleware,
  param('id').isUUID(),
  validationMiddleware,
  groupsController.leaveGroup
);

/**
 * @swagger
 * /api/groups/{id}/members:
 *   get:
 *     summary: Get group members
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of group members
 *       403:
 *         description: Not a group member
 *       404:
 *         description: Group not found
 */
router.get('/:id/members',
  authMiddleware,
  param('id').isUUID(),
  validationMiddleware,
  groupsController.getGroupMembers
);

/**
 * @swagger
 * /api/groups/{id}/members/{userId}:
 *   delete:
 *     summary: Remove member from group (owner/manager only)
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Member removed successfully
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Group or member not found
 */
router.delete('/:id/members/:userId',
  authMiddleware,
  param('id').isUUID(),
  param('userId').isUUID(),
  validationMiddleware,
  groupsController.removeMember
);

/**
 * @swagger
 * /api/groups/{id}/members/{userId}/promote:
 *   post:
 *     summary: Promote member to manager (owner only)
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Member promoted successfully
 *       403:
 *         description: Only group owner can promote
 *       404:
 *         description: Group or member not found
 */
router.post('/:id/members/:userId/promote',
  authMiddleware,
  param('id').isUUID(),
  param('userId').isUUID(),
  validationMiddleware,
  groupsController.promoteMember
);

/**
 * @swagger
 * /api/groups/{id}/members/{userId}/demote:
 *   post:
 *     summary: Demote manager to member (owner only)
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Manager demoted successfully
 *       403:
 *         description: Only group owner can demote
 *       404:
 *         description: Group or member not found
 */
router.post('/:id/members/:userId/demote',
  authMiddleware,
  param('id').isUUID(),
  param('userId').isUUID(),
  validationMiddleware,
  groupsController.demoteMember
);

export default router;