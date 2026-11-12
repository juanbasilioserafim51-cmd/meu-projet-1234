import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { hashPassword } from './lib/auth.js';

const require = createRequire(import.meta.url);
const { Database } = require('node-sqlite3-wasm');

const here = path.dirname(fileURLToPath(import.meta.url));

export const DATA_DIR = process.env.DATA_DIR || path.join(here, '..', 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

export const DB_FILE = process.env.DATABASE_FILE || path.join(DATA_DIR, 'elite-barber.db');

export const db = new Database(DB_FILE);

db.exec(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    price_cents INTEGER NOT NULL DEFAULT 0,
    duration_min INTEGER NOT NULL DEFAULT 30,
    active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS barbers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    specialty TEXT NOT NULL DEFAULT '',
    bio TEXT NOT NULL DEFAULT '',
    active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    service_id INTEGER NOT NULL,
    barber_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    service_name TEXT NOT NULL,
    barber_name TEXT NOT NULL,
    price_cents INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'confirmed',
    created_at TEXT NOT NULL
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_slot
    ON appointments (barber_id, date, time) WHERE status = 'confirmed';

  CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments (date);

  CREATE TABLE IF NOT EXISTS blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    barber_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    time TEXT,
    reason TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS admin_sessions (
    token TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );
`);

const DEFAULT_SETTINGS = {
  whatsapp_number: process.env.WHATSAPP_NUMBER || '5521979596565',
  opening_time: '09:00',
  closing_time: '19:00',
  slot_minutes: '30',
  work_days: '1,2,3,4,5,6',
  lead_time_minutes: '30',
  max_days_ahead: '60',
};

export function getSetting(key) {
  const row = db.get('SELECT value FROM settings WHERE key = ?', [key]);
  return row ? row.value : undefined;
}

export function setSetting(key, value) {
  db.run(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, String(value)],
  );
}

export function bootstrapSettings() {
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    if (getSetting(key) === undefined) setSetting(key, value);
  }
  if (getSetting('admin_username') === undefined) {
    setSetting('admin_username', process.env.ADMIN_USER || 'admin');
  }
  if (getSetting('admin_password_hash') === undefined) {
    const initial = process.env.ADMIN_PASSWORD || 'elite2024';
    setSetting('admin_password_hash', hashPassword(initial));
    setSetting('admin_password_is_default', process.env.ADMIN_PASSWORD ? '0' : '1');
  }
}

const DEMO_SERVICES = [
  {
    name: 'Corte masculino',
    description: 'Corte personalizado com máquina, tesoura e finalização com produtos premium.',
    price_cents: 6000,
    duration_min: 40,
  },
  {
    name: 'Barba',
    description: 'Barba desenhada com toalha quente, navalha e óleo hidratante.',
    price_cents: 3500,
    duration_min: 30,
  },
  {
    name: 'Corte + barba',
    description: 'Experiência completa: corte sob medida e barba tradicional.',
    price_cents: 8500,
    duration_min: 70,
  },
  {
    name: 'Acabamento',
    description: 'Retoque rápido de contornos, nuca e pezinho para manter o desenho.',
    price_cents: 2000,
    duration_min: 20,
  },
];

const DEMO_BARBERS = [
  {
    name: 'Rafael Andrade',
    specialty: 'Cortes clássicos e sociais',
    bio: 'Perfil demonstrativo: especialista em cortes atemporais, tesoura e acabamento desenhado.',
  },
  {
    name: 'Diego Martins',
    specialty: 'Barba e navalha',
    bio: 'Perfil demonstrativo: foco em barba tradicional, toalha quente e contornos precisos.',
  },
  {
    name: 'Lucas Ferreira',
    specialty: 'Degradê e freestyle',
    bio: 'Perfil demonstrativo: degradês modernos, riscos e finalização com styling.',
  },
];

export function seedDemoData({ force = false } = {}) {
  bootstrapSettings();
  const serviceCount = db.get('SELECT COUNT(*) AS total FROM services');
  if (force || Number(serviceCount?.total) === 0) {
    if (force) db.run('DELETE FROM services');
    DEMO_SERVICES.forEach((service, index) => {
      db.run(
        'INSERT INTO services (name, description, price_cents, duration_min, active, sort_order) VALUES (?, ?, ?, ?, 1, ?)',
        [service.name, service.description, service.price_cents, service.duration_min, index],
      );
    });
  }
  const barberCount = db.get('SELECT COUNT(*) AS total FROM barbers');
  if (force || Number(barberCount?.total) === 0) {
    if (force) db.run('DELETE FROM barbers');
    DEMO_BARBERS.forEach((barber, index) => {
      db.run('INSERT INTO barbers (name, specialty, bio, active, sort_order) VALUES (?, ?, ?, 1, ?)', [
        barber.name,
        barber.specialty,
        barber.bio,
        index,
      ]);
    });
  }
}

bootstrapSettings();
seedDemoData();
