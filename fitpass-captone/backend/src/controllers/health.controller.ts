import { Request, Response } from 'express';
import { NetworkUtils } from '../utils/network.util';

export const healthCheck = async (req: Request, res: Response) => {
  try {
    const environment = process.env.NODE_ENV || 'development';
    const timestamp = new Date().toISOString();
    const uptime = process.uptime();
    
    // Network info
    const localIP = NetworkUtils.getLocalIPAddress();
    const requestIP = NetworkUtils.getRequestIP(req);
    
    // Database connectivity check (add your database ping here)
    let databaseStatus = 'connected';
    try {
      // TODO: Add actual database ping
      // await prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      databaseStatus = 'disconnected';
    }
    
    res.json({
      status: 'healthy',
      environment,
      timestamp,
      uptime: Math.floor(uptime),
      network: {
        localIP,
        requestIP,
        expoURL: NetworkUtils.getExpoURL('/health-check'),
      },
      services: {
        database: databaseStatus,
        paypal: process.env.PAYPAL_CLIENT_ID ? 'configured' : 'not_configured',
        email: process.env.MAILTRAP_USER ? 'configured' : 'not_configured',
      },
      version: process.env.npm_package_version || '1.0.0'
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};