import { pgPool, AppDataSource } from '../config/database';
import { logger } from './logger';

export class DatabaseMonitor {
  private static instance: DatabaseMonitor;
  private monitoringInterval?: NodeJS.Timeout;

  static getInstance(): DatabaseMonitor {
    if (!DatabaseMonitor.instance) {
      DatabaseMonitor.instance = new DatabaseMonitor();
    }
    return DatabaseMonitor.instance;
  }

  /**
   * Start monitoring database connection pool
   */
  startMonitoring(intervalMs: number = 30000): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(() => {
      this.logPoolStats();
    }, intervalMs);

    logger.info('Database monitoring started', { intervalMs });
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    logger.info('Database monitoring stopped');
  }

  /**
   * Get current pool statistics
   */
  getPoolStats() {
    const poolStats = {
      total: pgPool.totalCount || 0,
      idle: pgPool.idleCount || 0,
      waiting: pgPool.waitingCount || 0,
      connecting: (pgPool.totalCount || 0) - (pgPool.idleCount || 0) - (pgPool.waitingCount || 0),
    };

    const utilization = poolStats.total > 0 ? 
      ((poolStats.total - poolStats.idle) / poolStats.total) * 100 : 0;

    return {
      ...poolStats,
      utilization: Math.round(utilization * 100) / 100,
      maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '100'),
      healthy: poolStats.total < parseInt(process.env.DB_MAX_CONNECTIONS || '100') * 0.9,
    };
  }

  /**
   * Get TypeORM connection status
   */
  getTypeORMStatus() {
    return {
      isInitialized: AppDataSource.isInitialized,
      isConnected: AppDataSource.isInitialized && !AppDataSource.isDestroyed,
      hasMetadata: AppDataSource.hasMetadata,
      entityMetadatas: AppDataSource.entityMetadatas.length,
    };
  }

  /**
   * Log current pool statistics
   */
  private logPoolStats(): void {
    const stats = this.getPoolStats();
    const typeormStatus = this.getTypeORMStatus();

    // Log warnings for high utilization
    if (stats.utilization > 85) {
      logger.warn('High database connection pool utilization', stats);
    } else if (stats.utilization > 70) {
      logger.warn('Moderate database connection pool utilization', stats);
    }

    // Log waiting connections
    if (stats.waiting > 5) {
      logger.warn('High number of waiting connections', { waiting: stats.waiting });
    }

    // Log stats periodically
    logger.debug('Database pool stats', { 
      pool: stats, 
      typeorm: typeormStatus 
    });
  }

  /**
   * Check database health
   */
  async checkHealth(): Promise<{
    healthy: boolean;
    pool: any;
    typeorm: any;
    connectivity: boolean;
    responseTime?: number;
  }> {
    const startTime = Date.now();
    
    try {
      // Test connectivity with a simple query
      const client = await pgPool.connect();
      await client.query('SELECT 1');
      client.release();
      
      const responseTime = Date.now() - startTime;
      const poolStats = this.getPoolStats();
      const typeormStatus = this.getTypeORMStatus();

      return {
        healthy: poolStats.healthy && typeormStatus.isConnected && responseTime < 1000,
        pool: poolStats,
        typeorm: typeormStatus,
        connectivity: true,
        responseTime,
      };
    } catch (error) {
      logger.error('Database health check failed', { error: error.message });
      
      return {
        healthy: false,
        pool: this.getPoolStats(),
        typeorm: this.getTypeORMStatus(),
        connectivity: false,
      };
    }
  }

  /**
   * Get slow queries (requires pg_stat_statements extension)
   */
  async getSlowQueries(limit: number = 10): Promise<any[]> {
    try {
      const client = await pgPool.connect();
      const result = await client.query(`
        SELECT 
          query,
          calls,
          total_time,
          mean_time,
          max_time,
          stddev_time,
          rows
        FROM pg_stat_statements 
        ORDER BY mean_time DESC 
        LIMIT $1
      `, [limit]);
      
      client.release();
      return result.rows;
    } catch (error) {
      logger.warn('Could not fetch slow queries (pg_stat_statements may not be enabled)', { 
        error: error.message 
      });
      return [];
    }
  }

  /**
   * Get connection pool metrics for Prometheus
   */
  getMetrics() {
    const stats = this.getPoolStats();
    const typeormStatus = this.getTypeORMStatus();

    return {
      // Pool metrics
      'db_pool_connections_total': stats.total,
      'db_pool_connections_idle': stats.idle,
      'db_pool_connections_waiting': stats.waiting,
      'db_pool_connections_active': stats.connecting,
      'db_pool_utilization_percent': stats.utilization,
      'db_pool_max_connections': stats.maxConnections,
      
      // TypeORM metrics
      'db_typeorm_initialized': typeormStatus.isInitialized ? 1 : 0,
      'db_typeorm_connected': typeormStatus.isConnected ? 1 : 0,
      'db_typeorm_entities': typeormStatus.entityMetadatas,
      
      // Health metric
      'db_healthy': stats.healthy ? 1 : 0,
    };
  }

  /**
   * Emergency connection pool reset
   */
  async emergencyReset(): Promise<void> {
    logger.warn('Performing emergency database connection pool reset');
    
    try {
      // End all connections in the pool
      await pgPool.end();
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Reinitialize TypeORM if needed
      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
        await AppDataSource.initialize();
      }
      
      logger.info('Emergency database reset completed');
    } catch (error) {
      logger.error('Emergency database reset failed', { error: error.message });
      throw error;
    }
  }
}

// Export singleton instance
export const databaseMonitor = DatabaseMonitor.getInstance();