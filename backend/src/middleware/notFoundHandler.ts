import { Request, Response, NextFunction } from 'express';

export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  res.status(404).json({
    success: false,
    message: 'Resource not found',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
};