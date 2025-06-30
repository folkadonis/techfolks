-- SQL script to promote user 'folkadonis' to admin
-- Run this script against your PostgreSQL database

-- First, check if the user exists
SELECT id, username, email, role FROM users WHERE username = 'folkadonis';

-- If the user exists, promote them to admin
UPDATE users SET role = 'admin' WHERE username = 'folkadonis';

-- Verify the update
SELECT id, username, email, role FROM users WHERE username = 'folkadonis';

-- If you want to see all admin users:
-- SELECT id, username, email, role FROM users WHERE role = 'admin';