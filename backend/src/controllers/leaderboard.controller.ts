import { Request, Response } from 'express';
import { pgPool } from '../config/database';
import { logger } from '../utils/logger';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    email: string;
    role: string;
  };
}

export const getGlobalLeaderboard = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const timeFrame = req.query.timeFrame as string || 'all-time';
    const category = req.query.category as string || 'rating';
    const search = req.query.search as string || '';
    const offset = (page - 1) * limit;

    let orderBy: string;
    let additionalFields = '';
    let joinClause = '';
    let whereClause = 'WHERE u.is_active = true';
    
    switch (category) {
      case 'problems':
        orderBy = 'us.problems_solved DESC, u.rating DESC';
        break;
      case 'contests':
        orderBy = 'us.contests_participated DESC, u.rating DESC';
        break;
      default:
        orderBy = 'u.rating DESC, us.problems_solved DESC';
    }

    // Add time frame filtering for weekly/monthly
    if (timeFrame === 'weekly') {
      additionalFields += `, 
        COUNT(CASE WHEN s.created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as weekly_submissions,
        COUNT(CASE WHEN s.created_at >= NOW() - INTERVAL '7 days' AND s.verdict = 'accepted' THEN 1 END) as weekly_accepted`;
      joinClause += ' LEFT JOIN submissions s ON u.id = s.user_id';
      if (category === 'problems') {
        orderBy = 'weekly_accepted DESC, us.problems_solved DESC';
      }
    } else if (timeFrame === 'monthly') {
      additionalFields += `, 
        COUNT(CASE WHEN s.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as monthly_submissions,
        COUNT(CASE WHEN s.created_at >= NOW() - INTERVAL '30 days' AND s.verdict = 'accepted' THEN 1 END) as monthly_accepted`;
      joinClause += ' LEFT JOIN submissions s ON u.id = s.user_id';
      if (category === 'problems') {
        orderBy = 'monthly_accepted DESC, us.problems_solved DESC';
      }
    }

    // Add search filtering
    const params: any[] = [limit, offset];
    let paramIndex = 3;

    if (search) {
      whereClause += ` AND (u.username ILIKE $${paramIndex} OR u.full_name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const query = `
      SELECT 
        u.id,
        u.username,
        u.full_name,
        u.avatar_url,
        u.country,
        u.rating,
        u.max_rating,
        u.created_at,
        u.last_login_at as last_active,
        COALESCE(us.problems_solved, 0) as problems_solved,
        COALESCE(us.contests_participated, 0) as contests_participated,
        COALESCE(us.total_submissions, 0) as total_submissions,
        COALESCE(us.accepted_submissions, 0) as accepted_submissions,
        COALESCE(us.streak_days, 0) as streak_days
        ${additionalFields},
        ROW_NUMBER() OVER (ORDER BY ${orderBy}) as rank
      FROM users u
      LEFT JOIN user_statistics us ON u.id = us.user_id
      ${joinClause}
      ${whereClause}
      ${joinClause ? 'GROUP BY u.id, us.problems_solved, us.contests_participated, us.total_submissions, us.accepted_submissions, us.streak_days' : ''}
      ORDER BY ${orderBy}
      LIMIT $1 OFFSET $2
    `;

    const countQuery = `
      SELECT COUNT(DISTINCT u.id) as total
      FROM users u
      LEFT JOIN user_statistics us ON u.id = us.user_id
      ${joinClause}
      ${whereClause}
    `;

    const [leaderboardResult, countResult] = await Promise.all([
      pgPool.query(query, params),
      pgPool.query(countQuery, search ? [`%${search}%`] : [])
    ]);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    // Add badge/rank information based on rating
    const usersWithBadges = leaderboardResult.rows.map(user => ({
      ...user,
      badge: getRatingBadge(user.rating),
      achievements: generateAchievements(user)
    }));

    res.json({
      users: usersWithBadges,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      metadata: {
        timeFrame,
        category,
        search: search || null
      }
    });
  } catch (error) {
    logger.error('Error fetching global leaderboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getWeeklyLeaderboard = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = (page - 1) * limit;

    const query = `
      SELECT 
        u.id,
        u.username,
        u.full_name,
        u.avatar_url,
        u.country,
        u.rating,
        COUNT(CASE WHEN s.created_at >= NOW() - INTERVAL '7 days' AND s.verdict = 'accepted' THEN 1 END) as weekly_solved,
        COUNT(CASE WHEN s.created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as weekly_submissions,
        ROW_NUMBER() OVER (ORDER BY COUNT(CASE WHEN s.created_at >= NOW() - INTERVAL '7 days' AND s.verdict = 'accepted' THEN 1 END) DESC) as rank
      FROM users u
      LEFT JOIN submissions s ON u.id = s.user_id
      WHERE u.is_active = true
      GROUP BY u.id, u.username, u.full_name, u.avatar_url, u.country, u.rating
      HAVING COUNT(CASE WHEN s.created_at >= NOW() - INTERVAL '7 days' THEN 1 END) > 0
      ORDER BY weekly_solved DESC, u.rating DESC
      LIMIT $1 OFFSET $2
    `;

    const countQuery = `
      SELECT COUNT(DISTINCT u.id) as total
      FROM users u
      LEFT JOIN submissions s ON u.id = s.user_id
      WHERE u.is_active = true
      GROUP BY u.id
      HAVING COUNT(CASE WHEN s.created_at >= NOW() - INTERVAL '7 days' THEN 1 END) > 0
    `;

    const [leaderboardResult, countResult] = await Promise.all([
      pgPool.query(query, [limit, offset]),
      pgPool.query(countQuery)
    ]);

    const total = countResult.rows.length;
    const totalPages = Math.ceil(total / limit);

    res.json({
      users: leaderboardResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      metadata: {
        timeFrame: 'weekly',
        description: 'Users ranked by problems solved this week'
      }
    });
  } catch (error) {
    logger.error('Error fetching weekly leaderboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMonthlyLeaderboard = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = (page - 1) * limit;

    const query = `
      SELECT 
        u.id,
        u.username,
        u.full_name,
        u.avatar_url,
        u.country,
        u.rating,
        COUNT(CASE WHEN s.created_at >= NOW() - INTERVAL '30 days' AND s.verdict = 'accepted' THEN 1 END) as monthly_solved,
        COUNT(CASE WHEN s.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as monthly_submissions,
        ROW_NUMBER() OVER (ORDER BY COUNT(CASE WHEN s.created_at >= NOW() - INTERVAL '30 days' AND s.verdict = 'accepted' THEN 1 END) DESC) as rank
      FROM users u
      LEFT JOIN submissions s ON u.id = s.user_id
      WHERE u.is_active = true
      GROUP BY u.id, u.username, u.full_name, u.avatar_url, u.country, u.rating
      HAVING COUNT(CASE WHEN s.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) > 0
      ORDER BY monthly_solved DESC, u.rating DESC
      LIMIT $1 OFFSET $2
    `;

    const countQuery = `
      SELECT COUNT(DISTINCT u.id) as total
      FROM users u
      LEFT JOIN submissions s ON u.id = s.user_id
      WHERE u.is_active = true
      GROUP BY u.id
      HAVING COUNT(CASE WHEN s.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) > 0
    `;

    const [leaderboardResult, countResult] = await Promise.all([
      pgPool.query(query, [limit, offset]),
      pgPool.query(countQuery)
    ]);

    const total = countResult.rows.length;
    const totalPages = Math.ceil(total / limit);

    res.json({
      users: leaderboardResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      metadata: {
        timeFrame: 'monthly',
        description: 'Users ranked by problems solved this month'
      }
    });
  } catch (error) {
    logger.error('Error fetching monthly leaderboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUserPosition = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;

    const query = `
      WITH ranked_users AS (
        SELECT 
          u.id,
          u.username,
          u.rating,
          COALESCE(us.problems_solved, 0) as problems_solved,
          COALESCE(us.contests_participated, 0) as contests_participated,
          ROW_NUMBER() OVER (ORDER BY u.rating DESC, us.problems_solved DESC) as global_rank
        FROM users u
        LEFT JOIN user_statistics us ON u.id = us.user_id
        WHERE u.is_active = true
      )
      SELECT *
      FROM ranked_users
      WHERE id = $1
    `;

    const result = await pgPool.query(query, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userPosition = result.rows[0];

    // Get users around this user's position
    const contextQuery = `
      WITH ranked_users AS (
        SELECT 
          u.id,
          u.username,
          u.full_name,
          u.avatar_url,
          u.rating,
          COALESCE(us.problems_solved, 0) as problems_solved,
          ROW_NUMBER() OVER (ORDER BY u.rating DESC, us.problems_solved DESC) as global_rank
        FROM users u
        LEFT JOIN user_statistics us ON u.id = us.user_id
        WHERE u.is_active = true
      )
      SELECT *
      FROM ranked_users
      WHERE global_rank BETWEEN $1 AND $2
      ORDER BY global_rank
    `;

    const rank = userPosition.global_rank;
    const contextStart = Math.max(1, rank - 5);
    const contextEnd = rank + 5;

    const contextResult = await pgPool.query(contextQuery, [contextStart, contextEnd]);

    res.json({
      user: userPosition,
      context: contextResult.rows,
      metadata: {
        rank: rank,
        contextStart,
        contextEnd
      }
    });
  } catch (error) {
    logger.error('Error fetching user position:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Helper functions
function getRatingBadge(rating: number): string {
  if (rating >= 2400) return 'Grandmaster';
  if (rating >= 2100) return 'Master';
  if (rating >= 1900) return 'Candidate Master';
  if (rating >= 1600) return 'Expert';
  if (rating >= 1400) return 'Specialist';
  return 'Pupil';
}

function generateAchievements(user: any): string[] {
  const achievements: string[] = [];
  
  if (user.problems_solved >= 1000) achievements.push('Problem Master');
  else if (user.problems_solved >= 500) achievements.push('Problem Solver');
  else if (user.problems_solved >= 100) achievements.push('Getting Started');
  
  if (user.contests_participated >= 50) achievements.push('Contest Veteran');
  else if (user.contests_participated >= 10) achievements.push('Contest Regular');
  
  if (user.streak_days >= 30) achievements.push('Consistency King');
  else if (user.streak_days >= 7) achievements.push('Week Warrior');
  
  if (user.rating >= 2400) achievements.push('Elite Coder');
  
  return achievements;
}