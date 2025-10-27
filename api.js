const express = require('express');
const { ObjectId } = require('mongodb');
const crypto = require('crypto');
const sgMail = require('@sendgrid/mail');
const jwt = require('jsonwebtoken');
const token = require('./createJWT.js');

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} else {
  sgMail.send = async () => {};
}

const FROM = process.env.SENDGRID_FROM;
const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
const BACKEND_BASE_URL  = process.env.BACKEND_BASE_URL  || 'http://localhost:5000';
const DEBUG_EMAIL = process.env.DEBUG_EMAIL === 'true';

const sixDigit = () => String(crypto.randomInt(100000, 1000000));
const token24  = () => crypto.randomBytes(24).toString('hex');
function parseDate(value) { if (!value) return null; const d = new Date(value); return isNaN(d.getTime()) ? null : d; }
function normalizePriority(p) { const v = String(p || '').toLowerCase(); if (v==='high')return 'High'; if (v==='medium')return 'Medium'; if (v==='low')return 'Low'; return 'Low'; }
function startOfDay(d=new Date()){const x=new Date(d); x.setHours(0,0,0,0); return x;}
function endOfDay(d=new Date()){const x=new Date(d); x.setHours(23,59,59,999); return x;}
function addDays(d,n){const x=new Date(d); x.setDate(x.getDate()+n); return x;}
function daysAgo(n){const x=new Date(); x.setDate(x.getDate()-n); return x;}

async function sendVerifyEmail({ to, code, link }) {
  if (!to) return;
  const templateId = process.env.SENDGRID_TEMPLATE_VERIFY;
  if (templateId) {
    await sgMail.send({ to, from: FROM, templateId, dynamic_template_data: { code, link } });
  } else {
    await sgMail.send({ to, from: FROM, subject: 'Verify your email', html: `<p>Your verification code is <b>${code}</b> (valid 15 minutes).</p><p>Or click to verify: <a href="${link}">${link}</a></p>` });
  }
}
async function sendResetEmail({ to, code, link }) {
  if (!to) return;
  const templateId = process.env.SENDGRID_TEMPLATE_RESET;
  if (templateId) {
    await sgMail.send({ to, from: FROM, templateId, dynamic_template_data: { code, link } });
  } else {
    await sgMail.send({ to, from: FROM, subject: 'Reset your password', html: `<p>Your reset code is <b>${code}</b> (valid 15 minutes).</p><p>Or reset via link: <a href="${link}">${link}</a></p>` });
  }
}

function getToken(req) {
  const b = req.body || {};
  const h = req.headers?.authorization || req.headers?.Authorization || '';
  if (b.jwtToken) return b.jwtToken;
  if (b.accessToken) return b.accessToken;
  if (typeof h === 'string' && h.toLowerCase().startsWith('bearer ')) return h.slice(7).trim();
  return null;
}
function decodeJwtUser(jwtToken) {
  if (!jwtToken) return null;
  try { if (typeof token.decodeToken === 'function') return token.decodeToken(jwtToken); } catch {}
  try { return jwt.verify(jwtToken, process.env.ACCESS_TOKEN_SECRET); } catch {}
  try { return jwt.decode(jwtToken); } catch { return null; }
}
function extractUserId(decoded) {
  if (!decoded) return null;
  return decoded.id ?? decoded.userId ?? decoded.UserID ?? decoded.userID ?? decoded._id ?? null;
}
function ownerFilter(userId) {
  const n = Number(userId);
  const s = String(userId);
  return { $or: [{ UserID: n }, { UserID: s }] };
}
function requireJwt(req, res) {
  const jwtToken = getToken(req);
  try {
    if (!jwtToken || token.isExpired(jwtToken)) {
      return { ok:false, end: res.status(200).json({ error: 'The JWT is no longer valid', jwtToken: '' }) };
    }
    const refreshed = token.refresh(jwtToken);
    const decoded = decodeJwtUser(jwtToken);
    const authUserId = extractUserId(decoded);
    if (authUserId === null || typeof authUserId === 'undefined') {
      return { ok:false, end: res.status(401).json({ error: 'Unable to determine user from token', jwtToken: '' }) };
    }
    return { ok:true, refreshedToken: refreshed.accessToken, authUserId };
  } catch {
    return { ok:false, end: res.status(200).json({ error: 'The JWT is no longer valid', jwtToken: '' }) };
  }
}

exports.setApp = function setApp(app, client) {
  const db = app.locals.db || client.db(process.env.DB_NAME || 'TodoApp');

  /**
   * POST /api/login
   * Purpose: Authenticate a user and return a jwtToken for subsequent requests.
   * incoming: { login: string, password: string }
   * outgoing: { id, firstName, lastName, jwtToken, error }
   */
  app.post('/api/login', async (req, res) => {
    const { login, password } = req.body;
    try {
      const user = await db.collection('Users').findOne({ Login: login, Password: password });
      if (!user) return res.status(200).json({ id: -1, firstName: '', lastName: '', error: 'Invalid user name/password', jwtToken: '' });
      if (user.EmailVerified === false) return res.status(200).json({ id: -1, firstName: '', lastName: '', error: 'Please verify your email before logging in.', jwtToken: '' });
      const t = token.createToken(user.FirstName || '', user.LastName || '', user.UserID ?? user._id);
      return res.status(200).json({ id: user.UserID ?? user._id, firstName: user.FirstName||'', lastName: user.LastName||'', jwtToken: t.accessToken, error: '' });
    } catch (e) {
      return res.status(500).json({ id: -1, firstName:'', lastName:'', jwtToken:'', error: e.toString() });
    }
  });

  /**
   * POST /api/register
   * Purpose: Create a new user, send verification email, and return a pending-session jwtToken.
   * incoming: { firstName, lastName, login, password, email }
   * outgoing: { id, firstName, lastName, jwtToken, error }
   */
  app.post('/api/register', async (req, res) => {
    const { firstName, lastName, email, login, password } = req.body;
    if (!firstName || !lastName || !login || !password || !email) {
      return res.status(400).json({ id: -1, firstName: '', lastName: '', jwtToken: '', error: 'firstName, lastName, login, password, and email are required' });
    }
    try {
      const Users = db.collection('Users');
      const existing = await Users.findOne({
        $or: [
          { Login: login },
          { Email: new RegExp(`^${String(email).replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') }
        ]
      });
      if (existing) {
        const field = existing.Login === login ? 'login' : 'email';
        return res.status(200).json({ id: -1, firstName: '', lastName: '', jwtToken: '', error: `An account with that ${field} already exists` });
      }

      const last = await Users.find({ UserID: { $type: 'number' } }).project({ UserID: 1 }).sort({ UserID: -1 }).limit(1).toArray();
      const nextUserId = (last[0]?.UserID || 0) + 1;

      const now = new Date();
      const newUser = {
        UserID: nextUserId,
        FirstName: String(firstName).trim(),
        LastName: String(lastName).trim(),
        Login: String(login).trim(),
        Password: String(password),
        Email: String(email).trim(),
        EmailVerified: false,
        CreatedAt: now,
        UpdatedAt: now
      };
      const ins = await Users.insertOne(newUser);

      const code = sixDigit(); const vtoken = token24(); const expires = new Date(Date.now() + 15*60*1000);
      await Users.updateOne({ _id: ins.insertedId }, { $set: { VerificationCode: code, VerificationToken: vtoken, VerificationExpires: expires } });
      const link = `${BACKEND_BASE_URL}/api/verify-email-link?login=${encodeURIComponent(newUser.Login)}&token=${vtoken}`;
      try { await sendVerifyEmail({ to: newUser.Email, code, link }); } catch {}

      const t = token.createToken(newUser.FirstName, newUser.LastName, newUser.UserID ?? ins.insertedId);
      return res.status(200).json({ id: newUser.UserID ?? ins.insertedId, firstName: newUser.FirstName, lastName: newUser.LastName, jwtToken: t.accessToken, error: '' });
    } catch (e) {
      return res.status(500).json({ id: -1, firstName: '', lastName: '', jwtToken: '', error: e.toString() });
    }
  });

  /**
   * POST /api/request-email-verification
   * Purpose: Issue a new verification code/token and email it to the user.
   * incoming: { login } OR { email }
   * outgoing: { sent, error }
   */
  app.post('/api/request-email-verification', async (req, res) => {
    const { login, email } = req.body;
    if (!login && !email) return res.status(400).json({ sent: false, error: 'login or email is required' });
    try {
      const u = await db.collection('Users').findOne(login ? { Login: login } : { Email: email });
      if (!u) return res.status(200).json({ sent: false, error: 'user not found' });
      if (!u.Email) return res.status(200).json({ sent: false, error: 'user has no email' });

      const code = sixDigit(); const vtoken = token24(); const expires = new Date(Date.now()+15*60*1000);
      await db.collection('Users').updateOne({ _id: u._id }, { $set: { EmailVerified: false, VerificationCode: code, VerificationToken: vtoken, VerificationExpires: expires } });
      const link = `${BACKEND_BASE_URL}/api/verify-email-link?login=${encodeURIComponent(u.Login)}&token=${vtoken}`;
      await sendVerifyEmail({ to: u.Email, code, link });

      return res.status(200).json({ sent: true, ...(DEBUG_EMAIL ? { code, link } : {}), error: '' });
    } catch (e) {
      return res.status(500).json({ sent: false, error: e.toString() });
    }
  });

  /**
   * POST /api/verify-email
   * Purpose: Confirm email ownership via 6-digit code and mark user as verified.
   * incoming: { login, code }
   * outgoing: { verified, error }
   */
  app.post('/api/verify-email', async (req, res) => {
    const { login, code } = req.body;
    if (!login || !code) return res.status(400).json({ verified: false, error: 'login and code are required' });
    try {
      const u = await db.collection('Users').findOne({ Login: login });
      if (!u) return res.status(200).json({ verified: false, error: 'user not found' });
      if (u.EmailVerified) return res.status(200).json({ verified: true, error: '' });
      if (!u.VerificationCode || !u.VerificationExpires) return res.status(200).json({ verified: false, error: 'no code requested' });
      if (new Date() > new Date(u.VerificationExpires)) return res.status(200).json({ verified: false, error: 'code expired' });
      if (String(u.VerificationCode) !== String(code)) return res.status(200).json({ verified: false, error: 'invalid code' });

      await db.collection('Users').updateOne({ _id: u._id }, { $set: { EmailVerified: true }, $unset: { VerificationCode: '', VerificationToken: '', VerificationExpires: '' } });
      return res.status(200).json({ verified: true, error: '' });
    } catch (e) {
      return res.status(500).json({ verified: false, error: e.toString() });
    }
  });

  /**
   * GET /api/verify-email-link
   * Purpose: Confirm email ownership via one-click magic link and redirect to frontend.
   * query: ?login=<string>&token=<string>
   */
  app.get('/api/verify-email-link', async (req, res) => {
    const { login, token: vtoken } = req.query;
    if (!login || !vtoken) return res.status(400).send('Missing login or token');
    try {
      const u = await db.collection('Users').findOne({ Login: login });
      if (!u) return res.status(404).send('User not found');
      if (!u.VerificationToken || !u.VerificationExpires) return res.status(400).send('No token issued');
      if (new Date() > new Date(u.VerificationExpires)) return res.status(400).send('Token expired');
      if (String(u.VerificationToken) !== String(vtoken)) return res.status(400).send('Invalid token');

      await db.collection('Users').updateOne({ _id: u._id }, { $set: { EmailVerified: true }, $unset: { VerificationCode: '', VerificationToken: '', VerificationExpires: '' } });
      return res.redirect(`${FRONTEND_BASE_URL}/?verified=1`);
    } catch {
      return res.status(500).send('Server error');
    }
  });

  /**
   * POST /api/request-password-reset
   * Purpose: Send a password reset code/token to the user’s email.
   * incoming: { login } OR { email }
   * outgoing: { sent, error }
   */
  app.post('/api/request-password-reset', async (req, res) => {
    const { login, email } = req.body;
    if (!login && !email) return res.status(400).json({ sent: false, error: 'login or email is required' });
    try {
      const u = await db.collection('Users').findOne(login ? { Login: login } : { Email: email });
      if (!u) return res.status(200).json({ sent: false, error: 'user not found' });
      if (!u.Email) return res.status(200).json({ sent: false, error: 'user has no email' });

      const code = sixDigit(); const rtoken = token24(); const expires = new Date(Date.now()+15*60*1000);
      await db.collection('Users').updateOne({ _id: u._id }, { $set: { ResetCode: code, ResetToken: rtoken, ResetExpires: expires } });
      const link = `${FRONTEND_BASE_URL}/reset-password?login=${encodeURIComponent(u.Login)}&token=${rtoken}`;
      await sendResetEmail({ to: u.Email, code, link });

      return res.status(200).json({ sent: true, ...(DEBUG_EMAIL ? { code, link } : {}), error: '' });
    } catch (e) {
      return res.status(500).json({ sent: false, error: e.toString() });
    }
  });

  /**
   * POST /api/reset-password-with-code
   * Purpose: Change password using a 6-digit code.
   * incoming: { login, code, newPassword }
   * outgoing: { error }
   */
  app.post('/api/reset-password-with-code', async (req, res) => {
    const { login, code, newPassword } = req.body;
    if (!login || !code || !newPassword) return res.status(400).json({ error: 'login, code, newPassword required' });
    try {
      const u = await db.collection('Users').findOne({ Login: login });
      if (!u) return res.status(200).json({ error: 'user not found' });
      if (!u.ResetCode || !u.ResetExpires) return res.status(200).json({ error: 'no reset requested' });
      if (new Date() > new Date(u.ResetExpires)) return res.status(200).json({ error: 'code expired' });
      if (String(u.ResetCode) !== String(code)) return res.status(200).json({ error: 'invalid code' });

      await db.collection('Users').updateOne({ _id: u._id }, { $set: { Password: newPassword }, $unset: { ResetCode: '', ResetToken: '', ResetExpires: '' } });
      return res.status(200).json({ error: '' });
    } catch (e) {
      return res.status(500).json({ error: e.toString() });
    }
  });

  /**
   * POST /api/reset-password-with-token
   * Purpose: Change password using a reset token (magic link flow).
   * incoming: { login, token, newPassword }
   * outgoing: { error }
   */
  app.post('/api/reset-password-with-token', async (req, res) => {
    const { login, token: rtoken, newPassword } = req.body;
    if (!login || !rtoken || !newPassword) return res.status(400).json({ error: 'login, token, newPassword required' });
    try {
      const u = await db.collection('Users').findOne({ Login: login });
      if (!u) return res.status(200).json({ error: 'user not found' });
      if (!u.ResetToken || !u.ResetExpires) return res.status(200).json({ error: 'no reset requested' });
      if (new Date() > new Date(u.ResetExpires)) return res.status(200).json({ error: 'token expired' });
      if (String(u.ResetToken) !== String(rtoken)) return res.status(200).json({ error: 'invalid token' });

      await db.collection('Users').updateOne({ _id: u._id }, { $set: { Password: newPassword }, $unset: { ResetCode: '', ResetToken: '', ResetExpires: '' } });
      return res.status(200).json({ error: '' });
    } catch (e) {
      return res.status(500).json({ error: e.toString() });
    }
  });

  /**
   * POST /api/addtodo
   * Purpose: Create a todo for a user (must match token user).
   * incoming: { userId, title, description?, createdAt?, dueDate?, priority?, jwtToken }
   * outgoing: { id, error, jwtToken }
   */
  app.post('/api/addtodo', async (req, res) => {
    const guard = requireJwt(req, res); if (!guard.ok) return guard.end;
    const { userId, title, description, createdAt, dueDate, priority } = req.body;
    if (!userId || !title) return res.status(400).json({ id: null, error: 'userId and title are required', jwtToken: '' });
    if (String(userId) !== String(guard.authUserId)) {
      return res.status(403).json({ id: null, error: 'Not authorized for this user', jwtToken: guard.refreshedToken });
    }

    const doc = {
      UserID: Number(userId) || userId,
      Title: String(title).trim(),
      Description: description ? String(description).trim() : '',
      Completed: false,
      CreatedAt: createdAt ? new Date(createdAt) : new Date(),
      DueDate: parseDate(dueDate),
      Priority: normalizePriority(priority)
    };
    try {
      const r = await db.collection('Todos').insertOne(doc);
      return res.status(200).json({ id: r.insertedId, error: '', jwtToken: guard.refreshedToken });
    } catch (e) {
      return res.status(500).json({ id: null, error: e.toString(), jwtToken: '' });
    }
  });

  /**
   * POST /api/deletetodo
   * Purpose: Remove a todo by its id (only if owned by token user).
   * incoming: { id, jwtToken }
   * outgoing: { deletedCount, error, jwtToken }
   */
  app.post('/api/deletetodo', async (req, res) => {
    const guard = requireJwt(req, res); if (!guard.ok) return guard.end;
    const { id } = req.body;
    if (!id) return res.status(400).json({ deletedCount: 0, error: 'id is required', jwtToken: '' });
    if (!ObjectId.isValid(id)) return res.status(400).json({ deletedCount: 0, error: 'invalid id format', jwtToken: '' });
    try {
      const r = await db.collection('Todos').deleteOne({ _id: new ObjectId(id), ...ownerFilter(guard.authUserId) });
      if (r.deletedCount === 0) {
        return res.status(403).json({ deletedCount: 0, error: 'Not authorized to delete this todo', jwtToken: guard.refreshedToken });
      }
      return res.status(200).json({ deletedCount: r.deletedCount, error: '', jwtToken: guard.refreshedToken });
    } catch (e) {
      return res.status(500).json({ deletedCount: 0, error: e.toString(), jwtToken: '' });
    }
  });

  /**
   * POST /api/edittodo
   * Purpose: Update fields of a todo (only if owned by token user).
   * incoming: { id, title?, description?, dueDate?(null to clear), priority?, completed?, jwtToken }
   * outgoing: { modifiedCount, error, jwtToken }
   */
  app.post('/api/edittodo', async (req, res) => {
    const guard = requireJwt(req, res); if (!guard.ok) return guard.end;
    const { id, title, description, dueDate, priority, completed } = req.body;
    if (!id) return res.status(400).json({ modifiedCount: 0, error: 'id is required', jwtToken: '' });
    if (!ObjectId.isValid(id)) return res.status(400).json({ modifiedCount: 0, error: 'invalid id format', jwtToken: '' });

    const $set = {}; const $unset = {};
    if (typeof title === 'string') $set.Title = title.trim();
    if (typeof description === 'string') $set.Description = description.trim();
    if (typeof completed === 'boolean') $set.Completed = completed;

    if (dueDate === null) $unset.DueDate = '';
    else if (typeof dueDate !== 'undefined') {
      const d = parseDate(dueDate);
      if (!d) return res.status(400).json({ modifiedCount: 0, error: 'dueDate is invalid', jwtToken: '' });
      $set.DueDate = d;
    }
    if (typeof priority !== 'undefined') $set.Priority = normalizePriority(priority);
    if (!Object.keys($set).length && !Object.keys($unset).length) {
      return res.status(400).json({ modifiedCount: 0, error: 'no fields to update', jwtToken: '' });
    }

    try {
      const r = await db.collection('Todos').updateOne(
        { _id: new ObjectId(id), ...ownerFilter(guard.authUserId) },
        { ...(Object.keys($set).length ? { $set } : {}), ...(Object.keys($unset).length ? { $unset } : {}) }
      );
      if (r.matchedCount === 0) {
        return res.status(403).json({ modifiedCount: 0, error: 'Not authorized to edit this todo', jwtToken: guard.refreshedToken });
      }
      return res.status(200).json({ modifiedCount: r.modifiedCount, error: '', jwtToken: guard.refreshedToken });
    } catch (e) {
      return res.status(500).json({ modifiedCount: 0, error: e.toString(), jwtToken: '' });
    }
  });

  /**
   * POST /api/gettodos
   * Purpose: Fetch all todos for the authenticated user.
   * incoming: { userId, jwtToken }
   * outgoing: { results: [{ title, description, completed, createdAt, dueDate, priority, id }], error, jwtToken }
   */
  app.post('/api/gettodos', async (req, res) => {
    const guard = requireJwt(req, res); if (!guard.ok) return guard.end;
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ results: [], error: 'userId is required', jwtToken: '' });
    if (String(userId) !== String(guard.authUserId)) {
      return res.status(403).json({ results: [], error: 'Not authorized for this user', jwtToken: guard.refreshedToken });
    }
    try {
      const results = await db.collection('Todos').find(ownerFilter(guard.authUserId)).sort({ CreatedAt: -1 }).toArray();
      const formatted = results.map(t => ({
        title: t.Title,
        description: t.Description,
        completed: t.Completed,
        createdAt: t.CreatedAt,
        dueDate: t.DueDate,
        priority: t.Priority,
        id: t._id
      }));
      return res.status(200).json({ results: formatted, error: '', jwtToken: guard.refreshedToken });
    } catch (e) {
      return res.status(500).json({ results: [], error: e.toString(), jwtToken: '' });
    }
  });

  /**
   * POST /api/check
   * Purpose: Toggle a todo’s completion status (only if owned by token user).
   * incoming: { id, jwtToken }
   * outgoing: { modifiedCount, newStatus, error, jwtToken }
   */
  app.post('/api/check', async (req, res) => {
    const guard = requireJwt(req, res); if (!guard.ok) return guard.end;
    const { id } = req.body;
    if (!id) return res.status(400).json({ modifiedCount: 0, error: 'id is required', jwtToken: '' });
    if (!ObjectId.isValid(id)) return res.status(400).json({ modifiedCount: 0, error: 'invalid id format', jwtToken: '' });
    try {
      const coll = db.collection('Todos');
      const todo = await coll.findOne({ _id: new ObjectId(id), ...ownerFilter(guard.authUserId) }, { projection: { Completed: 1 } });
      if (!todo) return res.status(403).json({ modifiedCount: 0, error: 'Not authorized to modify this todo', jwtToken: guard.refreshedToken });
      const newStatus = !Boolean(todo.Completed);
      const update = newStatus
        ? { $set: { Completed: true, CompletedAt: new Date() } }
        : { $set: { Completed: false }, $unset: { CompletedAt: '' } };
      const r = await coll.updateOne({ _id: new ObjectId(id), ...ownerFilter(guard.authUserId) }, update);
      return res.status(200).json({ modifiedCount: r.modifiedCount, newStatus, error: '', jwtToken: guard.refreshedToken });
    } catch (e) {
      return res.status(500).json({ modifiedCount: 0, error: e.toString(), jwtToken: '' });
    }
  });

  /**
   * POST /api/check-bulk
   * Purpose: Set multiple todos to a specific completed state (true/false) for the authenticated user.
   * incoming: { ids: string[], completed: boolean, jwtToken }
   * outgoing: { modifiedCount, error, jwtToken }
   */
  app.post('/api/check-bulk', async (req, res) => {
    const guard = requireJwt(req, res); if (!guard.ok) return guard.end;
    const { ids, completed } = req.body;
    if (!Array.isArray(ids) || typeof completed !== 'boolean') {
      return res.status(400).json({ modifiedCount: 0, error: 'ids[] and completed(boolean) required', jwtToken: '' });
    }
    const valid = ids.filter(ObjectId.isValid).map(id => new ObjectId(id));
    if (!valid.length) return res.status(400).json({ modifiedCount: 0, error: 'no valid ids', jwtToken: '' });
    try {
      const r = await db.collection('Todos').updateMany(
        { _id: { $in: valid }, ...ownerFilter(guard.authUserId) },
        completed ? { $set: { Completed: true } } : { $set: { Completed: false }, $unset: { CompletedAt: '' } }
      );
      return res.status(200).json({ modifiedCount: r.modifiedCount, error: '', jwtToken: guard.refreshedToken });
    } catch (e) {
      return res.status(500).json({ modifiedCount: 0, error: e.toString(), jwtToken: '' });
    }
  });

  /**
   * POST /api/next-day
   * Purpose: Move a todo’s due date forward by one day (only if owned by token user).
   * incoming: { id, jwtToken }
   * outgoing: { modifiedCount, newDueDate, error, jwtToken }
   */
  app.post('/api/next-day', async (req, res) => {
    const guard = requireJwt(req, res); if (!guard.ok) return guard.end;
    const { id } = req.body;
    if (!id) return res.status(400).json({ modifiedCount: 0, newDueDate: null, error: 'id is required', jwtToken: '' });
    if (!ObjectId.isValid(id)) return res.status(400).json({ modifiedCount: 0, newDueDate: null, error: 'invalid id format', jwtToken: '' });
    try {
      const coll = db.collection('Todos');
      const todo = await coll.findOne({ _id: new ObjectId(id), ...ownerFilter(guard.authUserId) }, { projection: { DueDate: 1 } });
      if (!todo) return res.status(403).json({ modifiedCount: 0, newDueDate: null, error: 'Not authorized to modify this todo', jwtToken: guard.refreshedToken });
      const newDue = todo.DueDate ? addDays(new Date(todo.DueDate), 1) : endOfDay(addDays(new Date(), 1));
      const r = await coll.updateOne({ _id: new ObjectId(id), ...ownerFilter(guard.authUserId) }, { $set: { DueDate: newDue } });
      return res.status(200).json({ modifiedCount: r.modifiedCount, newDueDate: newDue, error: '', jwtToken: guard.refreshedToken });
    } catch (e) {
      return res.status(500).json({ modifiedCount: 0, newDueDate: null, error: e.toString(), jwtToken: '' });
    }
  });

  /**
   * POST /api/current
   * Purpose: Return categorized, incomplete todos for the authenticated user.
   * incoming: { userId, days?, jwtToken }
   * outgoing: { counts, overdue, today, upcoming, noDue, error, jwtToken }
   */
  app.post('/api/current', async (req, res) => {
    const guard = requireJwt(req, res); if (!guard.ok) return guard.end;
    const { userId, days = 7 } = req.body;
    if (!userId) {
      return res.status(400).json({ counts: {}, overdue: [], today: [], upcoming: [], noDue: [], error: 'userId is required', jwtToken: '' });
    }
    if (String(userId) !== String(guard.authUserId)) {
      return res.status(403).json({ counts: {}, overdue: [], today: [], upcoming: [], noDue: [], error: 'Not authorized for this user', jwtToken: guard.refreshedToken });
    }
    try {
      const tasks = await db.collection('Todos').find(ownerFilter(guard.authUserId)).toArray();
      const now = new Date();
      const todayStart = startOfDay(now);
      const todayEnd   = endOfDay(now);
      const upcomingEnd = endOfDay(addDays(now, Number(days)));
      const overdue = [], today = [], upcoming = [], noDue = [];
      for (const t of tasks) {
        const due = t.DueDate ? new Date(t.DueDate) : null;
        if (!due) noDue.push(t);
        else if (due < todayStart) overdue.push(t);
        else if (due <= todayEnd) today.push(t);
        else if (due <= upcomingEnd) upcoming.push(t);
        else upcoming.push(t);
      }
      const byDueAsc = (a,b)=> new Date(a.DueDate) - new Date(b.DueDate);
      const byCreatedDesc = (a,b)=> new Date(b.CreatedAt || 0) - new Date(a.CreatedAt || 0);
      overdue.sort(byDueAsc); today.sort(byDueAsc); upcoming.sort(byDueAsc); noDue.sort(byCreatedDesc);
      const counts = { overdue: overdue.length, today: today.length, upcoming: upcoming.length, noDue: noDue.length, total: tasks.length };
      return res.status(200).json({ counts, overdue, today, upcoming, noDue, error: '', jwtToken: guard.refreshedToken });
    } catch (e) {
      return res.status(500).json({ counts: {}, overdue: [], today: [], upcoming: [], noDue: [], error: e.toString(), jwtToken: '' });
    }
  });

  /**
   * POST /api/previous
   * Purpose: Return categorized, recently completed todos for the authenticated user.
   * incoming: { userId, limit?, includeNoTimestamp?, jwtToken }
   * outgoing: { counts, today, yesterday, last7, last30, older, noTimestamp, error, jwtToken }
   */
  app.post('/api/previous', async (req, res) => {
    const guard = requireJwt(req, res); if (!guard.ok) return guard.end;
    const { userId, limit = 100, includeNoTimestamp = true } = req.body;
    if (!userId) {
      return res.status(400).json({
        counts: {}, today: [], yesterday: [], last7: [], last30: [], older: [], noTimestamp: [],
        error: 'userId is required', jwtToken: ''
      });
    }
    if (String(userId) !== String(guard.authUserId)) {
      return res.status(403).json({
        counts: {}, today: [], yesterday: [], last7: [], last30: [], older: [], noTimestamp: [],
        error: 'Not authorized for this user', jwtToken: guard.refreshedToken
      });
    }
    try {
      const tasks = await db.collection('Todos')
        .find({ ...ownerFilter(guard.authUserId), Completed: true })
        .sort({ CompletedAt: -1, DueDate: -1, CreatedAt: -1 })
        .limit(Number(limit))
        .toArray();

      const now = new Date();
      const todayStart = startOfDay(now), todayEnd = endOfDay(now);
      const yStart = startOfDay(daysAgo(1)), yEnd = endOfDay(daysAgo(1));
      const last7Start = startOfDay(daysAgo(7)), last30Start = startOfDay(daysAgo(30));

      const today = [], yesterday = [], last7 = [], last30 = [], older = [], noTimestamp = [];
      for (const t of tasks) {
        const completedAt = t.CompletedAt ? new Date(t.CompletedAt) : null;
        if (!completedAt) { if (includeNoTimestamp) noTimestamp.push(t); continue; }
        if (completedAt >= todayStart && completedAt <= todayEnd) today.push(t);
        else if (completedAt >= yStart && completedAt <= yEnd) yesterday.push(t);
        else if (completedAt > yEnd && completedAt >= last7Start) last7.push(t);
        else if (completedAt < last7Start && completedAt >= last30Start) last30.push(t);
        else older.push(t);
      }

      const counts = {
        today: today.length, yesterday: yesterday.length, last7: last7.length,
        last30: last30.length, older: older.length, noTimestamp: noTimestamp.length, total: tasks.length
      };
      return res.status(200).json({ counts, today, yesterday, last7, last30, older, noTimestamp, error: '', jwtToken: guard.refreshedToken });
    } catch (e) {
      return res.status(500).json({
        counts: {}, today: [], yesterday: [], last7: [], last30: [], older: [], noTimestamp: [],
        error: e.toString(), jwtToken: ''
      });
    }
  });
};
