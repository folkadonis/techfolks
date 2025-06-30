import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserRole } from '../types/enums';
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

export class EditorialController {
  static async createEditorial(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { problem_id, content, solution_approach, time_complexity, space_complexity, code_snippets } = req.body;
      const userId = req.user!.userId;

      // Check if user has permission (admin, moderator, or problem author)
      const problems = await AppDataSource.query(`
        SELECT author_id FROM problems WHERE id = $1
      `, [problem_id]);

      if (problems.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Problem not found'
        });
      }

      const problem = problems[0];
      const isAuthor = problem.author_id === userId;
      const isAdminOrMod = req.user!.role === UserRole.ADMIN || req.user!.role === UserRole.MODERATOR;

      if (!isAuthor && !isAdminOrMod) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to create editorials for this problem'
        });
      }

      // Check if editorial already exists
      const existingEditorials = await AppDataSource.query(`
        SELECT id FROM editorials WHERE problem_id = $1
      `, [problem_id]);

      if (existingEditorials.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Editorial already exists for this problem. Use update instead.'
        });
      }

      // Sanitize markdown content
      const sanitizedContent = DOMPurify.sanitize(marked(content) as string);

      // Create editorial
      const result = await AppDataSource.query(`
        INSERT INTO editorials (
          problem_id, 
          author_id, 
          content, 
          solution_approach,
          time_complexity,
          space_complexity,
          code_snippets
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        problem_id,
        userId,
        sanitizedContent,
        solution_approach,
        time_complexity,
        space_complexity,
        JSON.stringify(code_snippets || [])
      ]);

      const editorial = result[0];

      // Get author info
      const authorInfo = await AppDataSource.query(`
        SELECT username, full_name, avatar_url FROM users WHERE id = $1
      `, [userId]);

      editorial.author = authorInfo[0];

      res.status(201).json({
        success: true,
        message: 'Editorial created successfully',
        data: editorial
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateEditorial(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { content, solution_approach, time_complexity, space_complexity, code_snippets } = req.body;
      const userId = req.user!.userId;

      // Get editorial
      const editorials = await AppDataSource.query(`
        SELECT e.*, p.author_id as problem_author_id
        FROM editorials e
        JOIN problems p ON e.problem_id = p.id
        WHERE e.id = $1
      `, [id]);

      if (editorials.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Editorial not found'
        });
      }

      const editorial = editorials[0];
      const isAuthor = editorial.author_id === userId;
      const isProblemAuthor = editorial.problem_author_id === userId;
      const isAdminOrMod = req.user!.role === UserRole.ADMIN || req.user!.role === UserRole.MODERATOR;

      if (!isAuthor && !isProblemAuthor && !isAdminOrMod) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to update this editorial'
        });
      }

      // Sanitize markdown content
      const sanitizedContent = DOMPurify.sanitize(marked(content) as string);

      // Update editorial
      const updated = await AppDataSource.query(`
        UPDATE editorials
        SET 
          content = $1,
          solution_approach = $2,
          time_complexity = $3,
          space_complexity = $4,
          code_snippets = $5,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $6
        RETURNING *
      `, [
        sanitizedContent,
        solution_approach,
        time_complexity,
        space_complexity,
        JSON.stringify(code_snippets || []),
        id
      ]);

      res.json({
        success: true,
        message: 'Editorial updated successfully',
        data: updated[0]
      });
    } catch (error) {
      next(error);
    }
  }

  static async getEditorial(req: Request, res: Response, next: NextFunction) {
    try {
      const { problem_id } = req.params;

      const editorials = await AppDataSource.query(`
        SELECT 
          e.*,
          u.username,
          u.full_name,
          u.avatar_url,
          p.title as problem_title,
          p.slug as problem_slug
        FROM editorials e
        JOIN users u ON e.author_id = u.id
        JOIN problems p ON e.problem_id = p.id
        WHERE e.problem_id = $1
      `, [problem_id]);

      if (editorials.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Editorial not found for this problem'
        });
      }

      const editorial = editorials[0];
      editorial.code_snippets = JSON.parse(editorial.code_snippets || '[]');

      // Get related solutions count
      const solutionCount = await AppDataSource.query(`
        SELECT COUNT(*) as count
        FROM editorial_solutions
        WHERE editorial_id = $1 AND is_approved = true
      `, [editorial.id]);

      editorial.solution_count = parseInt(solutionCount[0].count);

      res.json({
        success: true,
        data: editorial
      });
    } catch (error) {
      next(error);
    }
  }

  static async submitSolution(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { editorial_id, language, code, explanation } = req.body;
      const userId = req.user!.userId;

      // Check if editorial exists
      const editorials = await AppDataSource.query(`
        SELECT id FROM editorials WHERE id = $1
      `, [editorial_id]);

      if (editorials.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Editorial not found'
        });
      }

      // Check if user already submitted a solution
      const existingSolutions = await AppDataSource.query(`
        SELECT id FROM editorial_solutions
        WHERE editorial_id = $1 AND user_id = $2
      `, [editorial_id, userId]);

      if (existingSolutions.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'You have already submitted a solution for this editorial'
        });
      }

      // Create solution
      const result = await AppDataSource.query(`
        INSERT INTO editorial_solutions (editorial_id, user_id, language, code, explanation)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [editorial_id, userId, language, code, explanation]);

      res.status(201).json({
        success: true,
        message: 'Solution submitted successfully. It will be visible after approval.',
        data: result[0]
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSolutions(req: Request, res: Response, next: NextFunction) {
    try {
      const { editorial_id } = req.params;
      const { page = 1, limit = 10, language } = req.query;

      let whereConditions = ['es.editorial_id = $1', 'es.is_approved = true'];
      let params: any[] = [editorial_id];
      let paramCount = 1;

      if (language) {
        whereConditions.push(`es.language = $${++paramCount}`);
        params.push(language);
      }

      const whereClause = whereConditions.join(' AND ');

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM editorial_solutions es
        WHERE ${whereClause}
      `;
      const countResult = await AppDataSource.query(countQuery, params);
      const total = parseInt(countResult[0].total);

      // Get solutions with user info
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      params.push(limitNum, offset);

      const query = `
        SELECT 
          es.*,
          u.username,
          u.full_name,
          u.avatar_url,
          u.rating,
          COALESCE(SUM(CASE WHEN esv.vote = 1 THEN 1 ELSE 0 END), 0) as upvotes,
          COALESCE(SUM(CASE WHEN esv.vote = -1 THEN 1 ELSE 0 END), 0) as downvotes
        FROM editorial_solutions es
        INNER JOIN users u ON es.user_id = u.id
        LEFT JOIN editorial_solution_votes esv ON es.id = esv.solution_id
        WHERE ${whereClause}
        GROUP BY es.id, u.id
        ORDER BY upvotes DESC, es.created_at DESC
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;

      const solutions = await AppDataSource.query(query, params);

      // Get current user's votes if authenticated
      const userId = (req as AuthRequest).user?.userId;
      if (userId && solutions.length > 0) {
        const solutionIds = solutions.map((s: any) => s.id);
        const userVotes = await AppDataSource.query(`
          SELECT solution_id, vote
          FROM editorial_solution_votes
          WHERE user_id = $1 AND solution_id = ANY($2)
        `, [userId, solutionIds]);

        const voteMap = userVotes.reduce((acc: any, v: any) => {
          acc[v.solution_id] = v.vote;
          return acc;
        }, {});

        solutions.forEach((s: any) => {
          s.user_vote = voteMap[s.id] || 0;
        });
      }

      res.json({
        success: true,
        data: solutions,
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

  static async voteSolution(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { vote } = req.body;
      const userId = req.user!.userId;

      // Validate vote value
      if (![-1, 0, 1].includes(vote)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid vote value'
        });
      }

      // Check if solution exists
      const solutions = await AppDataSource.query(`
        SELECT id FROM editorial_solutions WHERE id = $1
      `, [id]);

      if (solutions.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Solution not found'
        });
      }

      if (vote === 0) {
        // Remove vote
        await AppDataSource.query(`
          DELETE FROM editorial_solution_votes
          WHERE user_id = $1 AND solution_id = $2
        `, [userId, id]);
      } else {
        // Insert or update vote
        await AppDataSource.query(`
          INSERT INTO editorial_solution_votes (user_id, solution_id, vote)
          VALUES ($1, $2, $3)
          ON CONFLICT (user_id, solution_id)
          DO UPDATE SET vote = $3
        `, [userId, id, vote]);
      }

      // Get updated vote counts
      const voteCounts = await AppDataSource.query(`
        SELECT 
          COALESCE(SUM(CASE WHEN vote = 1 THEN 1 ELSE 0 END), 0) as upvotes,
          COALESCE(SUM(CASE WHEN vote = -1 THEN 1 ELSE 0 END), 0) as downvotes
        FROM editorial_solution_votes
        WHERE solution_id = $1
      `, [id]);

      res.json({
        success: true,
        message: 'Vote recorded successfully',
        data: {
          upvotes: parseInt(voteCounts[0].upvotes),
          downvotes: parseInt(voteCounts[0].downvotes),
          user_vote: vote
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async approveSolution(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { approved } = req.body;

      // Only admins and moderators can approve solutions
      if (req.user!.role !== UserRole.ADMIN && req.user!.role !== UserRole.MODERATOR) {
        return res.status(403).json({
          success: false,
          message: 'Only admins and moderators can approve solutions'
        });
      }

      await AppDataSource.query(`
        UPDATE editorial_solutions
        SET is_approved = $1, approved_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [approved, id]);

      res.json({
        success: true,
        message: approved ? 'Solution approved' : 'Solution rejected'
      });
    } catch (error) {
      next(error);
    }
  }
}