import axios from 'axios';
import { logger } from '../utils/logger';
import { ProgrammingLanguage } from '../types/enums';

interface Judge0Submission {
  language_id: number;
  source_code: string;
  stdin?: string;
  expected_output?: string;
  cpu_time_limit?: number;
  memory_limit?: number;
  enable_per_process_and_thread_time_limit?: boolean;
  enable_per_process_and_thread_memory_limit?: boolean;
}

interface Judge0Result {
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

const LANGUAGE_MAP: Record<string, number> = {
  [ProgrammingLanguage.C]: 50,
  [ProgrammingLanguage.CPP]: 54,
  [ProgrammingLanguage.JAVA]: 62,
  [ProgrammingLanguage.PYTHON]: 71,
  [ProgrammingLanguage.JAVASCRIPT]: 63,
  [ProgrammingLanguage.GO]: 60,
  [ProgrammingLanguage.RUST]: 73,
  [ProgrammingLanguage.CSHARP]: 51
};

const STATUS_MAP: Record<number, string> = {
  1: 'In Queue',
  2: 'Processing',
  3: 'Accepted',
  4: 'Wrong Answer',
  5: 'Time Limit Exceeded',
  6: 'Compilation Error',
  7: 'Runtime Error (SIGSEGV)',
  8: 'Runtime Error (SIGXFSZ)',
  9: 'Runtime Error (SIGFPE)',
  10: 'Runtime Error (SIGABRT)',
  11: 'Runtime Error (NZEC)',
  12: 'Runtime Error (Other)',
  13: 'Internal Error',
  14: 'Exec Format Error'
};

class Judge0Service {
  private baseURL: string;
  private authToken?: string;

  constructor() {
    this.baseURL = process.env.JUDGE0_URL || 'http://localhost:2358';
    this.authToken = process.env.JUDGE0_AUTH_TOKEN;
  }

  async executeCode(params: {
    language: string;
    sourceCode: string;
    stdin?: string;
    expectedOutput?: string;
    timeLimit?: number;
    memoryLimit?: number;
  }): Promise<Judge0Result> {
    try {
      const languageId = LANGUAGE_MAP[params.language];
      if (!languageId) {
        throw new Error(`Unsupported language: ${params.language}`);
      }

      const submission: Judge0Submission = {
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
      const submitResponse = await axios.post(
        `${this.baseURL}/submissions?base64_encoded=true&wait=false`,
        submission,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(this.authToken && { 'Authorization': `Bearer ${this.authToken}` })
          }
        }
      );

      const token = submitResponse.data.token;

      // Poll for results
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds timeout
      let result: Judge0Result;

      while (attempts < maxAttempts) {
        const statusResponse = await axios.get(
          `${this.baseURL}/submissions/${token}?base64_encoded=true`,
          {
            headers: {
              ...(this.authToken && { 'Authorization': `Bearer ${this.authToken}` })
            }
          }
        );

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

      throw new Error('Execution timeout');
    } catch (error) {
      logger.error('Judge0 execution error:', error);
      throw error;
    }
  }

  async batchExecute(testCases: Array<{
    input: string;
    expectedOutput: string;
  }>, params: {
    language: string;
    sourceCode: string;
    timeLimit?: number;
    memoryLimit?: number;
  }): Promise<Judge0Result[]> {
    try {
      const languageId = LANGUAGE_MAP[params.language];
      if (!languageId) {
        throw new Error(`Unsupported language: ${params.language}`);
      }

      // Create batch submissions
      const submissions = testCases.map(testCase => ({
        language_id: languageId,
        source_code: Buffer.from(params.sourceCode).toString('base64'),
        stdin: Buffer.from(testCase.input).toString('base64'),
        expected_output: Buffer.from(testCase.expectedOutput).toString('base64'),
        cpu_time_limit: params.timeLimit || 2.0,
        memory_limit: (params.memoryLimit || 256) * 1024,
        enable_per_process_and_thread_time_limit: true,
        enable_per_process_and_thread_memory_limit: true
      }));

      // Submit batch
      const submitResponse = await axios.post(
        `${this.baseURL}/submissions/batch?base64_encoded=true`,
        { submissions },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(this.authToken && { 'Authorization': `Bearer ${this.authToken}` })
          }
        }
      );

      const tokens = submitResponse.data.map((item: any) => item.token);

      // Poll for all results
      let attempts = 0;
      const maxAttempts = 30;
      const results: Judge0Result[] = [];

      while (attempts < maxAttempts && results.length < tokens.length) {
        const tokensToCheck = tokens.filter((_: any, index: number) => !results[index]);
        
        const statusResponse = await axios.get(
          `${this.baseURL}/submissions/batch?tokens=${tokensToCheck.join(',')}&base64_encoded=true`,
          {
            headers: {
              ...(this.authToken && { 'Authorization': `Bearer ${this.authToken}` })
            }
          }
        );

        statusResponse.data.submissions.forEach((submission: Judge0Result, index: number) => {
          if (submission.status.id > 2 && !results[index]) {
            // Decode base64 outputs
            submission.stdout = submission.stdout ? Buffer.from(submission.stdout, 'base64').toString() : null;
            submission.stderr = submission.stderr ? Buffer.from(submission.stderr, 'base64').toString() : null;
            submission.compile_output = submission.compile_output ? Buffer.from(submission.compile_output, 'base64').toString() : null;
            results[index] = submission;
          }
        });

        if (results.filter(r => r).length === tokens.length) {
          break;
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }

      return results;
    } catch (error) {
      logger.error('Judge0 batch execution error:', error);
      throw error;
    }
  }

  mapStatusToVerdict(statusId: number): string {
    switch (statusId) {
      case 3:
        return 'accepted';
      case 4:
        return 'wrong_answer';
      case 5:
        return 'time_limit_exceeded';
      case 6:
        return 'compilation_error';
      case 7:
      case 8:
      case 9:
      case 10:
      case 11:
      case 12:
        return 'runtime_error';
      case 13:
      case 14:
        return 'internal_error';
      default:
        return 'pending';
    }
  }

  getStatusDescription(statusId: number): string {
    return STATUS_MAP[statusId] || 'Unknown';
  }
}

export const judge0Service = new Judge0Service();