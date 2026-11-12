import { db, getSetting } from '../db.js';
import { formatBRL, formatPhone, normalizePhone, normalizeText } from './format.js';
import { addDays, diffDays, isDateString, isTimeString, nowParts, toMinutes, toTime, today, weekday } from './time.js';

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function getShopSettings() {
  const workDays = String(getSetting('work_days') ?? '1,2,3,4,5,6')
    .split(',')
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6);
  return {
    whatsappNumber: getSetting('whatsapp_number') || '5521979596565',
    openingTime: getSetting('opening_time') || '09:00',
    closingTime: getSetting('closing_time') || '19:00',
    slotMinutes: Number(getSetting('slot_minutes') || 30),
    workDays: workDays.length ? workDays : [1, 2, 3, 4, 5, 6],
    leadTimeMinutes: Number(getSetting('lead_time_minutes') || 30),
    maxDaysAhead: Number(getSetting('max_days_ahead') || 60),
  };
}

export function listServices({ includeInactive = false } = {}) {
  const rows = db.all(
    `SELECT id, name, description, price_cents, duration_min, active
       FROM services ${includeInactive ? '' : 'WHERE active = 1'}
      ORDER BY sort_order ASC, id ASC`,
  );
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    priceCents: row.price_cents,
    durationMin: row.duration_min,
    active: Boolean(row.active),
  }));
}

export function listBarbers({ includeInactive = false } = {}) {
  const rows = db.all(
    `SELECT id, name, specialty, bio, photo_url, active
       FROM barbers ${includeInactive ? '' : 'WHERE active = 1'}
      ORDER BY sort_order ASC, id ASC`,
  );
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    specialty: row.specialty,
    bio: row.bio,
    photoUrl: row.photo_url || '',
    active: Boolean(row.active),
    initials: initialsOf(row.name),
  }));
}

export function initialsOf(name) {
  return String(name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function overlaps(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

/**
 * Calcula os horários de uma agenda considerando: horário de funcionamento,
 * duração do serviço, agendamentos confirmados e bloqueios do barbeiro.
 */
export function getAvailability({ barberId, date, serviceId }) {
  const settings = getShopSettings();
  const service = listServices({ includeInactive: true }).find((item) => item.id === Number(serviceId));
  const barber = listBarbers({ includeInactive: true }).find((item) => item.id === Number(barberId));

  if (!isDateString(date)) throw new ApiError(400, 'Informe uma data válida.');
  if (!service) throw new ApiError(400, 'Serviço não encontrado.');
  if (!barber) throw new ApiError(400, 'Barbeiro não encontrado.');

  const base = { date, barberId: barber.id, serviceId: service.id, slots: [], closed: false, reason: '' };
  const current = nowParts();

  if (diffDays(current.date, date) < 0) {
    return { ...base, closed: true, reason: 'Data já passou.' };
  }
  if (diffDays(current.date, date) > settings.maxDaysAhead) {
    return { ...base, closed: true, reason: `Agenda aberta para os próximos ${settings.maxDaysAhead} dias.` };
  }
  if (!settings.workDays.includes(weekday(date))) {
    return { ...base, closed: true, reason: 'A barbearia não atende neste dia.' };
  }

  const blocks = db.all('SELECT time, reason FROM blocks WHERE barber_id = ? AND date = ?', [barber.id, date]);
  if (blocks.some((block) => !block.time)) {
    const reason = blocks.find((block) => !block.time)?.reason;
    return { ...base, closed: true, reason: reason ? `Indisponível: ${reason}` : 'Agenda bloqueada neste dia.' };
  }

  const appointments = db.all(
    "SELECT time, end_time FROM appointments WHERE barber_id = ? AND date = ? AND status = 'confirmed'",
    [barber.id, date],
  );
  const busy = appointments.map((row) => ({ start: toMinutes(row.time), end: toMinutes(row.end_time) }));
  for (const block of blocks) {
    const start = toMinutes(block.time);
    busy.push({ start, end: start + settings.slotMinutes });
  }

  const open = toMinutes(settings.openingTime);
  const close = toMinutes(settings.closingTime);
  const step = Math.max(10, settings.slotMinutes);

  for (let start = open; start + service.durationMin <= close; start += step) {
    const end = start + service.durationMin;
    const time = toTime(start);
    let available = true;
    let reason = '';

    if (date === current.date && start < current.minutes + settings.leadTimeMinutes) {
      available = false;
      reason = 'Horário já passou';
    }
    if (available && busy.some((slot) => overlaps(start, end, slot.start, slot.end))) {
      available = false;
      reason = 'Ocupado';
    }
    base.slots.push({ time, endTime: toTime(end), available, reason });
  }

  return base;
}

function serializeAppointment(row) {
  return {
    id: row.id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerPhoneFormatted: formatPhone(row.customer_phone),
    serviceId: row.service_id,
    barberId: row.barber_id,
    serviceName: row.service_name,
    barberName: row.barber_name,
    priceCents: row.price_cents,
    priceFormatted: formatBRL(row.price_cents),
    date: row.date,
    time: row.time,
    endTime: row.end_time,
    status: row.status,
    createdAt: row.created_at,
  };
}

export function getAppointment(id) {
  const row = db.get('SELECT * FROM appointments WHERE id = ?', [Number(id)]);
  return row ? serializeAppointment(row) : null;
}

export function listAppointments({ from, to, status, barberId } = {}) {
  const filters = [];
  const params = [];
  if (from) {
    filters.push('date >= ?');
    params.push(from);
  }
  if (to) {
    filters.push('date <= ?');
    params.push(to);
  }
  if (status) {
    filters.push('status = ?');
    params.push(status);
  }
  if (barberId) {
    filters.push('barber_id = ?');
    params.push(Number(barberId));
  }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const rows = db.all(`SELECT * FROM appointments ${where} ORDER BY date ASC, time ASC`, params);
  return rows.map(serializeAppointment);
}

export function createAppointment(payload = {}) {
  const settings = getShopSettings();
  const customerName = normalizeText(payload.customerName, 80);
  const phone = normalizePhone(payload.customerPhone);
  const date = String(payload.date ?? '');
  const time = String(payload.time ?? '');
  const serviceId = Number(payload.serviceId);
  const barberId = Number(payload.barberId);

  if (customerName.length < 3) throw new ApiError(400, 'Informe o nome completo do cliente.');
  if (!phone) throw new ApiError(400, 'Informe um telefone válido com DDD.');
  if (!Number.isInteger(serviceId) || !Number.isInteger(barberId)) {
    throw new ApiError(400, 'Escolha o serviço e o barbeiro.');
  }
  if (!isTimeString(time)) throw new ApiError(400, 'Escolha um horário disponível.');

  const availability = getAvailability({ barberId, date, serviceId });
  if (availability.closed) throw new ApiError(409, availability.reason || 'Agenda indisponível nesta data.');
  const slot = availability.slots.find((item) => item.time === time);
  if (!slot) throw new ApiError(409, 'Horário fora da agenda de atendimento.');
  if (!slot.available) throw new ApiError(409, 'Este horário já está reservado. Escolha outro.');

  const service = listServices({ includeInactive: true }).find((item) => item.id === serviceId);
  const barber = listBarbers({ includeInactive: true }).find((item) => item.id === barberId);
  if (!service?.active) throw new ApiError(409, 'Este serviço não está disponível no momento.');
  if (!barber?.active) throw new ApiError(409, 'Este barbeiro não está disponível no momento.');

  const createdAt = new Date().toISOString();
  try {
    db.run('BEGIN IMMEDIATE');
    const conflict = db.get(
      `SELECT id FROM appointments
        WHERE barber_id = ? AND date = ? AND status = 'confirmed'
          AND time < ? AND end_time > ?`,
      [barberId, date, slot.endTime, time],
    );
    if (conflict) throw new ApiError(409, 'Este horário acabou de ser reservado. Escolha outro.');
    db.run(
      `INSERT INTO appointments
        (customer_name, customer_phone, service_id, barber_id, date, time, end_time,
         service_name, barber_name, price_cents, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?)`,
      [
        customerName,
        phone,
        serviceId,
        barberId,
        date,
        time,
        slot.endTime,
        service.name,
        barber.name,
        service.priceCents,
        createdAt,
      ],
    );
    const inserted = db.get('SELECT id FROM appointments ORDER BY id DESC LIMIT 1');
    db.run('COMMIT');
    return getAppointment(inserted.id);
  } catch (error) {
    try {
      db.run('ROLLBACK');
    } catch {
      /* transação já encerrada */
    }
    if (error instanceof ApiError) throw error;
    if (String(error?.message || '').includes('UNIQUE')) {
      throw new ApiError(409, 'Este horário já está reservado. Escolha outro.');
    }
    throw error;
  }
}

export function updateAppointmentStatus(id, status) {
  if (!['confirmed', 'cancelled'].includes(status)) throw new ApiError(400, 'Status inválido.');
  const existing = getAppointment(id);
  if (!existing) throw new ApiError(404, 'Agendamento não encontrado.');
  db.run('UPDATE appointments SET status = ? WHERE id = ?', [status, Number(id)]);
  return getAppointment(id);
}

export function deleteAppointment(id) {
  const existing = getAppointment(id);
  if (!existing) throw new ApiError(404, 'Agendamento não encontrado.');
  db.run('DELETE FROM appointments WHERE id = ?', [Number(id)]);
  return existing;
}

export function listBlocks({ from, to, date, barberId } = {}) {
  const filters = [];
  const params = [];
  if (date) {
    filters.push('date = ?');
    params.push(date);
  }
  if (from) {
    filters.push('date >= ?');
    params.push(from);
  }
  if (to) {
    filters.push('date <= ?');
    params.push(to);
  }
  if (barberId) {
    filters.push('barber_id = ?');
    params.push(Number(barberId));
  }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const rows = db.all(`SELECT * FROM blocks ${where} ORDER BY date ASC, time ASC`, params);
  return rows.map((row) => ({
    id: row.id,
    barberId: row.barber_id,
    date: row.date,
    time: row.time,
    reason: row.reason,
    createdAt: row.created_at,
  }));
}

export function createBlock({ barberId, date, time, reason }) {
  const barber = listBarbers({ includeInactive: true }).find((item) => item.id === Number(barberId));
  if (!barber) throw new ApiError(400, 'Selecione um barbeiro.');
  if (!isDateString(date)) throw new ApiError(400, 'Informe uma data válida.');
  const normalizedTime = time ? String(time) : null;
  if (normalizedTime && !isTimeString(normalizedTime)) throw new ApiError(400, 'Horário inválido.');

  const duplicate = db.get('SELECT id FROM blocks WHERE barber_id = ? AND date = ? AND IFNULL(time, ?) = ?', [
    barber.id,
    date,
    normalizedTime ?? '',
    normalizedTime ?? '',
  ]);
  if (duplicate) throw new ApiError(409, 'Este bloqueio já existe.');

  db.run('INSERT INTO blocks (barber_id, date, time, reason, created_at) VALUES (?, ?, ?, ?, ?)', [
    barber.id,
    date,
    normalizedTime,
    normalizeText(reason, 120),
    new Date().toISOString(),
  ]);
  const row = db.get('SELECT id FROM blocks ORDER BY id DESC LIMIT 1');
  return listBlocks({ date }).find((item) => item.id === row.id);
}

export function deleteBlock(id) {
  const row = db.get('SELECT id FROM blocks WHERE id = ?', [Number(id)]);
  if (!row) throw new ApiError(404, 'Bloqueio não encontrado.');
  db.run('DELETE FROM blocks WHERE id = ?', [Number(id)]);
  return { id: Number(id) };
}

export function scheduleSummary({ barberId, date }) {
  const settings = getShopSettings();
  const appointments = listAppointments({ from: date, to: date, barberId: barberId || undefined });
  const blocks = listBlocks({ date, barberId: barberId || undefined });
  return {
    date,
    appointments: appointments.filter((item) => item.status === 'confirmed'),
    cancelled: appointments.filter((item) => item.status === 'cancelled'),
    blocks,
    openingTime: settings.openingTime,
    closingTime: settings.closingTime,
    slotMinutes: settings.slotMinutes,
  };
}

export function nextOpenDates(count = 21) {
  const settings = getShopSettings();
  const current = today();
  const dates = [];
  for (let offset = 0; offset < count + 14 && dates.length < count; offset += 1) {
    const date = addDays(current, offset);
    dates.push({ date, weekday: weekday(date), open: settings.workDays.includes(weekday(date)) });
  }
  return dates;
}
