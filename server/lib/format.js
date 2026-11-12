import { formatDateLong } from './time.js';

export function formatBRL(cents) {
  return (Number(cents) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function onlyDigits(value) {
  return String(value ?? '').replace(/\D+/g, '');
}

/** Normaliza telefone brasileiro para DDD + número (10 ou 11 dígitos). */
export function normalizePhone(input) {
  let digits = onlyDigits(input);
  if (digits.length > 11 && digits.startsWith('55')) digits = digits.slice(2);
  if (digits.length === 10 || digits.length === 11) return digits;
  return null;
}

export function formatPhone(digits) {
  const d = onlyDigits(digits);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return digits;
}

export function buildWhatsappMessage(appointment) {
  return [
    'Olá, ELITE BARBER! Gostaria de confirmar meu agendamento:',
    '',
    `*Nome:* ${appointment.customerName}`,
    `*Serviço:* ${appointment.serviceName} — ${formatBRL(appointment.priceCents)}`,
    `*Barbeiro:* ${appointment.barberName}`,
    `*Data:* ${formatDateLong(appointment.date)}`,
    `*Horário:* ${appointment.time} às ${appointment.endTime}`,
    `*Telefone:* ${formatPhone(appointment.customerPhone)}`,
    '',
    'Aguardo a confirmação. Obrigado!',
  ].join('\n');
}

export function whatsappLink(number, message) {
  const digits = onlyDigits(number);
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function normalizeText(value, max = 200) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}
