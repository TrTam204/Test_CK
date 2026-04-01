const http = require('http');
const querystring = require('querystring');

const BASE_URL = 'http://localhost:5000';
const results = [];

// Helper function to make HTTP requests
function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const url = new URL(options.url || BASE_URL);
    const opts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', reject);
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

function test_case(id, description, testFunc) {
  return testFunc().then(({ expected, actual, passed }) => {
    const status = passed ? 'PASS' : 'FAIL';
    results.push({ id, description, expected, actual, status });
    console.log(`${id}: ${status} - ${description}`);
  }).catch(err => {
    results.push({ id, description, expected: 'N/A', actual: err.message, status: 'ERROR' });
    console.log(`${id}: ERROR - ${description}: ${err.message}`);
  });
}

async function runTests() {
  console.log('='.repeat(80));
  console.log('KIỂM THỬ CORS - 20 TEST CASES');
  console.log('='.repeat(80));
  console.log(`Base URL: ${BASE_URL}\n`);

  // ===== NHÓM 1: ORIGIN (TC01-TC05) =====
  console.log('\n--- NHÓM 1: ORIGIN (TC01-TC05) ---');

  // TC01
  await test_case('TC01', 'Origin: http://localhost:3000 → Allow', async () => {
    const res = await makeRequest({
      url: 'http://localhost:5000/api/items',
      method: 'GET',
      headers: { 'Origin': 'http://localhost:3000' }
    });
    const origin = res.headers['access-control-allow-origin'] || '';
    const passed = origin === 'http://localhost:3000';
    return { expected: 'http://localhost:3000', actual: origin, passed };
  });

  // TC02 - VULNERABLE: reflects any origin
  await test_case('TC02', 'Origin: http://evil.com → Should block (CORS1)', async () => {
    const res = await makeRequest({
      url: 'http://localhost:5000/api/items',
      method: 'GET',
      headers: { 'Origin': 'http://evil.com' }
    });
    const origin = res.headers['access-control-allow-origin'] || '';
    // In vulnerable mode, it reflects evil.com - this is the VULNERABILITY
    const passed = origin === 'http://evil.com' ? false : true; // FAIL if reflects evil.com
    return { 
      expected: 'NOT http://evil.com', 
      actual: origin || '(not reflected)', 
      passed 
    };
  });

  // TC03
  await test_case('TC03', 'Origin: http://localhost:4000 → Should block', async () => {
    const res = await makeRequest({
      url: 'http://localhost:5000/api/items',
      method: 'GET',
      headers: { 'Origin': 'http://localhost:4000' }
    });
    const origin = res.headers['access-control-allow-origin'] || '';
    const passed = origin === 'http://localhost:4000' ? false : true;
    return { 
      expected: 'NOT http://localhost:4000', 
      actual: origin || '(not reflected)', 
      passed 
    };
  });

  // TC04
  await test_case('TC04', 'Origin: https://localhost:3000 → Should block', async () => {
    const res = await makeRequest({
      url: 'http://localhost:5000/api/items',
      method: 'GET',
      headers: { 'Origin': 'https://localhost:3000' }
    });
    const origin = res.headers['access-control-allow-origin'] || '';
    const passed = origin === 'https://localhost:3000' ? false : true;
    return { 
      expected: 'NOT https://localhost:3000', 
      actual: origin || '(not reflected)', 
      passed 
    };
  });

  // TC05
  await test_case('TC05', 'Origin: http://attacker.local → Should block', async () => {
    const res = await makeRequest({
      url: 'http://localhost:5000/api/items',
      method: 'GET',
      headers: { 'Origin': 'http://attacker.local' }
    });
    const origin = res.headers['access-control-allow-origin'] || '';
    const passed = origin === 'http://attacker.local' ? false : true;
    return { 
      expected: 'NOT http://attacker.local', 
      actual: origin || '(not reflected)', 
      passed 
    };
  });

  // ===== NHÓM 2: PREFLIGHT (TC06-TC10) =====
  console.log('\n--- NHÓM 2: PREFLIGHT (TC06-TC10) ---');

  // TC06
  await test_case('TC06', 'OPTIONS /api/cart, Method: POST → Allow', async () => {
    const res = await makeRequest({
      url: 'http://localhost:5000/api/cart',
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST'
      }
    });
    const methods = res.headers['access-control-allow-methods'] || '';
    const passed = methods.toUpperCase().includes('POST');
    return { expected: 'Contains POST', actual: methods, passed };
  });

  // TC07
  await test_case('TC07', 'OPTIONS /api/cart, Method: PUT → Allow', async () => {
    const res = await makeRequest({
      url: 'http://localhost:5000/api/cart',
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'PUT'
      }
    });
    const methods = res.headers['access-control-allow-methods'] || '';
    const passed = methods.toUpperCase().includes('PUT');
    return { expected: 'Contains PUT', actual: methods, passed };
  });

  // TC08 - CORS2: Missing Authorization header
  await test_case('TC08', 'OPTIONS + Authorization header (CORS2)', async () => {
    const res = await makeRequest({
      url: 'http://localhost:5000/api/cart',
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Headers': 'Authorization'
      }
    });
    const headers = res.headers['access-control-allow-headers'] || '';
    const passed = headers.includes('Authorization') || headers.includes('*');
    return { 
      expected: 'Contains Authorization', 
      actual: headers, 
      passed 
    };
  });

  // TC09
  await test_case('TC09', 'OPTIONS + Content-Type header → Allow', async () => {
    const res = await makeRequest({
      url: 'http://localhost:5000/api/cart',
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    const headers = res.headers['access-control-allow-headers'] || '';
    const passed = headers.includes('Content-Type') || headers.includes('*');
    return { expected: 'Contains Content-Type', actual: headers, passed };
  });

  // TC10 - CORS4: No Max-Age header
  await test_case('TC10', 'Check Access-Control-Max-Age (CORS4)', async () => {
    const res = await makeRequest({
      url: 'http://localhost:5000/api/cart',
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST'
      }
    });
    const maxAge = res.headers['access-control-max-age'] || '';
    const passed = maxAge !== '';
    return { expected: 'Max-Age present', actual: maxAge || '(not set)', passed };
  });

  // ===== NHÓM 3: CREDENTIALS & COOKIE (TC11-TC15) =====
  console.log('\n--- NHÓM 3: CREDENTIALS & COOKIE (TC11-TC15) ---');

  // TC11 - CORS5: credentials allowed with non-origin
  await test_case('TC11', 'Credentials from different origin (CORS5)', async () => {
    const loginRes = await makeRequest({
      url: 'http://localhost:5000/api/login',
      method: 'POST',
      headers: {
        'Origin': 'http://localhost:3000',
        'Content-Type': 'application/json'
      },
      body: { email: 'ram@xyz.com', password: 'password123' }
    });

    const apiRes = await makeRequest({
      url: 'http://localhost:5000/api/items',
      method: 'GET',
      headers: { 'Origin': 'http://evil.com' }
    });

    const creds = apiRes.headers['access-control-allow-credentials'] || '';
    const allowed = creds.toLowerCase() === 'true';
    const evilOrigin = apiRes.headers['access-control-allow-origin'] || '';
    // VULNERABLE if both evil origin AND credentials
    const passed = !(allowed && evilOrigin.includes('evil'));
    return { 
      expected: 'No credentials for evil origin', 
      actual: `cred:${creds}, origin:${evilOrigin}`, 
      passed 
    };
  });

  // TC12
  await test_case('TC12', 'Cookie SameSite attribute', async () => {
    const res = await makeRequest({
      url: 'http://localhost:5000/api/login',
      method: 'POST',
      headers: {
        'Origin': 'http://localhost:3000',
        'Content-Type': 'application/json'
      },
      body: { email: 'ram@xyz.com', password: 'password123' }
    });

    const setCookie = res.headers['set-cookie'] || [];
    const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    const passed = cookieStr.includes('SameSite');
    return { 
      expected: 'SameSite attribute',
      actual: cookieStr.substring(0, 50),
      passed 
    };
  });

  // TC13 - CORS3: No Secure flag
  await test_case('TC13', 'Cookie Secure flag (CORS3)', async () => {
    const res = await makeRequest({
      url: 'http://localhost:5000/api/login',
      method: 'POST',
      headers: {
        'Origin': 'http://localhost:3000',
        'Content-Type': 'application/json'
      },
      body: { email: 'ram@xyz.com', password: 'password123' }
    });

    const setCookie = res.headers['set-cookie'] || [];
    const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    const hasSecure = cookieStr.includes('Secure');
    // In HTTP dev, Secure won't be set - this is expected
    return { 
      expected: 'Secure flag present',
      actual: cookieStr.substring(0, 50),
      passed: !hasSecure ? false : true // FAIL if no Secure in production
    };
  });

  // TC14
  await test_case('TC14', 'Cookie HttpOnly flag', async () => {
    const res = await makeRequest({
      url: 'http://localhost:5000/api/login',
      method: 'POST',
      headers: {
        'Origin': 'http://localhost:3000',
        'Content-Type': 'application/json'
      },
      body: { email: 'ram@xyz.com', password: 'password123' }
    });

    const setCookie = res.headers['set-cookie'] || [];
    const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    const hasHttpOnly = cookieStr.toLowerCase().includes('httponly');
    return { 
      expected: 'HttpOnly flag',
      actual: cookieStr.substring(0, 50),
      passed: hasHttpOnly
    };
  });

  // TC15
  await test_case('TC15', 'Credentials + Origin "*" conflict', async () => {
    const res = await makeRequest({
      url: 'http://localhost:5000/api/items',
      method: 'OPTIONS',
      headers: { 'Origin': 'http://localhost:3000' }
    });

    const origin = res.headers['access-control-allow-origin'] || '';
    const credentials = res.headers['access-control-allow-credentials'] || '';
    const passed = !(origin === '*' && credentials.toLowerCase() === 'true');
    return { 
      expected: 'Not both * and true',
      actual: `${origin}, ${credentials}`,
      passed 
    };
  });

  // ===== NHÓM 4: NEGATIVE (TC16-TC20) =====
  console.log('\n--- NHÓM 4: NEGATIVE (TC16-TC20) ---');

  // TC16
  await test_case('TC16', 'Request without Origin → OK', async () => {
    const res = await makeRequest({
      url: 'http://localhost:5000/api/items',
      method: 'GET'
    });
    const passed = res.status === 200;
    return { expected: '200', actual: res.status, passed };
  });

  // TC17
  await test_case('TC17', 'PATCH method not supported', async () => {
    const res = await makeRequest({
      url: 'http://localhost:5000/api/cart',
      method: 'PATCH',
      headers: {
        'Origin': 'http://localhost:3000',
        'Content-Type': 'application/json'
      },
      body: { itemId: 1 }
    });

    const passed = [404, 405, 500].includes(res.status);
    return { expected: '405/404', actual: res.status, passed };
  });

  // TC18
  await test_case('TC18', 'Custom header in simple request', async () => {
    const res = await makeRequest({
      url: 'http://localhost:5000/api/items',
      method: 'GET',
      headers: {
        'Origin': 'http://localhost:3000',
        'X-Custom-Header': 'test'
      }
    });

    const passed = res.status === 200;
    return { expected: '200', actual: res.status, passed };
  });

  // TC19
  await test_case('TC19', 'Block malicious origin', async () => {
    const res = await makeRequest({
      url: 'http://localhost:5000/api/items',
      method: 'GET',
      headers: { 'Origin': 'http://malicious.com' }
    });

    const origin = res.headers['access-control-allow-origin'] || '';
    const passed = origin !== 'http://malicious.com' ? true : false;
    return { 
      expected: 'NOT malicious.com', 
      actual: origin || '(not reflected)', 
      passed 
    };
  });

  // TC20
  await test_case('TC20', 'Block unknown method', async () => {
    const res = await makeRequest({
      url: 'http://localhost:5000/api/items',
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'UNKNOWN'
      }
    });

    const methods = res.headers['access-control-allow-methods'] || '';
    const passed = !methods.toUpperCase().includes('UNKNOWN');
    return { expected: 'Not UNKNOWN', actual: methods, passed };
  });

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('BẢNG KẾT QUẢ');
  console.log('='.repeat(80));
  console.log('ID      Status   Expected                        Actual');
  console.log('-'.repeat(85));

  const passCount = results.filter(r => r.status === 'PASS').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;
  const errorCount = results.filter(r => r.status === 'ERROR').length;

  results.forEach(r => {
    const id = r.id.padEnd(7);
    const status = r.status.padEnd(8);
    const exp = r.expected.substring(0, 33).padEnd(35);
    const act = String(r.actual).substring(0, 33).padEnd(35);
    console.log(`${id}${status}${exp}${act}`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('TỔNG KẾT');
  console.log('='.repeat(80));
  console.log(`Tổng Test Cases: ${results.length}`);
  console.log(`✓ PASS: ${passCount}`);
  console.log(`✗ FAIL: ${failCount}`);
  console.log(`⚠ ERROR: ${errorCount}`);
  console.log(`Pass Rate: ${((passCount / results.length) * 100).toFixed(1)}%`);
  console.log('='.repeat(80));

  // Bug Analysis
  console.log('\nBUG ĐÃ PHÁT HIỆN:');
  const bugs = {
    'CORS1': 'Origin phản chiếu động (Vulnerable mode)',
    'CORS2': 'Thiếu kiểm tra Authorization header',
    'CORS3': 'Cookie không có Secure flag (dev mode)',
    'CORS4': 'Thiếu Access-Control-Max-Age',
    'CORS5': 'Credentials được phép với origin khác'
  };

  const failedTests = results.filter(r => r.status === 'FAIL').map(r => r.id);
  if (failedTests.includes('TC02')) console.log('  - CORS1: ' + bugs['CORS1']);
  if (failedTests.includes('TC08')) console.log('  - CORS2: ' + bugs['CORS2']);
  if (failedTests.includes('TC13')) console.log('  - CORS3: ' + bugs['CORS3']);
  if (failedTests.includes('TC10')) console.log('  - CORS4: ' + bugs['CORS4']);
  if (failedTests.includes('TC11')) console.log('  - CORS5: ' + bugs['CORS5']);

  process.exit(0);
}

runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
