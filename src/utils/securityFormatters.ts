/**
 * securityFormatters.ts
 * Utilidades para ofuscamiento y cumplimiento de normativas de seguridad (Compliance).
 */

/**
 * Enmascara un número de cuenta mostrando únicamente los últimos 4 dígitos.
 * Ideal para bauchers impresos y comprobantes transaccionales en ambientes públicos.
 * 
 * @param accountStr Número de cuenta completo (ej. "1020304050")
 * @returns Número enmascarado (ej. "******4050")
 */
export const maskAccountNumber = (accountStr?: string | null): string => {
  if (!accountStr) return '';
  const str = String(accountStr).trim();
  if (str.length <= 4) return str;
  const maskedPart = '*'.repeat(str.length - 4);
  const visiblePart = str.slice(-4);
  return `${maskedPart}${visiblePart}`;
};
