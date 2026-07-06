/**
 * Valida la estructura y módulo 10 de una cédula de identidad ecuatoriana.
 */
export const validarCedulaEcuatoriana = (ced: string): boolean => {
  if (!ced || ced.length !== 10 || !/^\d+$/.test(ced)) return false;

  const prov = parseInt(ced.substring(0, 2), 10);
  if (prov < 1 || prov > 24) return false;

  const tercerDigito = parseInt(ced.substring(2, 3), 10);
  if (tercerDigito >= 6) return false;

  let suma = 0;
  const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];

  for (let i = 0; i < 9; i++) {
    let valor = parseInt(ced.charAt(i), 10) * coeficientes[i];
    if (valor >= 10) valor -= 9;
    suma += valor;
  }

  const digitoVerificador = parseInt(ced.charAt(9), 10);
  const residuo = suma % 10;
  const resultado = residuo === 0 ? 0 : 10 - residuo;

  return resultado === digitoVerificador;
};
