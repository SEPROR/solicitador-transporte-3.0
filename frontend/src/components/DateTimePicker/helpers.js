export const toISODate = (d) =>
  d
    ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    : '';

export const toTime = (d) =>
  d ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : '';

export const parseDate = (s) => (s ? new Date(`${s}T00:00:00`) : null);

export const parseTime = (s) => {
  if (!s) return null;
  const [h, m] = s.split(':');
  const d = new Date();
  d.setHours(Number(h), Number(m), 0, 0);
  return d;
};