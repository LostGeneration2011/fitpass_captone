import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
) {
  console.error('Error:', err);

  // Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        return res.status(409).json({
          error: 'Duplicate value',
          message: 'A record with this value already exists',
          field: err.meta?.target
        });
      case 'P2025':
        return res.status(404).json({
          error: 'Not found',
          message: 'The requested record was not found'
        });
      case 'P2003':
        return res.status(400).json({
          error: 'Foreign key constraint failed',
          message: 'Referenced record does not exist'
        });
      case 'P2014':
        return res.status(400).json({
          error: 'Invalid relation',
          message: 'The change would violate a required relation'
        });
      default:
        return res.status(400).json({
          error: 'Database error',
          message: err.message
        });
    }
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      message: err.message,
      details: err.errors
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token',
      message: 'The provided token is invalid'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired',
      message: 'The provided token has expired'
    });
  }

  // Permission errors
  if (err.status === 403) {
    return res.status(403).json({
      error: 'Permission denied',
      message: 'You do not have permission to perform this action'
    });
  }

  // Not found errors
  if (err.status === 404) {
    return res.status(404).json({
      error: 'Not found',
      message: err.message || 'The requested resource was not found'
    });
  }

  // Default server error
  const status = err.status || 500;
  const message = err.message || 'Internal server error';

  return res.status(status).json({
    error: 'Server error',
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}
