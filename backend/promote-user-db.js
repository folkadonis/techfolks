// Direct database script to promote user to admin
const { Client } = require('pg');

async function promoteUserToAdmin(username) {
  // Database connection configuration
  const dbConfigs = [
    {
      host: 'localhost',
      port: 5432,
      database: 'techfolks_db',
      user: 'postgres',
      password: 'postgres'
    },
    {
      host: 'localhost',
      port: 5432,
      database: 'techfolks',
      user: 'postgres',
      password: 'postgres'
    },
    {
      host: 'localhost',
      port: 5432,
      database: 'techfolks_db',
      user: 'postgres',
      password: 'postgres123'
    },
    {
      host: 'localhost',
      port: 5432,
      database: 'techfolks',
      user: 'postgres',
      password: 'postgres123'
    }
  ];

  for (const config of dbConfigs) {
    try {
      console.log(`Trying to connect to database: ${config.database} with user: ${config.user}`);
      
      const client = new Client(config);
      await client.connect();
      
      console.log('✅ Connected to database successfully');
      
      // Check if user exists
      const checkResult = await client.query(
        'SELECT id, username, email, role FROM users WHERE username = $1',
        [username]
      );
      
      if (checkResult.rows.length === 0) {
        console.log(`❌ User '${username}' not found in the database`);
        await client.end();
        continue;
      }
      
      const user = checkResult.rows[0];
      console.log('📋 Current user data:', user);
      
      if (user.role === 'admin') {
        console.log(`✅ User '${username}' is already an admin!`);
        await client.end();
        return;
      }
      
      // Promote user to admin
      const updateResult = await client.query(
        'UPDATE users SET role = $1 WHERE username = $2 RETURNING id, username, email, role',
        ['admin', username]
      );
      
      if (updateResult.rows.length > 0) {
        console.log('✅ User promoted to admin successfully!');
        console.log('📋 Updated user data:', updateResult.rows[0]);
      } else {
        console.log('❌ Failed to update user role');
      }
      
      await client.end();
      return;
      
    } catch (error) {
      console.log(`❌ Failed to connect with config ${config.database}:`, error.message);
      continue;
    }
  }
  
  console.log('❌ Could not connect to any database configuration');
}

// Get username from command line argument
const username = process.argv[2];

if (!username) {
  console.error('Usage: node promote-user-db.js <username>');
  console.error('Example: node promote-user-db.js folkadonis');
  process.exit(1);
}

promoteUserToAdmin(username).catch(console.error);