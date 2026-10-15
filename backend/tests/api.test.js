import request from 'supertest';
import app from '../server.js';

describe('Server & API Wiring Integration Tests', () => {
  test('GET /api/health returns 200 and healthy status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('Group Debt Optimiser Backend');
  });

  test('Protected routes reject unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('Protected group routes reject unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/groups');
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('Undefined routes return 404 JSON', async () => {
    const res = await request(app).get('/api/nonexistent-route');
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Cannot GET /api/nonexistent-route');
  });
});
