import { Request, Response } from 'express';
import { pgPool } from '../config/database';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    email: string;
    role: string;
  };
}

// Helper function to generate invite code
const generateInviteCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Helper function to check if user is group owner
const isGroupOwner = async (groupId: string, userId: string): Promise<boolean> => {
  const result = await pgPool.query(
    'SELECT owner_id FROM groups WHERE id = $1',
    [groupId]
  );
  return result.rows.length > 0 && result.rows[0].owner_id === userId;
};

// Helper function to check if user is group manager or owner
const isGroupManagerOrOwner = async (groupId: string, userId: string): Promise<boolean> => {
  const result = await pgPool.query(`
    SELECT g.owner_id, gm.role 
    FROM groups g
    LEFT JOIN group_members gm ON g.id = gm.group_id AND gm.user_id = $2
    WHERE g.id = $1
  `, [groupId, userId]);
  
  if (result.rows.length === 0) return false;
  
  const row = result.rows[0];
  return row.owner_id === userId || row.role === 'manager';
};

export const getGroups = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const search = req.query.search as string || '';
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE is_private = false';
    const params: any[] = [limit, offset];
    let paramIndex = 3;

    if (search) {
      whereClause += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const query = `
      SELECT 
        g.*,
        u.username as owner_name,
        COUNT(gm.user_id) as member_count,
        COUNT(DISTINCT gc.contest_id) as contest_count
      FROM groups g
      LEFT JOIN users u ON g.owner_id = u.id
      LEFT JOIN group_members gm ON g.id = gm.group_id
      LEFT JOIN group_contests gc ON g.id = gc.group_id
      ${whereClause}
      GROUP BY g.id, u.username
      ORDER BY g.created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM groups g
      ${whereClause.replace('LIMIT $1 OFFSET $2', '')}
    `;

    const [groupsResult, countResult] = await Promise.all([
      pgPool.query(query, params),
      pgPool.query(countQuery, search ? [`%${search}%`] : [])
    ]);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      groups: groupsResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    logger.error('Error fetching groups:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUserGroups = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const query = `
      SELECT 
        g.*,
        u.username as owner_name,
        COUNT(gm2.user_id) as member_count,
        COUNT(DISTINCT gc.contest_id) as contest_count,
        CASE 
          WHEN g.owner_id = $1 THEN 'owner'
          WHEN gm.role = 'manager' THEN 'manager'
          ELSE 'member'
        END as user_role,
        g.owner_id = $1 as is_owner,
        gm.role = 'manager' as is_manager,
        true as is_member
      FROM groups g
      LEFT JOIN users u ON g.owner_id = u.id
      LEFT JOIN group_members gm ON g.id = gm.group_id AND gm.user_id = $1
      LEFT JOIN group_members gm2 ON g.id = gm2.group_id
      LEFT JOIN group_contests gc ON g.id = gc.group_id
      WHERE g.owner_id = $1 OR gm.user_id = $1
      GROUP BY g.id, u.username, gm.role
      ORDER BY g.created_at DESC
    `;

    const result = await pgPool.query(query, [userId]);

    res.json({ groups: result.rows });
  } catch (error) {
    logger.error('Error fetching user groups:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getGroupById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const groupId = req.params.id;
    const userId = req.user?.id;

    const query = `
      SELECT 
        g.*,
        u.username as owner_name,
        COUNT(gm.user_id) as member_count,
        COUNT(DISTINCT gc.contest_id) as contest_count,
        CASE 
          WHEN g.owner_id = $2 THEN 'owner'
          WHEN gm2.role = 'manager' THEN 'manager'
          ELSE 'member'
        END as user_role,
        g.owner_id = $2 as is_owner,
        gm2.role = 'manager' as is_manager,
        gm2.user_id IS NOT NULL as is_member
      FROM groups g
      LEFT JOIN users u ON g.owner_id = u.id
      LEFT JOIN group_members gm ON g.id = gm.group_id
      LEFT JOIN group_members gm2 ON g.id = gm2.group_id AND gm2.user_id = $2
      LEFT JOIN group_contests gc ON g.id = gc.group_id
      WHERE g.id = $1
      GROUP BY g.id, u.username, gm2.role
    `;

    const result = await pgPool.query(query, [groupId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const group = result.rows[0];

    // Check if user can access private group
    if (group.is_private && !group.is_member && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied to private group' });
    }

    res.json({ group });
  } catch (error) {
    logger.error('Error fetching group:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createGroup = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, description, is_private = false } = req.body;
    const userId = req.user!.id;
    const groupId = uuidv4();
    const inviteCode = generateInviteCode();

    const client = await pgPool.connect();
    
    try {
      await client.query('BEGIN');

      // Create group
      const groupQuery = `
        INSERT INTO groups (id, name, description, invite_code, is_private, owner_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      
      const groupResult = await client.query(groupQuery, [
        groupId, name, description, inviteCode, is_private, userId
      ]);

      // Add owner as member
      await client.query(
        'INSERT INTO group_members (group_id, user_id, role, joined_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)',
        [groupId, userId, 'owner']
      );

      await client.query('COMMIT');

      res.status(201).json({ 
        message: 'Group created successfully',
        group: {
          ...groupResult.rows[0],
          is_owner: true,
          is_manager: false,
          is_member: true,
          user_role: 'owner',
          member_count: 1,
          contest_count: 0
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error creating group:', error);
    if ((error as any).code === '23505') {
      res.status(400).json({ error: 'Group name already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

export const updateGroup = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const groupId = req.params.id;
    const userId = req.user!.id;
    const { name, description, is_private } = req.body;

    // Check if user is owner
    if (!(await isGroupOwner(groupId, userId))) {
      return res.status(403).json({ error: 'Only group owner can update group' });
    }

    const updates: string[] = [];
    const params: any[] = [groupId];
    let paramIndex = 2;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      params.push(name);
      paramIndex++;
    }

    if (description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      params.push(description);
      paramIndex++;
    }

    if (is_private !== undefined) {
      updates.push(`is_private = $${paramIndex}`);
      params.push(is_private);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    const query = `
      UPDATE groups 
      SET ${updates.join(', ')}
      WHERE id = $1
      RETURNING *
    `;

    const result = await pgPool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    res.json({ 
      message: 'Group updated successfully',
      group: result.rows[0]
    });
  } catch (error) {
    logger.error('Error updating group:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteGroup = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const groupId = req.params.id;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Check if user is owner or admin
    const isOwner = await isGroupOwner(groupId, userId);
    
    if (!isOwner && userRole !== 'admin') {
      return res.status(403).json({ error: 'Only group owner or admin can delete group' });
    }

    const result = await pgPool.query(
      'DELETE FROM groups WHERE id = $1 RETURNING *',
      [groupId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    logger.error('Error deleting group:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const joinGroup = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const inviteCode = req.params.code;
    const userId = req.user!.id;

    // Find group by invite code
    const groupResult = await pgPool.query(
      'SELECT * FROM groups WHERE invite_code = $1',
      [inviteCode]
    );

    if (groupResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid invite code' });
    }

    const group = groupResult.rows[0];

    // Check if already a member
    const memberResult = await pgPool.query(
      'SELECT * FROM group_members WHERE group_id = $1 AND user_id = $2',
      [group.id, userId]
    );

    if (memberResult.rows.length > 0) {
      return res.status(400).json({ error: 'Already a member of this group' });
    }

    // Add as member
    await pgPool.query(
      'INSERT INTO group_members (group_id, user_id, role, joined_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)',
      [group.id, userId, 'member']
    );

    res.json({ 
      message: 'Successfully joined group',
      group: {
        ...group,
        is_owner: false,
        is_manager: false,
        is_member: true,
        user_role: 'member'
      }
    });
  } catch (error) {
    logger.error('Error joining group:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const leaveGroup = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const groupId = req.params.id;
    const userId = req.user!.id;

    // Check if user is owner
    const isOwner = await isGroupOwner(groupId, userId);
    
    if (isOwner) {
      return res.status(400).json({ error: 'Group owner cannot leave group. Transfer ownership or delete group.' });
    }

    const result = await pgPool.query(
      'DELETE FROM group_members WHERE group_id = $1 AND user_id = $2 RETURNING *',
      [groupId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Not a member of this group' });
    }

    res.json({ message: 'Successfully left group' });
  } catch (error) {
    logger.error('Error leaving group:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getGroupMembers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const groupId = req.params.id;
    const userId = req.user!.id;

    // Check if user is member of the group
    const memberCheck = await pgPool.query(
      'SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId]
    );

    const isOwner = await isGroupOwner(groupId, userId);
    
    if (memberCheck.rows.length === 0 && !isOwner && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const query = `
      SELECT 
        u.id,
        u.username,
        u.full_name,
        u.avatar_url,
        u.rating,
        u.country,
        gm.role,
        gm.joined_at,
        us.problems_solved,
        us.contests_participated
      FROM group_members gm
      JOIN users u ON gm.user_id = u.id
      LEFT JOIN user_statistics us ON u.id = us.user_id
      WHERE gm.group_id = $1
      ORDER BY 
        CASE gm.role 
          WHEN 'owner' THEN 1 
          WHEN 'manager' THEN 2 
          ELSE 3 
        END,
        gm.joined_at ASC
    `;

    const result = await pgPool.query(query, [groupId]);

    res.json({ members: result.rows });
  } catch (error) {
    logger.error('Error fetching group members:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const removeMember = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const groupId = req.params.id;
    const targetUserId = req.params.userId;
    const userId = req.user!.id;

    // Check if user has permission to remove members
    const canManage = await isGroupManagerOrOwner(groupId, userId);
    
    if (!canManage && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Cannot remove group owner
    const isTargetOwner = await isGroupOwner(groupId, targetUserId);
    if (isTargetOwner) {
      return res.status(400).json({ error: 'Cannot remove group owner' });
    }

    const result = await pgPool.query(
      'DELETE FROM group_members WHERE group_id = $1 AND user_id = $2 RETURNING *',
      [groupId, targetUserId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    logger.error('Error removing member:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const promoteMember = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const groupId = req.params.id;
    const targetUserId = req.params.userId;
    const userId = req.user!.id;

    // Only owner can promote
    const isOwner = await isGroupOwner(groupId, userId);
    
    if (!isOwner) {
      return res.status(403).json({ error: 'Only group owner can promote members' });
    }

    const result = await pgPool.query(
      'UPDATE group_members SET role = $1 WHERE group_id = $2 AND user_id = $3 AND role = $4 RETURNING *',
      ['manager', groupId, targetUserId, 'member']
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found or already a manager' });
    }

    res.json({ message: 'Member promoted to manager successfully' });
  } catch (error) {
    logger.error('Error promoting member:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const demoteMember = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const groupId = req.params.id;
    const targetUserId = req.params.userId;
    const userId = req.user!.id;

    // Only owner can demote
    const isOwner = await isGroupOwner(groupId, userId);
    
    if (!isOwner) {
      return res.status(403).json({ error: 'Only group owner can demote managers' });
    }

    const result = await pgPool.query(
      'UPDATE group_members SET role = $1 WHERE group_id = $2 AND user_id = $3 AND role = $4 RETURNING *',
      ['member', groupId, targetUserId, 'manager']
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Manager not found' });
    }

    res.json({ message: 'Manager demoted to member successfully' });
  } catch (error) {
    logger.error('Error demoting member:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};