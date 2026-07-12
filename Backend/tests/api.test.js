import dotenv from 'dotenv';
dotenv.config();

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Document from '../models/Document.js';
import Meeting from '../models/Meeting.js';

let mongoServer;
let authToken;
let userId;
let userId2;
let authToken2;

// ─── Setup & Teardown ────────────────────────────────────────────────────────

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  // Clean up test data between tests
  await User.deleteMany({ email: { $regex: '@test.nexus' } });
  await Transaction.deleteMany({});
  await Document.deleteMany({});
  await Meeting.deleteMany({});
});

// ─── Helper: Register and login user ─────────────────────────────────────────
const createAndLogin = async (email, role = 'entrepreneur') => {
  const regRes = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Test User', email, password: 'TestPass123!', role });

  if (regRes.status !== 201) {
    throw new Error(`Registration failed: ${JSON.stringify(regRes.body)}`);
  }

  return {
    token: regRes.body.data?.accessToken,
    id: regRes.body.data?.user?._id || regRes.body.data?.user?.id,
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Auth API', () => {
  test('POST /api/auth/register — should create user and return token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Alice', email: 'alice@test.nexus', password: 'StrongPass1!', role: 'entrepreneur' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data.user).toMatchObject({ email: 'alice@test.nexus', role: 'entrepreneur' });
  });

  test('POST /api/auth/register — should reject weak password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Bob', email: 'bob@test.nexus', password: 'weak', role: 'investor' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/auth/register — should reject duplicate email', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Dave', email: 'dup@test.nexus', password: 'StrongPass1!', role: 'entrepreneur' });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Dave2', email: 'dup@test.nexus', password: 'StrongPass1!', role: 'entrepreneur' });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/auth/login — should login with correct credentials', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Eve', email: 'eve@test.nexus', password: 'StrongPass1!', role: 'investor' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'eve@test.nexus', password: 'StrongPass1!' });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('accessToken');
  });

  test('POST /api/auth/login — should reject wrong password', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Frank', email: 'frank@test.nexus', password: 'StrongPass1!', role: 'entrepreneur' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'frank@test.nexus', password: 'WrongPass99!' });

    expect(res.status).toBe(401);
  });

  test('POST /api/auth/forgot-password — should send OTP for existing email', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Grace', email: 'grace@test.nexus', password: 'StrongPass1!', role: 'entrepreneur' });

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'grace@test.nexus' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PROFILE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Profile API', () => {
  beforeEach(async () => {
    const u = await createAndLogin('profile@test.nexus', 'entrepreneur');
    authToken = u.token;
    userId = u.id;
  });

  test('GET /api/profiles/me — should return current user profile', async () => {
    const res = await request(app)
      .get('/api/profiles/me')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  test('GET /api/profiles/me — should return 401 without token', async () => {
    const res = await request(app).get('/api/profiles/me');
    expect(res.status).toBe(401);
  });

  test('PUT /api/profiles/me — should update profile bio', async () => {
    const res = await request(app)
      .put('/api/profiles/me')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ bio: 'Building the future of fintech!' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MEETING TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Meeting API', () => {
  beforeEach(async () => {
    const u1 = await createAndLogin('host@test.nexus', 'entrepreneur');
    const u2 = await createAndLogin('attendee@test.nexus', 'investor');
    authToken = u1.token;
    userId = u1.id;
    authToken2 = u2.token;
    userId2 = u2.id;
  });

  test('POST /api/meetings — should create a meeting', async () => {
    const startTime = new Date(Date.now() + 86400000).toISOString(); // tomorrow
    const endTime = new Date(Date.now() + 90000000).toISOString();

    const res = await request(app)
      .post('/api/meetings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Pitch Meeting',
        description: 'Discussing Series A',
        startTime,
        endTime,
        attendee: userId2,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Pitch Meeting');
  });

  test('POST /api/meetings — should reject meeting with past start time', async () => {
    const res = await request(app)
      .post('/api/meetings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Old Meeting',
        startTime: new Date(Date.now() - 86400000).toISOString(),
        endTime: new Date(Date.now() - 80000000).toISOString(),
        attendee: userId2,
      });

    expect(res.status).toBe(400);
  });

  test('GET /api/meetings — should return user meetings', async () => {
    const res = await request(app)
      .get('/api/meetings')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DOCUMENT TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Document API', () => {
  beforeEach(async () => {
    const u = await createAndLogin('docuser@test.nexus', 'entrepreneur');
    authToken = u.token;
    userId = u.id;
  });

  test('GET /api/documents — should return empty array for new user', async () => {
    const res = await request(app)
      .get('/api/documents')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(0);
  });

  test('GET /api/documents — should return 401 without auth', async () => {
    const res = await request(app).get('/api/documents');
    expect(res.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PAYMENT TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Payment API', () => {
  beforeEach(async () => {
    const u = await createAndLogin('payuser@test.nexus', 'investor');
    authToken = u.token;
    userId = u.id;
  });

  test('GET /api/payments/balance — should return zeroed balance for new user', async () => {
    const res = await request(app)
      .get('/api/payments/balance')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      availableBalance: 0,
      pendingBalance: 0,
      totalInvested: 0,
      totalReceived: 0,
    });
  });

  test('GET /api/payments/ledger — should return empty transactions for new user', async () => {
    const res = await request(app)
      .get('/api/payments/ledger')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('POST /api/payments/intent — should create sandbox payment intent', async () => {
    const res = await request(app)
      .post('/api/payments/intent')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ amount: 1000, currency: 'usd', description: 'Test investment', type: 'investment' });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('clientSecret');
    expect(res.body.data).toHaveProperty('transactionId');
    expect(res.body.data.isMock).toBe(true);
  });

  test('POST /api/payments/intent then /confirm — should complete transaction', async () => {
    const intentRes = await request(app)
      .post('/api/payments/intent')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ amount: 500, currency: 'usd', type: 'investment' });

    const txId = intentRes.body.data.transactionId;

    const confirmRes = await request(app)
      .post('/api/payments/confirm')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ transactionId: txId });

    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.data.status).toBe('completed');
  });

  test('POST /api/payments/intent — should reject zero amount', async () => {
    const res = await request(app)
      .post('/api/payments/intent')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ amount: 0, currency: 'usd' });

    expect(res.status).toBe(400);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Notification API', () => {
  beforeEach(async () => {
    const u = await createAndLogin('notifuser@test.nexus', 'entrepreneur');
    authToken = u.token;
    userId = u.id;
  });

  test('GET /api/notifications — should return empty array for new user', async () => {
    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
