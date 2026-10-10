export const PASSWORD_MIN = 8;

// Devuelve el problema de la contraseña o null si es válida. Con `confirm` exige que ambas coincidan.
export function passwordIssue(password: string, confirm?: string): string | null {
  if (password.length < PASSWORD_MIN) return `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`;
  if (confirm !== undefined && password !== confirm) return "Las contraseñas no coinciden.";
  return null;
}
