import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserRole } from '../types/enums';
import { v4 as uuidv4 } from 'uuid';
import { socketService } from '../services/socketService';

export class TeamController {
  static async createTeam(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { name, description, is_public } = req.body;
      const userId = req.user!.userId;

      // Generate invite code
      const inviteCode = uuidv4().substring(0, 8).toUpperCase();

      // Create team
      const result = await AppDataSource.query(`
        INSERT INTO teams (name, description, is_public, created_by, invite_code)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [name, description, is_public !== false, userId, inviteCode]);

      const team = result[0];

      // Add creator as team leader
      await AppDataSource.query(`
        INSERT INTO team_members (team_id, user_id, role, is_active)
        VALUES ($1, $2, 'leader', true)
      `, [team.id, userId]);

      res.status(201).json({
        success: true,
        message: 'Team created successfully',
        data: team
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateTeam(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { name, description, is_public } = req.body;
      const userId = req.user!.userId;

      // Check if user is team leader
      const memberCheck = await AppDataSource.query(`
        SELECT role FROM team_members
        WHERE team_id = $1 AND user_id = $2 AND is_active = true
      `, [id, userId]);

      if (memberCheck.length === 0 || memberCheck[0].role !== 'leader') {
        return res.status(403).json({
          success: false,
          message: 'Only team leaders can update team information'
        });
      }

      // Update team
      const updated = await AppDataSource.query(`
        UPDATE teams
        SET name = $1, description = $2, is_public = $3, updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING *
      `, [name, description, is_public, id]);

      res.json({
        success: true,
        message: 'Team updated successfully',
        data: updated[0]
      });
    } catch (error) {
      next(error);
    }
  }

  static async getTeam(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Get team info with member count
      const teams = await AppDataSource.query(`
        SELECT 
          t.*,
          COUNT(DISTINCT tm.user_id) as member_count,
          u.username as leader_username,
          u.full_name as leader_name
        FROM teams t
        LEFT JOIN team_members tm ON t.id = tm.team_id AND tm.is_active = true
        LEFT JOIN users u ON t.created_by = u.id
        WHERE t.id = $1
        GROUP BY t.id, u.id
      `, [id]);

      if (teams.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Team not found'
        });
      }

      const team = teams[0];

      // Get team members
      const members = await AppDataSource.query(`
        SELECT 
          tm.*,
          u.username,
          u.full_name,
          u.avatar_url,
          u.rating,
          u.country
        FROM team_members tm
        JOIN users u ON tm.user_id = u.id
        WHERE tm.team_id = $1 AND tm.is_active = true
        ORDER BY 
          CASE tm.role 
            WHEN 'leader' THEN 1
            WHEN 'co-leader' THEN 2
            ELSE 3
          END,
          tm.joined_at
      `, [id]);

      team.members = members;

      // Get team statistics
      const stats = await AppDataSource.query(`
        SELECT 
          COUNT(DISTINCT tc.contest_id) as contests_participated,
          COUNT(DISTINCT CASE WHEN tcs.rank = 1 THEN tc.contest_id END) as contests_won,
          AVG(tcs.rank) as avg_rank,
          MAX(tcs.score) as best_score
        FROM team_contests tc
        LEFT JOIN team_contest_standings tcs ON tc.team_id = tcs.team_id AND tc.contest_id = tcs.contest_id
        WHERE tc.team_id = $1
      `, [id]);

      team.statistics = stats[0];

      res.json({
        success: true,
        data: team
      });
    } catch (error) {
      next(error);
    }
  }

  static async getTeams(req: Request, res: Response, next: NextFunction) {
    try {
      const { 
        search,
        is_public,
        page = 1, 
        limit = 20,
        sort = 'created_at',
        order = 'DESC'
      } = req.query;

      let whereConditions = [];
      let params = [];
      let paramCount = 0;

      if (search) {
        whereConditions.push(`(t.name ILIKE $${++paramCount} OR t.description ILIKE $${paramCount})`);
        params.push(`%${search}%`);
      }

      if (is_public !== undefined) {
        whereConditions.push(`t.is_public = $${++paramCount}`);
        params.push(is_public === 'true');
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM teams t
        ${whereClause}
      `;
      const countResult = await AppDataSource.query(countQuery, params);
      const total = parseInt(countResult[0].total);

      // Get teams
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      const allowedSortFields = ['created_at', 'name', 'member_count'];
      const sortField = allowedSortFields.includes(sort as string) ? sort : 'created_at';
      const sortOrder = order === 'ASC' ? 'ASC' : 'DESC';

      params.push(limitNum, offset);

      const query = `
        SELECT 
          t.*,
          COUNT(DISTINCT tm.user_id) as member_count,
          u.username as leader_username
        FROM teams t
        LEFT JOIN team_members tm ON t.id = tm.team_id AND tm.is_active = true
        LEFT JOIN users u ON t.created_by = u.id
        ${whereClause}
        GROUP BY t.id, u.id
        ORDER BY ${sortField === 'member_count' ? 'member_count' : `t.${sortField}`} ${sortOrder}
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;

      const teams = await AppDataSource.query(query, params);

      res.json({
        success: true,
        data: teams,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async joinTeam(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { invite_code } = req.body;
      const userId = req.user!.userId;

      // Find team by invite code
      const teams = await AppDataSource.query(`
        SELECT id, name, max_members FROM teams WHERE invite_code = $1
      `, [invite_code]);

      if (teams.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Invalid invite code'
        });
      }

      const team = teams[0];

      // Check if user is already a member
      const existingMember = await AppDataSource.query(`
        SELECT id, is_active FROM team_members
        WHERE team_id = $1 AND user_id = $2
      `, [team.id, userId]);

      if (existingMember.length > 0) {
        if (existingMember[0].is_active) {
          return res.status(400).json({
            success: false,
            message: 'You are already a member of this team'
          });
        } else {
          // Reactivate membership
          await AppDataSource.query(`
            UPDATE team_members
            SET is_active = true, joined_at = CURRENT_TIMESTAMP
            WHERE team_id = $1 AND user_id = $2
          `, [team.id, userId]);

          return res.json({
            success: true,
            message: 'Rejoined the team successfully'
          });
        }
      }

      // Check team size limit
      const memberCount = await AppDataSource.query(`
        SELECT COUNT(*) as count FROM team_members
        WHERE team_id = $1 AND is_active = true
      `, [team.id]);

      if (parseInt(memberCount[0].count) >= (team.max_members || 10)) {
        return res.status(400).json({
          success: false,
          message: 'Team has reached maximum capacity'
        });
      }

      // Add user to team
      await AppDataSource.query(`
        INSERT INTO team_members (team_id, user_id, role)
        VALUES ($1, $2, 'member')
      `, [team.id, userId]);

      // Get user info for notification
      const userInfo = await AppDataSource.query(`
        SELECT username, full_name FROM users WHERE id = $1
      `, [userId]);

      // Notify team members
      socketService.emitToTeam(team.id, 'team-member-joined', {
        team_id: team.id,
        team_name: team.name,
        user: userInfo[0]
      });

      res.json({
        success: true,
        message: 'Joined team successfully',
        data: { team_id: team.id, team_name: team.name }
      });
    } catch (error) {
      next(error);
    }
  }

  static async leaveTeam(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      // Check membership
      const membership = await AppDataSource.query(`
        SELECT role FROM team_members
        WHERE team_id = $1 AND user_id = $2 AND is_active = true
      `, [id, userId]);

      if (membership.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'You are not a member of this team'
        });
      }

      // Leaders cannot leave, they must transfer leadership first
      if (membership[0].role === 'leader') {
        const activeMembers = await AppDataSource.query(`
          SELECT COUNT(*) as count FROM team_members
          WHERE team_id = $1 AND is_active = true AND user_id != $2
        `, [id, userId]);

        if (parseInt(activeMembers[0].count) > 0) {
          return res.status(400).json({
            success: false,
            message: 'Team leaders must transfer leadership before leaving'
          });
        }
      }

      // Mark member as inactive
      await AppDataSource.query(`
        UPDATE team_members
        SET is_active = false, left_at = CURRENT_TIMESTAMP
        WHERE team_id = $1 AND user_id = $2
      `, [id, userId]);

      res.json({
        success: true,
        message: 'Left team successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateMemberRole(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id, user_id } = req.params;
      const { role } = req.body;
      const requesterId = req.user!.userId;

      // Check if requester is team leader
      const requesterRole = await AppDataSource.query(`
        SELECT role FROM team_members
        WHERE team_id = $1 AND user_id = $2 AND is_active = true
      `, [id, requesterId]);

      if (requesterRole.length === 0 || requesterRole[0].role !== 'leader') {
        return res.status(403).json({
          success: false,
          message: 'Only team leaders can update member roles'
        });
      }

      // Cannot change own role
      if (user_id === requesterId) {
        return res.status(400).json({
          success: false,
          message: 'You cannot change your own role'
        });
      }

      // Update member role
      await AppDataSource.query(`
        UPDATE team_members
        SET role = $1
        WHERE team_id = $2 AND user_id = $3 AND is_active = true
      `, [role, id, user_id]);

      res.json({
        success: true,
        message: 'Member role updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async registerForContest(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { team_id, contest_id } = req.body;
      const userId = req.user!.userId;

      // Verify user is team member
      const membership = await AppDataSource.query(`
        SELECT role FROM team_members
        WHERE team_id = $1 AND user_id = $2 AND is_active = true
      `, [team_id, userId]);

      if (membership.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'You are not a member of this team'
        });
      }

      // Check if contest allows team participation
      const contests = await AppDataSource.query(`
        SELECT id, title, allow_teams, team_size_min, team_size_max, start_time
        FROM contests
        WHERE id = $1
      `, [contest_id]);

      if (contests.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Contest not found'
        });
      }

      const contest = contests[0];

      if (!contest.allow_teams) {
        return res.status(400).json({
          success: false,
          message: 'This contest does not allow team participation'
        });
      }

      // Check team size
      const teamSize = await AppDataSource.query(`
        SELECT COUNT(*) as count FROM team_members
        WHERE team_id = $1 AND is_active = true
      `, [team_id]);

      const size = parseInt(teamSize[0].count);
      if (contest.team_size_min && size < contest.team_size_min) {
        return res.status(400).json({
          success: false,
          message: `Team must have at least ${contest.team_size_min} members`
        });
      }

      if (contest.team_size_max && size > contest.team_size_max) {
        return res.status(400).json({
          success: false,
          message: `Team cannot have more than ${contest.team_size_max} members`
        });
      }

      // Check if already registered
      const existing = await AppDataSource.query(`
        SELECT id FROM team_contests
        WHERE team_id = $1 AND contest_id = $2
      `, [team_id, contest_id]);

      if (existing.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Team is already registered for this contest'
        });
      }

      // Register team
      await AppDataSource.query(`
        INSERT INTO team_contests (team_id, contest_id, registered_by)
        VALUES ($1, $2, $3)
      `, [team_id, contest_id, userId]);

      // Notify team members
      socketService.emitToTeam(team_id, 'team-contest-registration', {
        contest_id,
        contest_title: contest.title,
        start_time: contest.start_time
      });

      res.status(201).json({
        success: true,
        message: 'Team registered for contest successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async getTeamContests(req: Request, res: Response, next: NextFunction) {
    try {
      const { team_id } = req.params;
      const { status, page = 1, limit = 10 } = req.query;

      let whereConditions = [`tc.team_id = $1`];
      let params: any[] = [team_id];
      let paramCount = 1;

      if (status === 'upcoming') {
        whereConditions.push(`c.start_time > CURRENT_TIMESTAMP`);
      } else if (status === 'ongoing') {
        whereConditions.push(`c.start_time <= CURRENT_TIMESTAMP AND c.end_time > CURRENT_TIMESTAMP`);
      } else if (status === 'past') {
        whereConditions.push(`c.end_time <= CURRENT_TIMESTAMP`);
      }

      const whereClause = whereConditions.join(' AND ');

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM team_contests tc
        JOIN contests c ON tc.contest_id = c.id
        WHERE ${whereClause}
      `;
      const countResult = await AppDataSource.query(countQuery, params);
      const total = parseInt(countResult[0].total);

      // Get contests with standings
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      params.push(limitNum, offset);

      const query = `
        SELECT 
          c.*,
          tc.registration_time,
          tcs.rank,
          tcs.score,
          tcs.problems_solved
        FROM team_contests tc
        JOIN contests c ON tc.contest_id = c.id
        LEFT JOIN team_contest_standings tcs ON tc.team_id = tcs.team_id AND tc.contest_id = tcs.contest_id
        WHERE ${whereClause}
        ORDER BY c.start_time DESC
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;

      const contests = await AppDataSource.query(query, params);

      res.json({
        success: true,
        data: contests,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      });
    } catch (error) {
      next(error);
    }
  }
}