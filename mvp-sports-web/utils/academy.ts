// Validación de una clase de academia antes de publicarla (fechas AAAA-MM-DD, horas HH:MM)
export function academyIssue(f: any): string | null {
  if (String(f?.name || "").trim().length < 3) return "Ponle un nombre a la clase (mínimo 3 letras)";
  if (!String(f.instructor || "").trim()) return "Indica el instructor";
  if (!f.tenantId) return "Elige el recinto donde se dicta la clase";
  if (!Array.isArray(f.daysOfWeek) || f.daysOfWeek.length === 0) return "Selecciona al menos un día";
  if (!f.startTime || !f.endTime) return "Indica el horario de la clase";
  if (f.endTime <= f.startTime) return "La hora de término debe ser posterior a la de inicio";
  const price = Number(f.price);
  if (f.price === "" || !Number.isFinite(price) || price < 0) return "Indica el valor mensual (0 si es gratis)";
  const max = Number(f.maxStudents);
  if (!Number.isFinite(max) || max < 1) return "El cupo debe ser de al menos 1 alumno";
  if (!f.startDate) return "Indica la fecha de inicio";
  if (f.endDate && f.endDate < f.startDate) return "La clase no puede terminar antes de empezar";
  return null;
}
