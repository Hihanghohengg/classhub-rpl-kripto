export const DAYS = [
  { key: 'monday', label: 'Senin' },
  { key: 'tuesday', label: 'Selasa' },
  { key: 'wednesday', label: 'Rabu' },
  { key: 'thursday', label: 'Kamis' },
  { key: 'friday', label: 'Jumat' }
];

export function toISODate(date) {
  if (!date) return '';

  const d = new Date(date);

  if (Number.isNaN(d.getTime())) return '';

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function parseDDMMYY(value) {
  if (!value) return null;

  const text = String(value).trim();
  const match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/);

  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  let year = Number(match[3]);

  if (year < 100) {
    year = year <= 30 ? 2000 + year : 1900 + year;
  }

  if (year < 1900 || year > 2100) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;

  const date = new Date(year, month - 1, day);

  const isValid =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;

  if (!isValid) return null;

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function formatDateOnlyID(value) {
  if (!value) return '-';

  const raw = String(value);
  const datePart = raw.slice(0, 10);
  const [year, month, day] = datePart.split('-');

  if (!year || !month || !day) return '-';

  return `${Number(day)}/${Number(month)}/${year}`;
}

export function formatDateID(value) {
  return formatDateOnlyID(value);
}

export function formatIDDate(value) {
  return formatDateOnlyID(value);
}

export function shortTime(value) {
  if (!value) return '';

  return String(value).slice(0, 5).replace(':', '.');
}

export function dayKeyFromDate(value) {
  if (!value) return undefined;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return undefined;

  const day = date.getDay();

  const map = {
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday'
  };

  return map[day];
}

export function getWeekDays(baseDate = new Date()) {
  const base = new Date(baseDate);
  const day = base.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;

  const monday = new Date(base);
  monday.setDate(base.getDate() + mondayOffset);

  return DAYS.map((item, index) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + index);

    return {
      key: item.key,
      label: item.label,
      iso: toISODate(d)
    };
  });
}
