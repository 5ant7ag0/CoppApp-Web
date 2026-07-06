/**
 * Formatea un valor monetario a USD (dólares americanos) de manera consistente.
 */
export const formatCurrency = (val: number | string | undefined | null): string => {
  if (val === undefined || val === null) return '$0.00';
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
};
