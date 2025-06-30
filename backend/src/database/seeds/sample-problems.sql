-- Sample problems for testing
-- Insert into problems table

INSERT INTO problems (
    id, 
    title, 
    slug, 
    statement, 
    input_format, 
    output_format, 
    constraints, 
    difficulty, 
    time_limit, 
    memory_limit, 
    author_id, 
    is_public, 
    created_at, 
    updated_at
) VALUES
(
    uuid_generate_v4(),
    'Two Sum',
    'two-sum',
    'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.',
    'The first line contains an integer n (2 ≤ n ≤ 10^4) — the length of the array.
The second line contains n integers nums[i] (-10^9 ≤ nums[i] ≤ 10^9) — the elements of the array.
The third line contains an integer target (-10^9 ≤ target ≤ 10^9) — the target sum.',
    'Two space-separated integers representing the 0-indexed positions of the two numbers that add up to the target.',
    '• 2 ≤ nums.length ≤ 10^4
• -10^9 ≤ nums[i] ≤ 10^9
• -10^9 ≤ target ≤ 10^9
• Only one valid answer exists.',
    'beginner',
    1000,
    256,
    (SELECT id FROM users WHERE username = 'admin' LIMIT 1),
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    uuid_generate_v4(),
    'Add Two Numbers',
    'add-two-numbers',
    'You are given two non-empty linked lists representing two non-negative integers. The digits are stored in reverse order, and each of their nodes contains a single digit. Add the two numbers and return the sum as a linked list.

You may assume the two numbers do not contain any leading zero, except the number 0 itself.',
    'The first line contains the digits of the first number in reverse order.
The second line contains the digits of the second number in reverse order.',
    'The digits of the sum in reverse order.',
    '• The number of nodes in each linked list is in the range [1, 100]
• 0 ≤ Node.val ≤ 9
• It is guaranteed that the list represents a number that does not have leading zeros.',
    'intermediate',
    2000,
    256,
    (SELECT id FROM users WHERE username = 'admin' LIMIT 1),
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    uuid_generate_v4(),
    'Longest Substring Without Repeating Characters',
    'longest-substring-without-repeating-characters',
    'Given a string s, find the length of the longest substring without repeating characters.',
    'A single line containing a string s.',
    'An integer representing the length of the longest substring without repeating characters.',
    '• 0 ≤ s.length ≤ 5 * 10^4
• s consists of English letters, digits, symbols and spaces.',
    'intermediate',
    1000,
    256,
    (SELECT id FROM users WHERE username = 'admin' LIMIT 1),
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    uuid_generate_v4(),
    'Median of Two Sorted Arrays',
    'median-of-two-sorted-arrays',
    'Given two sorted arrays nums1 and nums2 of size m and n respectively, return the median of the two sorted arrays.

The overall run time complexity should be O(log (m+n)).',
    'The first line contains an integer m — the size of the first array.
The second line contains m integers representing the first sorted array.
The third line contains an integer n — the size of the second array.
The fourth line contains n integers representing the second sorted array.',
    'A decimal number representing the median of the two sorted arrays.',
    '• nums1.length == m
• nums2.length == n
• 0 ≤ m ≤ 1000
• 0 ≤ n ≤ 1000
• 1 ≤ m + n ≤ 2000
• -10^6 ≤ nums1[i], nums2[i] ≤ 10^6',
    'expert',
    2000,
    256,
    (SELECT id FROM users WHERE username = 'admin' LIMIT 1),
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    uuid_generate_v4(),
    'Valid Parentheses',
    'valid-parentheses',
    'Given a string s containing just the characters ''('', '')'', ''{'', ''}'', ''['' and '']'', determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.',
    'A single line containing a string s.',
    'Return "true" if the string is valid, "false" otherwise.',
    '• 1 ≤ s.length ≤ 10^4
• s consists of parentheses only ''()[]{}''.''',
    'beginner',
    1000,
    256,
    (SELECT id FROM users WHERE username = 'admin' LIMIT 1),
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (slug) DO NOTHING;

-- Add some tags
INSERT INTO tags (id, name, description) VALUES
(uuid_generate_v4(), 'array', 'Problems involving arrays'),
(uuid_generate_v4(), 'hash-table', 'Problems using hash tables'),
(uuid_generate_v4(), 'linked-list', 'Problems involving linked lists'),
(uuid_generate_v4(), 'string', 'String manipulation problems'),
(uuid_generate_v4(), 'two-pointers', 'Two pointer technique'),
(uuid_generate_v4(), 'sliding-window', 'Sliding window technique'),
(uuid_generate_v4(), 'binary-search', 'Binary search problems'),
(uuid_generate_v4(), 'stack', 'Stack data structure'),
(uuid_generate_v4(), 'math', 'Mathematical problems'),
(uuid_generate_v4(), 'divide-and-conquer', 'Divide and conquer algorithm')
ON CONFLICT (name) DO NOTHING;

-- Link problems with tags
INSERT INTO problem_tags (problem_id, tag_id)
SELECT p.id, t.id
FROM problems p, tags t
WHERE p.slug = 'two-sum' AND t.name IN ('array', 'hash-table')
ON CONFLICT DO NOTHING;

INSERT INTO problem_tags (problem_id, tag_id)
SELECT p.id, t.id
FROM problems p, tags t
WHERE p.slug = 'add-two-numbers' AND t.name IN ('linked-list', 'math')
ON CONFLICT DO NOTHING;

INSERT INTO problem_tags (problem_id, tag_id)
SELECT p.id, t.id
FROM problems p, tags t
WHERE p.slug = 'longest-substring-without-repeating-characters' AND t.name IN ('string', 'sliding-window', 'hash-table')
ON CONFLICT DO NOTHING;

INSERT INTO problem_tags (problem_id, tag_id)
SELECT p.id, t.id
FROM problems p, tags t
WHERE p.slug = 'median-of-two-sorted-arrays' AND t.name IN ('array', 'binary-search', 'divide-and-conquer')
ON CONFLICT DO NOTHING;

INSERT INTO problem_tags (problem_id, tag_id)
SELECT p.id, t.id
FROM problems p, tags t
WHERE p.slug = 'valid-parentheses' AND t.name IN ('string', 'stack')
ON CONFLICT DO NOTHING;

-- Add some test cases
INSERT INTO test_cases (id, problem_id, input, expected_output, is_sample, points)
SELECT 
    uuid_generate_v4(),
    p.id,
    '4
2 7 11 15
9',
    '0 1',
    true,
    100
FROM problems p WHERE p.slug = 'two-sum'
ON CONFLICT DO NOTHING;

INSERT INTO test_cases (id, problem_id, input, expected_output, is_sample, points)
SELECT 
    uuid_generate_v4(),
    p.id,
    '3
3 2 4
6',
    '1 2',
    true,
    100
FROM problems p WHERE p.slug = 'two-sum'
ON CONFLICT DO NOTHING;

INSERT INTO test_cases (id, problem_id, input, expected_output, is_sample, points)
SELECT 
    uuid_generate_v4(),
    p.id,
    'abcabcbb',
    '3',
    true,
    100
FROM problems p WHERE p.slug = 'longest-substring-without-repeating-characters'
ON CONFLICT DO NOTHING;

INSERT INTO test_cases (id, problem_id, input, expected_output, is_sample, points)
SELECT 
    uuid_generate_v4(),
    p.id,
    '()[]{}',
    'true',
    true,
    100
FROM problems p WHERE p.slug = 'valid-parentheses'
ON CONFLICT DO NOTHING;