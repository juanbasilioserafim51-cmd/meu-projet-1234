// Regera os dados demonstrativos (serviços e equipe) sem apagar agendamentos.
import { db, seedDemoData } from './db.js';

seedDemoData({ force: true });
const services = db.all('SELECT id, name, price_cents FROM services ORDER BY sort_order');
const barbers = db.all('SELECT id, name FROM barbers ORDER BY sort_order');
console.log('[elite-barber] serviços:', services);
console.log('[elite-barber] equipe:', barbers);
