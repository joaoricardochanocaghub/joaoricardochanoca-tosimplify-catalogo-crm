/** Valida o dígito de controlo de um NIF/NIPC português (9 dígitos, módulo 11). */
export function isValidNif(value: string): boolean {
  const digits = value.replace(/[\s.-]/g, "");
  if (!/^\d{9}$/.test(digits)) return false;
  const sum = [...digits.slice(0, 8)].reduce((acc, d, i) => acc + Number(d) * (9 - i), 0);
  const rest = sum % 11;
  return (rest < 2 ? 0 : 11 - rest) === Number(digits[8]);
}
