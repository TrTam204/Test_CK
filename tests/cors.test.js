const request = require('supertest');

const BASE = process.env.API_BASE || 'http://localhost:5000';
const agent = request(BASE);

describe('CORS headers', () => {
  it('reflects valid origin with credentials allowed', async () => {
    const origin = 'http://localhost:3000';
    const res = await agent.get('/api/items').set('Origin', origin);
    expect(res.headers['access-control-allow-origin']).toBe(origin);
    expect(String(res.headers['access-control-allow-credentials']).toLowerCase()).toBe('true');
    expect(res.status).toBe(200);
  });

  it('handles fake origin still reflecting in vulnerable mode', async () => {
    const origin = 'http://evil.local';
    const res = await agent.get('/api/items').set('Origin', origin);
    expect(res.headers['access-control-allow-origin']).toBe(origin);
    expect(String(res.headers['access-control-allow-credentials']).toLowerCase()).toBe('true');
    expect(res.status).toBe(200);
  });
});

