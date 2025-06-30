// Script to promote a user to admin
// Usage: node promote-user.js <username> <admin-token>

const axios = require('axios');

const API_BASE_URL = process.env.API_URL || 'http://localhost:5000/api';

async function promoteUserToAdmin(username, adminToken) {
  try {
    console.log(`Attempting to promote user "${username}" to admin...`);
    
    const response = await axios.put(
      `${API_BASE_URL}/admin/users/${username}/promote`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.success) {
      console.log('✅ Success!', response.data.message);
      console.log('User data:', response.data.data);
    } else {
      console.error('❌ Failed:', response.data.message);
    }
  } catch (error) {
    if (error.response) {
      console.error('❌ API Error:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('❌ Network Error: Could not connect to the API');
      console.error('Make sure the backend server is running on', API_BASE_URL);
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

async function loginAsAdmin() {
  try {
    console.log('Logging in as admin...');
    
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });

    if (response.data.success) {
      console.log('✅ Admin login successful');
      return response.data.data.token;
    } else {
      console.error('❌ Admin login failed:', response.data.message);
      return null;
    }
  } catch (error) {
    if (error.response) {
      console.error('❌ Login Error:', error.response.status, error.response.data);
    } else {
      console.error('❌ Network Error: Could not connect to the API');
      console.error('Make sure the backend server is running on', API_BASE_URL);
    }
    return null;
  }
}

async function main() {
  const username = process.argv[2];
  const providedToken = process.argv[3];

  if (!username) {
    console.error('Usage: node promote-user.js <username> [admin-token]');
    console.error('Example: node promote-user.js folkadonis');
    process.exit(1);
  }

  let adminToken = providedToken;

  if (!adminToken) {
    console.log('No admin token provided, attempting to login as admin...');
    adminToken = await loginAsAdmin();
    
    if (!adminToken) {
      console.error('Failed to get admin token. Exiting.');
      process.exit(1);
    }
  }

  await promoteUserToAdmin(username, adminToken);
}

main().catch(console.error);