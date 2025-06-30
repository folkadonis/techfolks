import 'dotenv/config';
import { AppDataSource } from '../config/database';
import { logger } from '../utils/logger';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.entity';
import { Problem } from '../models/Problem.entity';
import { UserRole, ProblemDifficulty } from '../types/enums';

async function setupDatabase() {
  try {
    // Initialize data source
    await AppDataSource.initialize();
    logger.info('Data source initialized');

    // Run migrations
    await AppDataSource.runMigrations();
    logger.info('Migrations completed');

    // Seed initial data
    await seedData();
    logger.info('Seeding completed');

    await AppDataSource.destroy();
    logger.info('Database setup completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Database setup failed:', error);
    process.exit(1);
  }
}

async function seedData() {
  const userRepository = AppDataSource.getRepository(User);
  const problemRepository = AppDataSource.getRepository(Problem);

  // Check if data already exists
  const existingUsers = await userRepository.count();
  if (existingUsers > 0) {
    logger.info('Data already exists, skipping seed');
    return;
  }

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = userRepository.create({
    username: 'admin',
    email: 'admin@techfolks.com',
    password: adminPassword,
    full_name: 'TechFolks Admin',
    role: UserRole.ADMIN,
    is_verified: true,
    rating: 3000,
    max_rating: 3000,
    problems_solved: 0,
    contests_participated_count: 0,
    contribution_points: 1000
  });
  await userRepository.save(admin);
  logger.info('Admin user created');

  // Create problem setter
  const setterPassword = await bcrypt.hash('setter123', 10);
  const setter = userRepository.create({
    username: 'problemsetter',
    email: 'setter@techfolks.com',
    password: setterPassword,
    full_name: 'Problem Setter',
    role: UserRole.PROBLEM_SETTER,
    is_verified: true,
    rating: 2000,
    max_rating: 2000,
    problems_solved: 0,
    contests_participated_count: 0,
    contribution_points: 500
  });
  await userRepository.save(setter);

  // Create sample users
  const users = [];
  for (let i = 1; i <= 5; i++) {
    const userPassword = await bcrypt.hash(`user${i}123`, 10);
    const user = userRepository.create({
      username: `user${i}`,
      email: `user${i}@example.com`,
      password: userPassword,
      full_name: `Test User ${i}`,
      role: UserRole.USER,
      is_verified: true,
      rating: 1200 + (i * 100),
      max_rating: 1200 + (i * 100),
      problems_solved: i * 5,
      contests_participated_count: i,
      contribution_points: i * 10
    });
    users.push(await userRepository.save(user));
  }
  logger.info('Sample users created');

  // Create sample problems
  const problemsData = [
    {
      title: 'Two Sum',
      slug: 'two-sum',
      statement: `Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.

**Example 1:**
Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].

**Example 2:**
Input: nums = [3,2,4], target = 6
Output: [1,2]

**Example 3:**
Input: nums = [3,3], target = 6
Output: [0,1]`,
      input_format: 'First line contains n (size of array) and target.\nSecond line contains n space-separated integers.',
      output_format: 'Two space-separated integers representing the indices.',
      constraints: '2 <= n <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9',
      difficulty: ProblemDifficulty.EASY,
      time_limit: 1000,
      memory_limit: 256,
      author_id: setter.id,
      is_public: true
    },
    {
      title: 'Longest Palindromic Substring',
      slug: 'longest-palindromic-substring',
      statement: `Given a string s, return the longest palindromic substring in s.

**Example 1:**
Input: s = "babad"
Output: "bab"
Explanation: "aba" is also a valid answer.

**Example 2:**
Input: s = "cbbd"
Output: "bb"`,
      input_format: 'A single line containing the string s.',
      output_format: 'The longest palindromic substring.',
      constraints: '1 <= s.length <= 1000\ns consist of only digits and English letters.',
      difficulty: ProblemDifficulty.MEDIUM,
      time_limit: 2000,
      memory_limit: 256,
      author_id: setter.id,
      is_public: true
    },
    {
      title: 'Binary Tree Maximum Path Sum',
      slug: 'binary-tree-max-path-sum',
      statement: `A path in a binary tree is a sequence of nodes where each pair of adjacent nodes in the sequence has an edge connecting them. A node can only appear in the sequence at most once. Note that the path does not need to pass through the root.

The path sum of a path is the sum of the node's values in the path.

Given the root of a binary tree, return the maximum path sum of any non-empty path.`,
      input_format: 'Binary tree represented in level order traversal format.',
      output_format: 'Maximum path sum.',
      constraints: 'The number of nodes in the tree is in the range [1, 3 * 10^4].\n-1000 <= Node.val <= 1000',
      difficulty: ProblemDifficulty.HARD,
      time_limit: 1000,
      memory_limit: 256,
      author_id: setter.id,
      is_public: true
    },
    {
      title: 'FizzBuzz',
      slug: 'fizzbuzz',
      statement: `Write a program that outputs the string representation of numbers from 1 to n.

But for multiples of three it should output "Fizz" instead of the number and for the multiples of five output "Buzz". For numbers which are multiples of both three and five output "FizzBuzz".

**Example:**
n = 15,
Return:
[
    "1",
    "2",
    "Fizz",
    "4",
    "Buzz",
    "Fizz",
    "7",
    "8",
    "Fizz",
    "Buzz",
    "11",
    "Fizz",
    "13",
    "14",
    "FizzBuzz"
]`,
      input_format: 'A single integer n.',
      output_format: 'n lines, each containing the appropriate string.',
      constraints: '1 <= n <= 10^4',
      difficulty: ProblemDifficulty.EASY,
      time_limit: 1000,
      memory_limit: 256,
      author_id: admin.id,
      is_public: true
    },
    {
      title: 'Valid Parentheses',
      slug: 'valid-parentheses',
      statement: `Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.

**Example 1:**
Input: s = "()"
Output: true

**Example 2:**
Input: s = "()[]{}"
Output: true

**Example 3:**
Input: s = "(]"
Output: false`,
      input_format: 'A single line containing the string s.',
      output_format: '"true" if valid, "false" otherwise.',
      constraints: '1 <= s.length <= 10^4\ns consists of parentheses only "()[]{}".',
      difficulty: ProblemDifficulty.EASY,
      time_limit: 1000,
      memory_limit: 256,
      author_id: setter.id,
      is_public: true
    }
  ];

  for (const problemData of problemsData) {
    const problem = problemRepository.create(problemData);
    await problemRepository.save(problem);
  }
  logger.info('Sample problems created');

  // Create test cases for the first problem (Two Sum)
  const firstProblem = await problemRepository.findOne({ where: { slug: 'two-sum' } });
  if (firstProblem) {
    const testCases = [
      { input: '4 9\n2 7 11 15', expected_output: '0 1', is_sample: true, points: 10 },
      { input: '3 6\n3 2 4', expected_output: '1 2', is_sample: true, points: 10 },
      { input: '2 6\n3 3', expected_output: '0 1', is_sample: false, points: 10 },
      { input: '5 10\n1 2 3 4 5', expected_output: '3 4', is_sample: false, points: 10 },
      { input: '6 0\n-3 -2 -1 1 2 3', expected_output: '0 5', is_sample: false, points: 10 }
    ];

    for (const tc of testCases) {
      await AppDataSource.query(`
        INSERT INTO test_cases (problem_id, input, expected_output, is_sample, points)
        VALUES ($1, $2, $3, $4, $5)
      `, [firstProblem.id, tc.input, tc.expected_output, tc.is_sample, tc.points]);
    }
    logger.info('Test cases created for Two Sum problem');
  }

  // Create tags
  const tagNames = [
    'arrays', 'strings', 'dynamic-programming', 'graphs', 'trees',
    'binary-search', 'sorting', 'greedy', 'math', 'implementation',
    'data-structures', 'algorithms', 'number-theory', 'geometry',
    'bfs', 'dfs', 'divide-and-conquer', 'backtracking', 'two-pointers',
    'sliding-window', 'stack', 'queue', 'heap', 'hash-table'
  ];

  for (const tagName of tagNames) {
    await AppDataSource.query(`
      INSERT INTO tags (name, description)
      VALUES ($1, $2)
      ON CONFLICT (name) DO NOTHING
    `, [tagName, `Problems related to ${tagName}`]);
  }
  logger.info('Tags created');

  // Create achievements
  const achievements = [
    { name: 'First Blood', description: 'Solve your first problem', category: 'problem_solving', points: 10 },
    { name: 'Streak Master', description: 'Maintain a 7-day solving streak', category: 'consistency', points: 50 },
    { name: 'Contest Winner', description: 'Win your first contest', category: 'contest', points: 100 },
    { name: 'Problem Setter', description: 'Create your first problem', category: 'contribution', points: 50 },
    { name: 'Helpful Member', description: 'Get 10 upvotes on forum posts', category: 'community', points: 30 },
    { name: 'Speed Demon', description: 'Solve a problem in under 5 minutes', category: 'speed', points: 20 },
    { name: 'Bug Hunter', description: 'Report a valid bug in the platform', category: 'contribution', points: 40 },
    { name: 'Century', description: 'Solve 100 problems', category: 'problem_solving', points: 100 },
    { name: 'Elite Coder', description: 'Reach 2000 rating', category: 'rating', points: 200 },
    { name: 'Legend', description: 'Reach 3000 rating', category: 'rating', points: 500 }
  ];

  for (const achievement of achievements) {
    await AppDataSource.query(`
      INSERT INTO achievements (name, description, category, points)
      VALUES ($1, $2, $3, $4)
    `, [achievement.name, achievement.description, achievement.category, achievement.points]);
  }
  logger.info('Achievements created');
}

// Run the setup
setupDatabase();