export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  PROBLEM_SETTER = 'problem_setter',
  MODERATOR = 'moderator'
}

export enum ProblemDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard'
}

export enum SubmissionVerdict {
  PENDING = 'pending',
  PROCESSING = 'processing',
  ACCEPTED = 'accepted',
  WRONG_ANSWER = 'wrong_answer',
  TIME_LIMIT_EXCEEDED = 'time_limit_exceeded',
  MEMORY_LIMIT_EXCEEDED = 'memory_limit_exceeded',
  RUNTIME_ERROR = 'runtime_error',
  COMPILATION_ERROR = 'compilation_error',
  PRESENTATION_ERROR = 'presentation_error',
  INTERNAL_ERROR = 'internal_error'
}

export enum ContestType {
  ACM_ICPC = 'ACM_ICPC',
  IOI = 'IOI',
  ATCODER = 'AtCoder',
  CODEFORCES = 'CodeForces'
}

export enum ContestStatus {
  UPCOMING = 'upcoming',
  RUNNING = 'running',
  ENDED = 'ended'
}

export enum ProgrammingLanguage {
  C = 'c',
  CPP = 'cpp',
  JAVA = 'java',
  PYTHON = 'python',
  JAVASCRIPT = 'javascript',
  GO = 'go',
  RUST = 'rust',
  CSHARP = 'csharp'
}