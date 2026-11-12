export function brl(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function onlyDigits(value: string): string {
  return value.replace(/\D+/g, '');
}

export function maskPhone(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function isValidPhone(value: string): boolean {
  const digits = onlyDigits(value);
  const national = digits.startsWith('55') && digits.length > 11 ? digits.slice(2) : digits;
  return national.length === 10 || national.length === 11;
}

const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const WEEKDAYS_LONG = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

function parseDate(date: string): Date {
  return new Date(`${date}T12:00:00Z`);
}

export function weekdayShort(date: string): string {
  return WEEKDAYS_SHORT[parseDate(date).getUTCDay()];
}

export function weekdayLong(date: string): string {
  return WEEKDAYS_LONG[parseDate(date).getUTCDay()];
}

export function dayNumber(date: string): string {
  return String(parseDate(date).getUTCDate()).padStart(2, '0');
}

export function monthShort(date: string): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', month: 'short' }).format(parseDate(date)).replace('.', '');
}

export function dateShort(date: string): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' }).format(
    parseDate(date),
  );
}

export function dateLong(date: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'UTC',
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(parseDate(date));
}

export function todayISO(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function durationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h${String(rest).padStart(2, '0')}` : `${hours}h`;
}

export function toPriceInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}

export function fromPriceInput(value: string): number {
  const normalized = value.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : NaN;
}
