const request = require('supertest');

const BASE = process.env.API_BASE || 'http://localhost:5000';
const agent = request(BASE);

describe('API basic', () => {
  it('GET /api/items should return list', async () => {
    const res = await agent.get('/api/items');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /api/cart without login should be 401', async () => {
    const res = await agent.post('/api/cart').send({ itemId: 1 });
    expect([401, 400]).toContain(res.status);
  });

  it('POST /api/login then /api/cart should succeed', async () => {
    const login = await agent
      .post('/api/login')
      .set('Content-Type', 'application/json')
      .send({ email: 'ram@xyz.com', password: 'password123' });
    expect(login.status).toBe(200);
    const cookie = login.headers['set-cookie'] && login.headers['set-cookie'][0];
    expect(cookie).toBeTruthy();

    const add = await agent
      .post('/api/cart')
      .set('Cookie', cookie)
      .send({ itemId: 1 });
    expect([201, 409]).toContain(add.status);
  });
});

