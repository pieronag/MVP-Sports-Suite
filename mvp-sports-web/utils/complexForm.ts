// Formulario de "Configuración del complejo": de documento del recinto a formulario y de vuelta, sin efectos.
// Las credenciales (access token de Mercado Pago, API key del SII) nunca se leen ni se escriben en el documento:
// viajan por /api/tenant-secrets.

export interface ComplexForm {
  name: string; address: string; description: string; phone: string;
  instagram: string; whatsapp: string; website: string; contactEmail: string;
  legalName: string; rut: string; legalRepresentative: string; businessType: string;
  openTime: string; closeTime: string; cancellationPolicy: string;
  rules: string[]; amenities: string[];
  isMercadopagoActive: boolean; mercadopagoPublicKey: string; mercadopagoAccessToken: string;
  isSiiActive: boolean; siiRut: string; siiApiKey: string;
}

export const AMENITIES = ["WiFi", "Parking", "Duchas", "Luz LED", "Café", "Pro Shop"];
export const RULES = [
  "Prohibido fumar en el recinto", "Prohibido el consumo de alcohol", "No se permiten mascotas", "Uso de calzado deportivo obligatorio",
  "No ingresar comida a las canchas", "Prohibido el uso de parlantes", "Respetar horario de inicio y fin", "Menores con supervisión adulta",
  "Prohibido envases de vidrio", "Mantener la limpieza del lugar", "Prohibido estoperoles de aluminio", "Estacionar solo en zonas señalizadas",
  "Se reserva el derecho de admisión",
];

// Minutos desde medianoche; antes de las 06:00 cuenta como madrugada del día siguiente (cierre 01:00 > 23:00)
const closeMinutes = (t: string) => {
  const [h, m] = (t || "0:0").split(":").map(Number);
  return (h < 6 ? h + 24 : h) * 60 + (m || 0);
};

type DayLike = { isOpen?: boolean; open?: string; close?: string } | null | undefined;

/** Horario general: la apertura más temprana y el cierre más tardío de los días abiertos; si no hay, los campos sueltos. */
export function overallHours(t: { openTime?: string; closeTime?: string; schedule?: Record<string, DayLike> }) {
  let open = t.openTime || "08:00", close = t.closeTime || "23:00";
  const days = t.schedule && typeof t.schedule === "object" ? Object.values(t.schedule).filter((d): d is NonNullable<DayLike> => !!d?.isOpen) : [];
  const opens = days.map((d) => d.open).filter(Boolean) as string[];
  const closes = days.map((d) => d.close).filter(Boolean) as string[];
  if (opens.length) open = [...opens].sort()[0];
  if (closes.length) close = [...closes].sort((a, b) => closeMinutes(b) - closeMinutes(a))[0];
  return { open, close };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formFromTenant(t: Record<string, any>): ComplexForm {
  const { open, close } = overallHours(t);
  const s = (v: unknown) => (typeof v === "string" ? v : "");
  const list = (v: unknown) => (Array.isArray(v) ? v.filter((x) => typeof x === "string") : []);
  return {
    name: s(t.name), address: s(t.address), description: s(t.description), phone: s(t.phone),
    instagram: s(t.instagram), whatsapp: s(t.whatsapp), website: s(t.website), contactEmail: s(t.contactEmail),
    legalName: s(t.legalName), rut: s(t.rut), legalRepresentative: s(t.legalRepresentative), businessType: s(t.businessType),
    openTime: open, closeTime: close, cancellationPolicy: s(t.cancellationPolicy),
    rules: list(t.rules), amenities: list(t.amenities),
    isMercadopagoActive: !!t.isMercadopagoActive, mercadopagoPublicKey: s(t.mercadopagoPublicKey), mercadopagoAccessToken: "",
    isSiiActive: !!t.isSiiActive, siiRut: s(t.siiRut), siiApiKey: "",
  };
}

/** Separa lo público (va al documento del recinto) de las credenciales nuevas (van a tenant_secrets, solo si se escribieron). */
export function splitForSave(form: ComplexForm, mpGloballyDisabled: boolean) {
  const { mercadopagoAccessToken, siiApiKey, ...rest } = form;
  const publicData = {
    ...rest,
    name: rest.name.trim(), address: rest.address.trim(), contactEmail: rest.contactEmail.trim(),
    isMercadopagoActive: mpGloballyDisabled ? false : rest.isMercadopagoActive,
    openingHours: `${rest.openTime} - ${rest.closeTime}`,
  };
  const secrets: Record<string, string> = {};
  if (mercadopagoAccessToken.trim()) secrets.mercadopagoAccessToken = mercadopagoAccessToken.trim();
  if (siiApiKey.trim()) secrets.siiApiKey = siiApiKey.trim();
  return { publicData, secrets };
}

/** Errores que impiden guardar, en el orden en que aparecen en pantalla. */
export function validateComplex(form: ComplexForm): string[] {
  const errors: string[] = [];
  if (!form.name.trim()) errors.push("El nombre comercial no puede quedar vacío.");
  if (form.contactEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail.trim())) errors.push("El email de contacto no es válido.");
  if (form.website.trim() && !/^(https?:\/\/)?[^\s.]+\.[^\s]+$/i.test(form.website.trim())) errors.push("La web oficial no parece una dirección válida.");
  if (!form.openTime || !form.closeTime) errors.push("Indica el horario de apertura y de cierre.");
  else if (form.openTime === form.closeTime) errors.push("La apertura y el cierre no pueden ser la misma hora.");
  return errors;
}

export type SectionId = "identidad" | "legal" | "contacto" | "operacion" | "integraciones";

export function sectionsDone(form: ComplexForm, mpActive: boolean): Record<SectionId, boolean> {
  return {
    identidad: !!(form.name && form.address),
    legal: !!(form.legalName && form.rut),
    contacto: !!(form.whatsapp || form.instagram || form.website || form.contactEmail),
    operacion: !!(form.openTime && form.closeTime),
    integraciones: mpActive,
  };
}

/** Qué falta para cobrar online con Mercado Pago (vacío = listo). No llama a Mercado Pago. */
export function mercadoPagoMissing(form: ComplexForm, tokenConfigured: boolean): string[] {
  const missing: string[] = [];
  if (!form.mercadopagoPublicKey.trim()) missing.push("Public Key");
  else if (!/^(APP_USR|TEST)-/.test(form.mercadopagoPublicKey.trim())) missing.push("Public Key válida (empieza con APP_USR- o TEST-)");
  if (!form.mercadopagoAccessToken.trim() && !tokenConfigured) missing.push("Access Token");
  return missing;
}
