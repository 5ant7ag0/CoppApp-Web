import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8080/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

async function run() {
  const username = 'coopro';
  const password = 'CoopSF2026!';
  const tenantId = '25';

  try {
    console.log('Logging in...');
    const loginRes = await api.post('/auth/admin/login', { username, password }, {
      headers: { 'X-Tenant-ID': tenantId }
    });
    const token = loginRes.data.token;
    console.log('Login success! Token:', token);

    console.log('Fetching /auth/me...');
    const meRes = await api.get('/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-ID': tenantId
      }
    });
    console.log('Profile success:', meRes.data);

    console.log('Fetching /creditos...');
    const creditosRes = await api.get('/creditos', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-ID': tenantId
      }
    });
    console.log('Creditos success:', creditosRes.data);

  } catch (err) {
    console.error('Error:');
    if (err.response) {
      console.error(`Status: ${err.response.status}`);
      console.error('Data:', err.response.data);
    } else {
      console.error(err.message);
    }
  }
}

run();
