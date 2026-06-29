const jwt = require('jsonwebtoken');

const token = jwt.sign(
  {
    sub: 'superadmin_frixon',
    rol: 'SUPER_ADMIN_SAAS',
    empresaId: 1
  },
  'CooperativaCoreSecretKey2026!SistemaFinancieroSaaS',
  { expiresIn: '1h' }
);

async function test() {
  console.log("Token:", token);
  try {
    const res = await fetch('http://localhost:8080/api/v1/cajas-ventanilla', {
      headers: {
        'Authorization': 'Bearer ' + token
      }
    });
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Response:", text);
  } catch (err) {
    console.error("Fetch Error:", err);
  }
}
test();
