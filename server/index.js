import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { db, getSetting, setSetting, seedDemoData } from './db.js';
import {
  ApiError,
  createAppointment,
  createBlock,
  deleteAppointment,
  deleteBlock,
  getAppointment,
  getAvailability,
  getShopSettings,
  listAppointments,
  listBarbers,
  listBlocks,
  listServices,
  nextOpenDates,
  scheduleSummary,
  updateAppointmentStatus,
} from './lib/booking.js';
import { buildWhatsappMessage, formatBRL, normalizeText, whatsappLink } from './lib/format.js';
import {
  SESSION_COOKIE,
  SESSION_TTL_MS,
  clearSessionCookie,
  hashPassword,
  newToken,
  parseCookies,
  sessionCookie,
  verifyPassword,
} from './lib/auth.js';
import { isDateString, isTimeString, today } from './lib/time.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT || 3000);
const DIST_DIR = path.join(here, '..', 'dist');

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json({ limit: '64kb' }));

const isSecure = (req) => req.secure || req.get('x-forwarded-proto') === 'https';

/* ------------------------------- sessões ------------------------------- */

function currentSession(req) {
  const token = parseCookies(req.get('cookie'))[SESSION_COOKIE];
  if (!token) return null;
  const row = db.get('SELECT token, username, expires_at FROM admin_sessions WHERE token = ?', [token]);
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.run('DELETE FROM admin_sessions WHERE token = ?', [token]);
    return null;
  }
  return row;
}

function requireAdmin(req, res, next) {
  const session = currentSession(req);
  if (!session) return res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });
  req.admin = session;
  next();
}

/* ----------------------------- login limit ----------------------------- */

const loginAttempts = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;

function attemptKey(req) {
  return req.ip || 'unknown';
}

function checkLoginLimit(req) {
  const key = attemptKey(req);
  const entry = loginAttempts.get(key);
  if (!entry) return true;
  if (Date.now() > entry.resetAt) {
    loginAttempts.delete(key);
    return true;
  }
  return entry.count < MAX_ATTEMPTS;
}

function registerFailure(req) {
  const key = attemptKey(req);
  const entry = loginAttempts.get(key);
  if (!entry || Date.now() > entry.resetAt) {
    loginAttempts.set(key, { count: 1, resetAt: Date.now() + WINDOW_MS });
  } else {
    entry.count += 1;
  }
}

/* ------------------------------ rotas API ------------------------------ */

const api = express.Router();

api.get('/health', (req, res) => {
  res.json({ ok: true, app: 'ELITE BARBER', time: new Date().toISOString() });
});

api.get('/public/site', (req, res) => {
  const settings = getShopSettings();
  res.json({
    shop: {
      name: 'ELITE BARBER',
      tagline: 'Seu estilo, nossa excelência',
      whatsappNumber: settings.whatsappNumber,
      whatsappLink: whatsappLink(settings.whatsappNumber, 'Olá, ELITE BARBER! Gostaria de mais informações.'),
      openingTime: settings.openingTime,
      closingTime: settings.closingTime,
      slotMinutes: settings.slotMinutes,
      workDays: settings.workDays,
      leadTimeMinutes: settings.leadTimeMinutes,
      maxDaysAhead: settings.maxDaysAhead,
    },
    services: listServices(),
    barbers: listBarbers(),
    dates: nextOpenDates(21),
  });
});

api.get('/public/availability', (req, res) => {
  const { barberId, date, serviceId } = req.query;
  res.json(getAvailability({ barberId, date, serviceId }));
});

api.post('/appointments', (req, res) => {
  const appointment = createAppointment(req.body ?? {});
  const message = buildWhatsappMessage(appointment);
  res.status(201).json({
    appointment,
    whatsappUrl: whatsappLink(getShopSettings().whatsappNumber, message),
    message,
  });
});

api.post('/admin/login', (req, res) => {
  if (!checkLoginLimit(req)) {
    return res.status(429).json({ error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' });
  }
  const username = normalizeText(req.body?.username, 60);
  const password = String(req.body?.password ?? '');
  const expectedUser = getSetting('admin_username') || 'admin';
  const hash = getSetting('admin_password_hash') || '';

  if (!username || !password || username !== expectedUser || !verifyPassword(password, hash)) {
    registerFailure(req);
    return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
  }

  loginAttempts.delete(attemptKey(req));
  const token = newToken();
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  db.run('INSERT INTO admin_sessions (token, username, created_at, expires_at) VALUES (?, ?, ?, ?)', [
    token,
    username,
    createdAt,
    expiresAt,
  ]);
  res.setHeader('Set-Cookie', sessionCookie(token, { secure: isSecure(req) }));
  res.json({
    user: { username, defaultPassword: getSetting('admin_password_is_default') === '1' },
    expiresAt,
  });
});

api.post('/admin/logout', (req, res) => {
  const token = parseCookies(req.get('cookie'))[SESSION_COOKIE];
  if (token) db.run('DELETE FROM admin_sessions WHERE token = ?', [token]);
  res.setHeader('Set-Cookie', clearSessionCookie({ secure: isSecure(req) }));
  res.json({ ok: true });
});

api.get('/admin/me', requireAdmin, (req, res) => {
  res.json({
    user: { username: req.admin.username, defaultPassword: getSetting('admin_password_is_default') === '1' },
    settings: getShopSettings(),
  });
});

api.get('/admin/appointments', requireAdmin, (req, res) => {
  const { date, from, to, status, barberId } = req.query;
  const list = listAppointments({
    from: date || from || undefined,
    to: date || to || undefined,
    status: status || undefined,
    barberId: barberId || undefined,
  });
  res.json({
    appointments: list,
    totals: {
      count: list.filter((item) => item.status === 'confirmed').length,
      revenueCents: list.filter((item) => item.status === 'confirmed').reduce((sum, item) => sum + item.priceCents, 0),
    },
  });
});

api.get('/admin/schedule', requireAdmin, (req, res) => {
  const date = isDateString(req.query.date) ? req.query.date : today();
  res.json(scheduleSummary({ barberId: req.query.barberId, date }));
});

api.patch('/admin/appointments/:id', requireAdmin, (req, res) => {
  res.json({ appointment: updateAppointmentStatus(req.params.id, String(req.body?.status ?? '')) });
});

api.delete('/admin/appointments/:id', requireAdmin, (req, res) => {
  res.json({ deleted: deleteAppointment(req.params.id) });
});

api.get('/admin/appointments/:id/whatsapp', requireAdmin, (req, res) => {
  const appointment = getAppointment(req.params.id);
  if (!appointment) throw new ApiError(404, 'Agendamento não encontrado.');
  res.json({ whatsappUrl: whatsappLink(getShopSettings().whatsappNumber, buildWhatsappMessage(appointment)) });
});

/* serviços */
api.get('/admin/services', requireAdmin, (req, res) => {
  res.json({ services: listServices({ includeInactive: true }) });
});

api.post('/admin/services', requireAdmin, (req, res) => {
  const name = normalizeText(req.body?.name, 60);
  const description = normalizeText(req.body?.description, 240);
  const priceCents = Number(req.body?.priceCents);
  const durationMin = Number(req.body?.durationMin);
  if (name.length < 2) throw new ApiError(400, 'Informe o nome do serviço.');
  if (!Number.isInteger(priceCents) || priceCents < 0) throw new ApiError(400, 'Informe um preço válido.');
  if (!Number.isInteger(durationMin) || durationMin < 10 || durationMin > 240) {
    throw new ApiError(400, 'A duração deve ficar entre 10 e 240 minutos.');
  }
  const order = db.get('SELECT IFNULL(MAX(sort_order), -1) + 1 AS next FROM services');
  db.run(
    'INSERT INTO services (name, description, price_cents, duration_min, active, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
    [name, description, priceCents, durationMin, req.body?.active === false ? 0 : 1, Number(order.next)],
  );
  const created = db.get('SELECT id FROM services ORDER BY id DESC LIMIT 1');
  res.status(201).json({ service: listServices({ includeInactive: true }).find((item) => item.id === created.id) });
});

api.put('/admin/services/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.get('SELECT * FROM services WHERE id = ?', [id]);
  if (!existing) throw new ApiError(404, 'Serviço não encontrado.');
  const name = normalizeText(req.body?.name ?? existing.name, 60);
  const description = normalizeText(req.body?.description ?? existing.description, 240);
  const priceCents = req.body?.priceCents === undefined ? existing.price_cents : Number(req.body.priceCents);
  const durationMin = req.body?.durationMin === undefined ? existing.duration_min : Number(req.body.durationMin);
  const active = req.body?.active === undefined ? existing.active : req.body.active ? 1 : 0;
  if (name.length < 2) throw new ApiError(400, 'Informe o nome do serviço.');
  if (!Number.isInteger(priceCents) || priceCents < 0) throw new ApiError(400, 'Informe um preço válido.');
  if (!Number.isInteger(durationMin) || durationMin < 10 || durationMin > 240) {
    throw new ApiError(400, 'A duração deve ficar entre 10 e 240 minutos.');
  }
  db.run('UPDATE services SET name = ?, description = ?, price_cents = ?, duration_min = ?, active = ? WHERE id = ?', [
    name,
    description,
    priceCents,
    durationMin,
    active,
    id,
  ]);
  res.json({ service: listServices({ includeInactive: true }).find((item) => item.id === id) });
});

api.delete('/admin/services/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.get('SELECT * FROM services WHERE id = ?', [id]);
  if (!existing) throw new ApiError(404, 'Serviço não encontrado.');
  const used = db.get("SELECT COUNT(*) AS total FROM appointments WHERE service_id = ? AND status = 'confirmed'", [id]);
  if (Number(used.total) > 0) {
    db.run('UPDATE services SET active = 0 WHERE id = ?', [id]);
    return res.json({ deactivated: true, message: 'Serviço possui agendamentos e foi desativado do site.' });
  }
  db.run('DELETE FROM services WHERE id = ?', [id]);
  res.json({ deleted: { id } });
});

/* equipe */
api.get('/admin/barbers', requireAdmin, (req, res) => {
  res.json({ barbers: listBarbers({ includeInactive: true }) });
});

api.post('/admin/barbers', requireAdmin, (req, res) => {
  const name = normalizeText(req.body?.name, 60);
  const specialty = normalizeText(req.body?.specialty, 80);
  const bio = normalizeText(req.body?.bio, 240);
  if (name.length < 2) throw new ApiError(400, 'Informe o nome do barbeiro.');
  const order = db.get('SELECT IFNULL(MAX(sort_order), -1) + 1 AS next FROM barbers');
  db.run('INSERT INTO barbers (name, specialty, bio, active, sort_order) VALUES (?, ?, ?, ?, ?)', [
    name,
    specialty,
    bio,
    req.body?.active === false ? 0 : 1,
    Number(order.next),
  ]);
  const created = db.get('SELECT id FROM barbers ORDER BY id DESC LIMIT 1');
  res.status(201).json({ barber: listBarbers({ includeInactive: true }).find((item) => item.id === created.id) });
});

api.put('/admin/barbers/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.get('SELECT * FROM barbers WHERE id = ?', [id]);
  if (!existing) throw new ApiError(404, 'Barbeiro não encontrado.');
  const name = normalizeText(req.body?.name ?? existing.name, 60);
  const specialty = normalizeText(req.body?.specialty ?? existing.specialty, 80);
  const bio = normalizeText(req.body?.bio ?? existing.bio, 240);
  const active = req.body?.active === undefined ? existing.active : req.body.active ? 1 : 0;
  if (name.length < 2) throw new ApiError(400, 'Informe o nome do barbeiro.');
  db.run('UPDATE barbers SET name = ?, specialty = ?, bio = ?, active = ? WHERE id = ?', [
    name,
    specialty,
    bio,
    active,
    id,
  ]);
  res.json({ barber: listBarbers({ includeInactive: true }).find((item) => item.id === id) });
});

api.delete('/admin/barbers/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.get('SELECT * FROM barbers WHERE id = ?', [id]);
  if (!existing) throw new ApiError(404, 'Barbeiro não encontrado.');
  const used = db.get("SELECT COUNT(*) AS total FROM appointments WHERE barber_id = ? AND status = 'confirmed'", [id]);
  if (Number(used.total) > 0) {
    db.run('UPDATE barbers SET active = 0 WHERE id = ?', [id]);
    return res.json({ deactivated: true, message: 'Barbeiro possui agendamentos e foi desativado do site.' });
  }
  db.run('DELETE FROM barbers WHERE id = ?', [id]);
  res.json({ deleted: { id } });
});

/* bloqueios */
api.get('/admin/blocks', requireAdmin, (req, res) => {
  res.json({ blocks: listBlocks({ date: req.query.date, barberId: req.query.barberId }) });
});

api.post('/admin/blocks', requireAdmin, (req, res) => {
  res.status(201).json({ block: createBlock(req.body ?? {}) });
});

api.delete('/admin/blocks/:id', requireAdmin, (req, res) => {
  res.json({ deleted: deleteBlock(req.params.id) });
});

/* configurações */
api.get('/admin/settings', requireAdmin, (req, res) => {
  res.json({ settings: getShopSettings() });
});

api.put('/admin/settings', requireAdmin, (req, res) => {
  const body = req.body ?? {};
  if (body.openingTime !== undefined) {
    if (!isTimeString(body.openingTime)) throw new ApiError(400, 'Horário de abertura inválido.');
    setSetting('opening_time', body.openingTime);
  }
  if (body.closingTime !== undefined) {
    if (!isTimeString(body.closingTime)) throw new ApiError(400, 'Horário de fechamento inválido.');
    setSetting('closing_time', body.closingTime);
  }
  if (body.slotMinutes !== undefined) {
    const value = Number(body.slotMinutes);
    if (!Number.isInteger(value) || value < 10 || value > 120) {
      throw new ApiError(400, 'O intervalo entre horários deve ficar entre 10 e 120 minutos.');
    }
    setSetting('slot_minutes', value);
  }
  if (body.whatsappNumber !== undefined) {
    const digits = String(body.whatsappNumber).replace(/\D+/g, '');
    if (digits.length < 10 || digits.length > 15) throw new ApiError(400, 'Número de WhatsApp inválido.');
    setSetting('whatsapp_number', digits);
  }
  if (body.workDays !== undefined) {
    const days = Array.isArray(body.workDays) ? body.workDays.map(Number) : [];
    const valid = days.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
    if (!valid.length) throw new ApiError(400, 'Selecione ao menos um dia de atendimento.');
    setSetting('work_days', [...new Set(valid)].sort().join(','));
  }
  if (body.leadTimeMinutes !== undefined) {
    const value = Number(body.leadTimeMinutes);
    if (!Number.isInteger(value) || value < 0 || value > 240) throw new ApiError(400, 'Antecedência inválida.');
    setSetting('lead_time_minutes', value);
  }
  const settings = getShopSettings();
  if (settings.closingTime <= settings.openingTime) {
    throw new ApiError(400, 'O fechamento deve ser depois da abertura.');
  }
  res.json({ settings });
});

api.put('/admin/password', requireAdmin, (req, res) => {
  const currentPassword = String(req.body?.currentPassword ?? '');
  const newPassword = String(req.body?.newPassword ?? '');
  if (!verifyPassword(currentPassword, getSetting('admin_password_hash') || '')) {
    throw new ApiError(400, 'Senha atual incorreta.');
  }
  if (newPassword.length < 8) throw new ApiError(400, 'A nova senha deve ter ao menos 8 caracteres.');
  setSetting('admin_password_hash', hashPassword(newPassword));
  setSetting('admin_password_is_default', '0');
  db.run('DELETE FROM admin_sessions WHERE username <> ?', [req.admin.username]);
  res.json({ ok: true, message: 'Senha atualizada com sucesso.' });
});

api.post('/admin/reset-demo', requireAdmin, (req, res) => {
  seedDemoData({ force: true });
  res.json({ ok: true, services: listServices(), barbers: listBarbers() });
});

api.use((req, res) => res.status(404).json({ error: 'Rota não encontrada.' }));

app.use('/api', api);

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = error instanceof ApiError ? error.status : 500;
  if (status >= 500) console.error('[elite-barber] erro:', error);
  res.status(status).json({ error: status >= 500 ? 'Erro interno no servidor.' : error.message });
});

/* --------------------------- frontend (build) --------------------------- */

if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR, { index: false, maxAge: '1h' }));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.status(200).type('html').send(
      '<h1>ELITE BARBER</h1><p>Frontend não compilado. Rode <code>npm run build</code> e reinicie o servidor.</p>',
    );
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[elite-barber] servidor ativo em http://0.0.0.0:${PORT}`);
});
