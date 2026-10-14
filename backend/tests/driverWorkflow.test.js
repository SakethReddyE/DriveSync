/**
 * DriveSync — driver application + admin verification integration tests.
 *
 * Runs against an in-memory MongoDB (mongodb-memory-server) over the real
 * Express app via supertest. No production database is touched.
 *
 *   node --test tests/driverWorkflow.test.js
 */
const { describe, before, after, test } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');

// ── Env must be set BEFORE requiring the app ─────────────────────────────────
process.env.JWT_SECRET = 'test-secret-very-long-random-string-for-jwt-signing';
process.env.JWT_EXPIRES_IN = '1h';
process.env.ADMIN_EMAIL = 'admin@drivesync.test';
process.env.ADMIN_PASSWORD = 'adminpass123';
process.env.CLIENT_ORIGIN = '*';
// MONGO_URI is set after the in-memory server starts (below).

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Driver = require('../models/Driver');
const DriverDocument = require('../models/DriverDocument');
const User = require('../models/User');
const { app } = require('../server');

let mongo;
let adminToken;
let riderA, riderB; // { token, email, password }

// ── Helpers ─────────────────────────────────────────────────────────────────
let emailSeq = 0;
const uniqueEmail = () => `applicant${++emailSeq}@test.io`;

const validPdf = () => Buffer.concat([Buffer.from('%PDF-1.4\n%âãÏÓ'), Buffer.alloc(120, 0x20)]);
const validPng = () =>
  Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(80, 0x20)]);
const validJpg = () =>
  Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]), Buffer.alloc(80, 0x20)]);
const fakePdf = () => Buffer.from('GIF89a this is not really a PDF at all');

const applyFields = (extra = {}) => ({
  name: 'Test Driver',
  age: '30',
  phone: '9999900001',
  licence: 'TS09 20240001234',
  experience: '3–5 years',
  location: 'Madhapur',
  vehicleNumber: 'TS09 AB 1234',
  vehicleMake: 'Maruti Suzuki',
  vehicleModel: 'Swift Dzire',
  vehicleCategory: 'Sedan',
  ...extra,
});

const submitApplication = (token, file, fileExt, fields = applyFields(), expectStatus = 201) => {
  let r = request(app)
    .post('/api/drivers/apply')
    .set('Authorization', `Bearer ${token}`);
  Object.entries(fields).forEach(([k, v]) => {
    r = r.field(k, String(v));
  });
  if (file) r = r.attach('rcDocument', file, `rc.${fileExt}`);
  return r.expect(expectStatus);
};

before(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongo.getUri();
  await connectDB();

  // Admin token via unified login
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD })
    .expect(200);
  assert.equal(res.body.role, 'admin');
  adminToken = res.body.token;
});

after(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

// ── Tests ────────────────────────────────────────────────────────────────────
describe('Auth & roles', () => {
  test('GET /api/auth/me returns the admin profile with a valid admin token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    assert.equal(res.body.user.role, 'admin');
  });

  test('protected endpoint without token is rejected (401)', async () => {
    await request(app).get('/api/drivers/me').expect(401);
    await request(app).get('/api/admin/stats').expect(401);
  });

  test('a rider can sign up and /auth/me returns role user', async () => {
    const email = uniqueEmail();
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Rider A', email, phone: '9000000001', password: 'riderpass' })
      .expect(201);
    riderA = { token: res.body.token, email, password: 'riderpass' };
    const me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${riderA.token}`)
      .expect(200);
    assert.equal(me.body.user.role, 'user');
  });
});

describe('Driver application submission', () => {
  test('a logged-out visitor cannot apply (401)', async () => {
    await request(app).post('/api/drivers/apply').expect(401);
  });

  test('a rider submits a valid application with an RC PDF → 201 pending', async () => {
    const res = await submitApplication(riderA.token, validPdf(), 'pdf');
    assert.equal(res.body.success, true);
    assert.ok(res.body.driverId);

    const driver = await Driver.findById(res.body.driverId);
    assert.equal(driver.status, 'pending');
    assert.equal(driver.email, riderA.email); // email from trusted session
    assert.equal(driver.vehicleNumber, 'TS09 AB 1234');
    assert.equal(driver.vehicleCategory, 'Sedan');
    assert.ok(driver.rcDocument, 'RC document reference stored');
    assert.equal(driver.password, undefined, 'password never selected by default');

    const doc = await DriverDocument.findById(driver.rcDocument);
    assert.ok(doc, 'DriverDocument record created');
    assert.equal(doc.contentType, 'application/pdf');
    assert.ok(doc.data && doc.data.length > 0, 'file bytes persisted');
    assert.equal(doc.applicant.toString(), driver._id.toString());
  });

  test('PNG and JPEG RC uploads are accepted too', async () => {
    const e1 = uniqueEmail();
    const r1 = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Rider P', email: e1, phone: '9000000002', password: 'riderpass' })
      .expect(201);
    await submitApplication(r1.body.token, validPng(), 'png');

    const e2 = uniqueEmail();
    const r2 = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Rider J', email: e2, phone: '9000000003', password: 'riderpass' })
      .expect(201);
    await submitApplication(r2.body.token, validJpg(), 'jpg');
  });

  test('duplicate application by the same rider is rejected (409)', async () => {
    // riderA already applied above
    const res = await submitApplication(riderA.token, validPdf(), 'pdf', applyFields(), 409);
    assert.match(res.body.message, /under review/i);
  });

  test('missing RC file is rejected (400)', async () => {
    const e = uniqueEmail();
    const r = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Rider M', email: e, phone: '9000000004', password: 'riderpass' })
      .expect(201);
    const res = await submitApplication(r.body.token, null, 'pdf', applyFields(), 400);
    assert.match(res.body.message, /RC document is required/i);
  });

  test('file with spoofed extension (real content not PDF) is rejected (400)', async () => {
    const e = uniqueEmail();
    const r = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Rider S', email: e, phone: '9000000005', password: 'riderpass' })
      .expect(201);
    // Named rc.pdf but content is a GIF — magic bytes won't match.
    const res = await submitApplication(r.body.token, fakePdf(), 'pdf', applyFields(), 400);
    assert.match(res.body.message, /could not be verified|does not match/i);
  });

  test('unsupported file type (.exe) is rejected by the upload filter (400)', async () => {
    const e = uniqueEmail();
    const r = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Rider X', email: e, phone: '9000000006', password: 'riderpass' })
      .expect(201);
    const res = await request(app)
      .post('/api/drivers/apply')
      .set('Authorization', `Bearer ${r.body.token}`)
      .field('name', 'Test')
      .field('age', '30')
      .field('phone', '9999900001')
      .field('licence', 'TS09 1')
      .field('experience', '3–5 years')
      .field('location', 'X')
      .field('vehicleNumber', 'TS09 X1')
      .field('vehicleMake', 'M')
      .field('vehicleModel', 'S')
      .field('vehicleCategory', 'Sedan')
      .attach('rcDocument', Buffer.from('MZ\x90\x00binary'), 'rc.exe')
      .expect(400);
    assert.match(res.body.message, /unsupported file type/i);
  });

  test('oversized file (> 5 MB) is rejected (413)', async () => {
    const e = uniqueEmail();
    const r = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Rider L', email: e, phone: '9000000007', password: 'riderpass' })
      .expect(201);
    const big = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(6 * 1024 * 1024, 0x20)]);
    await request(app)
      .post('/api/drivers/apply')
      .set('Authorization', `Bearer ${r.body.token}`)
      .field('name', 'Test')
      .field('age', '30')
      .field('phone', '9999900001')
      .field('licence', 'TS09 1')
      .field('experience', '3–5 years')
      .field('location', 'X')
      .field('vehicleNumber', 'TS09 X1')
      .field('vehicleMake', 'M')
      .field('vehicleModel', 'S')
      .field('vehicleCategory', 'Sedan')
      .attach('rcDocument', big, 'big.pdf')
      .expect(413);
  });

  test('applicant can retrieve their own application status', async () => {
    const res = await request(app)
      .get('/api/drivers/my-application')
      .set('Authorization', `Bearer ${riderA.token}`)
      .expect(200);
    assert.equal(res.body.application.status, 'pending');
    assert.equal(res.body.application.hasRc, true);
    assert.equal(res.body.application.email, riderA.email);
    // No binary data leaks
    assert.equal(res.body.application.data, undefined);
  });

  test('a different rider sees no application (isolation)', async () => {
    const e = uniqueEmail();
    const r = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Rider B', email: e, phone: '9000000008', password: 'riderpass' })
      .expect(201);
    riderB = { token: r.body.token, email: e, password: 'riderpass' };
    const res = await request(app)
      .get('/api/drivers/my-application')
      .set('Authorization', `Bearer ${riderB.token}`)
      .expect(200);
    assert.equal(res.body.application, null);
  });
});

describe('Admin review & authorization', () => {
  let pendingDriver;

  test('a non-admin cannot list pending applications (403)', async () => {
    await request(app)
      .get('/api/admin/drivers/pending')
      .set('Authorization', `Bearer ${riderA.token}`)
      .expect(403);
  });

  test('admin can list pending applications', async () => {
    const res = await request(app)
      .get('/api/admin/drivers/pending')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    assert.ok(res.body.drivers.length >= 1);
    pendingDriver = res.body.drivers.find((d) => d.email === riderA.email);
    assert.ok(pendingDriver, 'riderA application appears in pending list');
    assert.equal(pendingDriver.password, undefined);
  });

  test('admin can fetch a single application detail', async () => {
    const res = await request(app)
      .get(`/api/admin/drivers/${pendingDriver._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    assert.equal(res.body.driver.vehicleNumber, 'TS09 AB 1234');
    assert.equal(res.body.driver.hasRc, undefined); // list/detail doesn't add hasRc
    assert.ok(res.body.driver.rcDocument);
  });

  test('a non-admin cannot download an applicant RC (403)', async () => {
    await request(app)
      .get(`/api/admin/drivers/${pendingDriver._id}/rc-document`)
      .set('Authorization', `Bearer ${riderA.token}`)
      .expect(403);
  });

  test('admin can download the RC document privately (correct content-type)', async () => {
    const res = await request(app)
      .get(`/api/admin/drivers/${pendingDriver._id}/rc-document`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    assert.equal(res.headers['content-type'], 'application/pdf');
    assert.ok(res.body.length > 0, 'binary body returned');
  });

  test('admin approval flips status to approved and records reviewer', async () => {
    const res = await request(app)
      .patch(`/api/admin/drivers/${pendingDriver._id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    assert.equal(res.body.driver.status, 'approved');
    assert.equal(res.body.driver.reviewedBy, process.env.ADMIN_EMAIL);
    assert.ok(res.body.driver.reviewedAt);
  });

  test('repeated approve is idempotent-safe (second returns 400, not approved twice)', async () => {
    await request(app)
      .patch(`/api/admin/drivers/${pendingDriver._id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });

  test('approved driver shows up in the active list, not pending', async () => {
    const pending = await request(app)
      .get('/api/admin/drivers/pending')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    assert.equal(pending.body.drivers.find((d) => d._id === pendingDriver._id), undefined);

    const active = await request(app)
      .get('/api/admin/drivers/active')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    assert.ok(active.body.drivers.find((d) => d._id === pendingDriver._id));
  });

  test('approved applicant can log in with the temp driver password (role driver)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: riderA.email, password: 'Drv@1234' })
      .expect(200);
    assert.equal(res.body.role, 'driver');
  });
});

describe('Rejection, login blocking & re-application', () => {
  let driverId;

  test('setup: a second rider applies', async () => {
    const e = uniqueEmail();
    const r = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Rider R', email: e, phone: '9000000009', password: 'riderpass' })
      .expect(201);
    riderB = { token: r.body.token, email: e, password: 'riderpass' };
    const res = await submitApplication(riderB.token, validPdf(), 'pdf');
    driverId = res.body.driverId;
  });

  test('admin reject stores rejected status + reason (non-destructive)', async () => {
    const res = await request(app)
      .patch(`/api/admin/drivers/${driverId}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ rejectionReason: 'RC image was unclear — please re-upload.' })
      .expect(200);
    assert.equal(res.body.driver.status, 'rejected');
    assert.match(res.body.driver.rejectionReason, /RC image was unclear/);

    const stillExists = await Driver.findById(driverId);
    assert.ok(stillExists, 'rejected application record is preserved (not deleted)');
    assert.equal(stillExists.status, 'rejected');
  });

  test('a rejected applicant cannot log in with the driver password (403)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: riderB.email, password: 'Drv@1234' })
      .expect(403);
    assert.match(res.body.message, /rejected/i);
  });

  test('a rejected applicant can still log in as a rider (fall-through)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: riderB.email, password: 'riderpass' })
      .expect(200);
    assert.equal(res.body.role, 'user');
  });

  test('applicant sees the rejection reason on their own application', async () => {
    const res = await request(app)
      .get('/api/drivers/my-application')
      .set('Authorization', `Bearer ${riderB.token}`)
      .expect(200);
    assert.equal(res.body.application.status, 'rejected');
    assert.match(res.body.application.rejectionReason, /RC image was unclear/);
  });

  test('rejection appears in the admin rejected list', async () => {
    const res = await request(app)
      .get('/api/admin/drivers/rejected')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    assert.ok(res.body.drivers.find((d) => d._id === driverId));
  });

  test('rejected applicant can re-apply (status reset to pending)', async () => {
    const res = await submitApplication(riderB.token, validPdf(), 'pdf', applyFields({ name: 'Rider R Updated' }), 200);
    assert.equal(res.body.success, true);
    const d = await Driver.findById(driverId);
    assert.equal(d.status, 'pending');
    assert.equal(d.rejectionReason, '');
    assert.equal(d.name, 'Rider R Updated');
  });

  test('cannot reject an already-approved application (invalid transition, 400)', async () => {
    // riderA was approved earlier; rejecting a non-pending application must fail.
    const active = await request(app)
      .get('/api/admin/drivers/active')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const approved = active.body.drivers.find((d) => d.email === riderA.email);
    assert.ok(approved, 'riderA should be approved');
    const res = await request(app)
      .patch(`/api/admin/drivers/${approved._id}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ rejectionReason: 'x' })
      .expect(400);
    assert.match(res.body.message, /not pending/i);
  });
});
