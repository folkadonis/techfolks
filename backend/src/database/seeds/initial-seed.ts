import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../../models/User.entity';
import { Problem, ProblemDifficulty } from '../../models/Problem.entity';
import { AppDataSource } from '../../config/ormconfig';

async function seed() {
  try {
    await AppDataSource.initialize();
    console.log('Database connected for seeding');

    // Create admin user
    const adminRepository = AppDataSource.getRepository(User);
    const adminPassword = await bcrypt.hash('admin123', 10);
    
    const adminUser = adminRepository.create({
      username: 'admin',
      email: 'admin@techfolks.com',
      password: adminPassword,
      full_name: 'TechFolks Admin',
      role: UserRole.ADMIN,
      is_verified: true,
      rating: 3000,
      max_rating: 3000,
    });
    
    await adminRepository.save(adminUser);
    console.log('Admin user created');

    // Create sample users
    const users = [];
    for (let i = 1; i <= 5; i++) {
      const userPassword = await bcrypt.hash(`user${i}123`, 10);
      const user = adminRepository.create({
        username: `user${i}`,
        email: `user${i}@example.com`,
        password: userPassword,
        full_name: `Test User ${i}`,
        role: UserRole.USER,
        is_verified: true,
        rating: 1200 + (i * 100),
        max_rating: 1200 + (i * 100),
      });
      users.push(await adminRepository.save(user));
    }
    console.log('Sample users created');

    // Create tags
    const tagRepository = AppDataSource.getRepository('tags');
    const tagNames = [
      'arrays', 'strings', 'dynamic-programming', 'graphs', 'trees',
      'binary-search', 'sorting', 'greedy', 'math', 'implementation',
      'data-structures', 'algorithms', 'number-theory', 'geometry',
      'bfs', 'dfs', 'divide-and-conquer', 'backtracking'
    ];

    const tags = [];
    for (const tagName of tagNames) {
      const tag = await tagRepository.save({
        name: tagName,
        description: `Problems related to ${tagName}`,
      });
      tags.push(tag);
    }
    console.log('Tags created');

    // Create sample problems
    const problemRepository = AppDataSource.getRepository(Problem);
    const problemData = [
      {
        title: 'Two Sum',
        slug: 'two-sum',
        statement: `Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.`,
        input_format: 'First line contains n (size of array) and target.\nSecond line contains n space-separated integers.',
        output_format: 'Two space-separated integers representing the indices.',
        constraints: '2 <= n <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9',
        difficulty: ProblemDifficulty.EASY,
        time_limit: 1000,
        memory_limit: 256,
        author_id: adminUser.id,
        is_public: true,
      },
      {
        title: 'Longest Palindromic Substring',
        slug: 'longest-palindromic-substring',
        statement: 'Given a string s, return the longest palindromic substring in s.',
        input_format: 'A single line containing the string s.',
        output_format: 'The longest palindromic substring.',
        constraints: '1 <= s.length <= 1000\ns consist of only digits and English letters.',
        difficulty: ProblemDifficulty.MEDIUM,
        timeLimit: 2000,
        memoryLimit: 256,
        author_id: adminUser.id,
        is_public: true,
      },
      {
        title: 'Binary Tree Maximum Path Sum',
        slug: 'binary-tree-max-path-sum',
        statement: 'A path in a binary tree is a sequence of nodes where each pair of adjacent nodes in the sequence has an edge connecting them. A node can only appear in the sequence at most once. Note that the path does not need to pass through the root.\n\nThe path sum of a path is the sum of the node values in the path.\n\nGiven the root of a binary tree, return the maximum path sum of any non-empty path.',
        input_format: 'Binary tree represented in level order traversal format.',
        output_format: 'Maximum path sum.',
        constraints: 'The number of nodes in the tree is in the range [1, 3 * 10^4].\n-1000 <= Node.val <= 1000',
        difficulty: ProblemDifficulty.HARD,
        time_limit: 1000,
        memory_limit: 256,
        author_id: adminUser.id,
        is_public: true,
      },
    ];

    const problems = [];
    for (const data of problemData) {
      const problem = problemRepository.create(data);
      problems.push(await problemRepository.save(problem));
    }
    console.log('Sample problems created');

    // Create test cases for problems
    const testCaseRepository = AppDataSource.getRepository('test_cases');
    
    // Test cases for Two Sum
    const twoSumTestCases = [
      { input: '4 9\n2 7 11 15', expectedOutput: '0 1', isSample: true },
      { input: '3 6\n3 2 4', expectedOutput: '1 2', isSample: true },
      { input: '2 6\n3 3', expectedOutput: '0 1', isSample: false },
    ];

    for (const tc of twoSumTestCases) {
      await testCaseRepository.save({
        problem_id: problems[0].id,
        input: tc.input,
        expected_output: tc.expectedOutput,
        is_sample: tc.isSample,
        points: 10,
      });
    }

    console.log('Test cases created');

    // Create achievements
    const achievementRepository = AppDataSource.getRepository('achievements');
    const achievements = [
      { name: 'First Blood', description: 'Solve your first problem', category: 'problem_solving', points: 10 },
      { name: 'Streak Master', description: 'Maintain a 7-day solving streak', category: 'consistency', points: 50 },
      { name: 'Contest Winner', description: 'Win your first contest', category: 'contest', points: 100 },
      { name: 'Problem Setter', description: 'Create your first problem', category: 'contribution', points: 50 },
      { name: 'Helpful Member', description: 'Get 10 upvotes on forum posts', category: 'community', points: 30 },
    ];

    for (const achievement of achievements) {
      await achievementRepository.save(achievement);
    }
    console.log('Achievements created');

    console.log('Seeding completed successfully!');
    await AppDataSource.destroy();
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  }
}

seed();