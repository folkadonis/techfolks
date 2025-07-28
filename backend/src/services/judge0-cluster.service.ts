import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';
import { ExternalServiceError, NetworkError } from '../utils/errors';
import { ProgrammingLanguage } from '../types/enums';

export interface Judge0Instance {
  id: string;
  url: string;
  authToken?: string;
  isHealthy: boolean;
  lastHealthCheck: Date;
  weight: number;
  currentLoad: number;
}

export interface Judge0ExecutionParams {
  language: string;
  sourceCode: string;
  stdin?: string;
  expectedOutput?: string;
  timeLimit?: number;
  memoryLimit?: number;
}

export interface Judge0Result {
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  status: {
    id: number;
    description: string;
  };
  time: string;
  memory: number;
  token?: string;
}

export interface Judge0ClusterStats {
  totalInstances: number;
  healthyInstances: number;
  totalLoad: number;
  averageResponseTime: number;
  failureRate: number;
}

export class Judge0ClusterService {
  private static instance: Judge0ClusterService;
  private instances: Map<string, Judge0Instance> = new Map();
  private clients: Map<string, AxiosInstance> = new Map();
  private healthCheckInterval?: NodeJS.Timeout;
  private lastHealthCheck: Date = new Date();
  private roundRobinIndex = 0;
  private stats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    totalResponseTime: 0,
  };

  private readonly LANGUAGE_MAP: Record<string, number> = {
    [ProgrammingLanguage.C]: 50,
    [ProgrammingLanguage.CPP]: 54,
    [ProgrammingLanguage.JAVA]: 62,
    [ProgrammingLanguage.PYTHON]: 71,
    [ProgrammingLanguage.JAVASCRIPT]: 63,
    [ProgrammingLanguage.GO]: 60,
    [ProgrammingLanguage.RUST]: 73,
    [ProgrammingLanguage.CSHARP]: 51
  };

  static getInstance(): Judge0ClusterService {
    if (!Judge0ClusterService.instance) {
      Judge0ClusterService.instance = new Judge0ClusterService();
    }
    return Judge0ClusterService.instance;
  }

  /**
   * Initialize the cluster with instance configurations
   */
  async initialize(instanceConfigs: Array<{ url: string; authToken?: string; weight?: number }>): Promise<void> {
    logger.info('Initializing Judge0 cluster', { instanceCount: instanceConfigs.length });

    for (const config of instanceConfigs) {
      const instanceId = this.generateInstanceId(config.url);
      
      const instance: Judge0Instance = {
        id: instanceId,
        url: config.url,
        authToken: config.authToken,
        isHealthy: false,
        lastHealthCheck: new Date(),
        weight: config.weight || 1,
        currentLoad: 0,
      };

      const client = axios.create({
        baseURL: config.url,
        timeout: 30000, // 30 seconds
        headers: {
          'Content-Type': 'application/json',
          ...(config.authToken && { 'Authorization': `Bearer ${config.authToken}` }),
        },
      });

      this.instances.set(instanceId, instance);
      this.clients.set(instanceId, client);
    }

    // Perform initial health check
    await this.performHealthCheck();

    // Start periodic health checks
    this.startHealthChecks();

    logger.info('Judge0 cluster initialized', { 
      totalInstances: this.instances.size,
      healthyInstances: this.getHealthyInstances().length
    });
  }

  /**
   * Execute code on the best available instance
   */
  async executeCode(params: Judge0ExecutionParams): Promise<Judge0Result> {
    const startTime = Date.now();
    this.stats.totalRequests++;

    try {
      const instance = await this.selectInstance();
      const client = this.clients.get(instance.id);
      
      if (!client) {
        throw new ExternalServiceError('Judge0', 'No client found for selected instance');
      }

      // Increment instance load
      instance.currentLoad++;

      try {
        const result = await this.executeOnInstance(client, params);
        
        // Record success
        this.stats.successfulRequests++;
        this.stats.totalResponseTime += Date.now() - startTime;
        
        return result;
      } finally {
        // Decrement instance load
        instance.currentLoad = Math.max(0, instance.currentLoad - 1);
      }
    } catch (error) {
      this.stats.failedRequests++;
      
      if (error instanceof ExternalServiceError || error instanceof NetworkError) {
        throw error;
      }
      
      throw new ExternalServiceError('Judge0', error.message);
    }
  }

  /**
   * Execute code on a specific instance
   */
  private async executeOnInstance(client: AxiosInstance, params: Judge0ExecutionParams): Promise<Judge0Result> {
    const languageId = this.LANGUAGE_MAP[params.language];
    if (!languageId) {
      throw new ExternalServiceError('Judge0', `Unsupported language: ${params.language}`);
    }

    const submission = {
      language_id: languageId,
      source_code: Buffer.from(params.sourceCode).toString('base64'),
      stdin: params.stdin ? Buffer.from(params.stdin).toString('base64') : undefined,
      expected_output: params.expectedOutput ? Buffer.from(params.expectedOutput).toString('base64') : undefined,
      cpu_time_limit: params.timeLimit || 2.0,
      memory_limit: (params.memoryLimit || 256) * 1024, // Convert MB to KB
      enable_per_process_and_thread_time_limit: true,
      enable_per_process_and_thread_memory_limit: true
    };

    // Submit code for execution
    const submitResponse = await client.post('/submissions?base64_encoded=true&wait=false', submission);
    const token = submitResponse.data.token;

    // Poll for results
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds timeout
    let result: Judge0Result;

    while (attempts < maxAttempts) {
      const statusResponse = await client.get(`/submissions/${token}?base64_encoded=true`);
      result = statusResponse.data;

      // Check if execution is complete
      if (result.status.id > 2) {
        // Decode base64 outputs
        result.stdout = result.stdout ? Buffer.from(result.stdout, 'base64').toString() : null;
        result.stderr = result.stderr ? Buffer.from(result.stderr, 'base64').toString() : null;
        result.compile_output = result.compile_output ? Buffer.from(result.compile_output, 'base64').toString() : null;
        result.token = token;
        
        return result;
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    throw new ExternalServiceError('Judge0', 'Execution timeout');
  }

  /**
   * Select the best available instance
   */
  private async selectInstance(): Promise<Judge0Instance> {
    const healthyInstances = this.getHealthyInstances();
    
    if (healthyInstances.length === 0) {
      // Try to perform emergency health check
      await this.performHealthCheck();
      
      const retryHealthy = this.getHealthyInstances();
      if (retryHealthy.length === 0) {
        throw new ExternalServiceError('Judge0', 'No healthy instances available');
      }
      
      return this.selectByLoadBalancing(retryHealthy);
    }

    return this.selectByLoadBalancing(healthyInstances);
  }

  /**
   * Select instance using weighted round-robin with load balancing
   */
  private selectByLoadBalancing(instances: Judge0Instance[]): Judge0Instance {
    // Sort by current load and weight
    const sorted = instances.sort((a, b) => {
      const loadRatioA = a.currentLoad / a.weight;
      const loadRatioB = b.currentLoad / b.weight;
      return loadRatioA - loadRatioB;
    });

    // Use round-robin for instances with same load ratio
    const selected = sorted[this.roundRobinIndex % sorted.length];
    this.roundRobinIndex = (this.roundRobinIndex + 1) % sorted.length;

    return selected;
  }

  /**
   * Get healthy instances
   */
  private getHealthyInstances(): Judge0Instance[] {
    return Array.from(this.instances.values()).filter(instance => instance.isHealthy);
  }

  /**
   * Perform health check on all instances
   */
  private async performHealthCheck(): Promise<void> {
    const healthCheckPromises = Array.from(this.instances.entries()).map(async ([id, instance]) => {
      try {
        const client = this.clients.get(id);
        if (!client) return;

        const response = await client.get('/system_info', { timeout: 5000 });
        
        if (response.status === 200) {
          instance.isHealthy = true;
          instance.lastHealthCheck = new Date();
        } else {
          instance.isHealthy = false;
        }
      } catch (error) {
        instance.isHealthy = false;
        logger.warn('Judge0 instance health check failed', { 
          instanceId: id, 
          url: instance.url, 
          error: error.message 
        });
      }
    });

    await Promise.allSettled(healthCheckPromises);
    this.lastHealthCheck = new Date();

    const healthyCount = this.getHealthyInstances().length;
    const totalCount = this.instances.size;

    logger.info('Health check completed', { 
      healthy: healthyCount, 
      total: totalCount,
      healthyPercentage: Math.round((healthyCount / totalCount) * 100)
    });

    // Alert if too many instances are unhealthy
    if (healthyCount < totalCount * 0.5) {
      logger.error('More than 50% of Judge0 instances are unhealthy', {
        healthy: healthyCount,
        total: totalCount
      });
    }
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    const interval = parseInt(process.env.JUDGE0_HEALTH_CHECK_INTERVAL || '30000'); // 30 seconds
    
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, interval);

    logger.info('Judge0 health checks started', { intervalMs: interval });
  }

  /**
   * Stop health checks
   */
  stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
    logger.info('Judge0 health checks stopped');
  }

  /**
   * Get cluster statistics
   */
  getClusterStats(): Judge0ClusterStats {
    const healthyInstances = this.getHealthyInstances();
    const totalLoad = Array.from(this.instances.values())
      .reduce((sum, instance) => sum + instance.currentLoad, 0);

    const averageResponseTime = this.stats.totalRequests > 0 
      ? this.stats.totalResponseTime / this.stats.successfulRequests 
      : 0;

    const failureRate = this.stats.totalRequests > 0 
      ? (this.stats.failedRequests / this.stats.totalRequests) * 100 
      : 0;

    return {
      totalInstances: this.instances.size,
      healthyInstances: healthyInstances.length,
      totalLoad,
      averageResponseTime: Math.round(averageResponseTime),
      failureRate: Math.round(failureRate * 100) / 100,
    };
  }

  /**
   * Get detailed instance information
   */
  getInstancesInfo(): Array<Judge0Instance & { responseTime?: number }> {
    return Array.from(this.instances.values()).map(instance => ({
      ...instance,
      // Add any additional computed metrics
    }));
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalResponseTime: 0,
    };
  }

  /**
   * Map Judge0 status to verdict
   */
  mapStatusToVerdict(statusId: number): string {
    switch (statusId) {
      case 3: return 'accepted';
      case 4: return 'wrong_answer';
      case 5: return 'time_limit_exceeded';
      case 6: return 'compilation_error';
      case 7:
      case 8:
      case 9:
      case 10:
      case 11:
      case 12: return 'runtime_error';
      case 13:
      case 14: return 'internal_error';
      default: return 'pending';
    }
  }

  /**
   * Generate instance ID from URL
   */
  private generateInstanceId(url: string): string {
    return Buffer.from(url).toString('base64').substring(0, 8);
  }

  /**
   * Shutdown the cluster service
   */
  async shutdown(): Promise<void> {
    this.stopHealthChecks();
    this.instances.clear();
    this.clients.clear();
    logger.info('Judge0 cluster service shutdown completed');
  }
}

// Export singleton instance
export const judge0Cluster = Judge0ClusterService.getInstance();