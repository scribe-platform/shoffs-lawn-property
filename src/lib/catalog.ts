export function formatPrice(amount: unknown): string {
  const value = typeof amount === 'number' ? amount : Number(amount);
  if (Number.isNaN(value)) return String(amount);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatFieldValue(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value instanceof Date) return value.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}
