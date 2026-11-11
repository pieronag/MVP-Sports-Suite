import { test, expect, type Page } from "@playwright/test";
import { env, exists } from "./helpers";

// QA agresivo de interfaz: cada rol recorre todas sus pantallas (escritorio y celular) y se buscan fallas:
// errores de consola o de página, respuestas 4xx/5xx propias, texto basura (undefined, NaN, [object Object],
// Invalid Date), imágenes rotas, scroll horizontal en celular y botones sin nombre accesible.
// No escribe nada: solo abre pantallas. Usa las cuentas del script de datos de prueba.
const TENANT = "e2e-recinto-prueba", BOOKING = "E2ECHECKINAB12CD";

const ROUTES: Record<string, string[]> = {
  player: ["/player", "/player/clubes", `/player/clubes/${TENANT}`, "/player/mapa", "/player/reservas", `/player/ticket?bookingId=${BOOKING}`,
    "/player/perfil", "/player/preferencias", "/player/estadisticas", "/player/ranking", "/player/equipos", "/player/equipos/partidos",
    "/player/torneos", "/player/academias", "/player/billetera", "/player/reporte"],
  manager: ["/dashboard", "/dashboard/checkin", "/dashboard/calendar", "/dashboard/report-issue", "/dashboard/profile"],
  owner: ["/dashboard", "/dashboard/calendar", "/dashboard/checkin", "/dashboard/courts", "/dashboard/finance", "/dashboard/staff",
    "/dashboard/tournaments", "/dashboard/academy", "/dashboard/feedback", "/dashboard/marketing/coupons", "/dashboard/billing-subscription",
    "/dashboard/settings/complex", "/dashboard/report-issue", "/dashboard/profile"],
  admin: ["/dashboard", "/dashboard/metrics", "/dashboard/tenants", "/dashboard/users", "/dashboard/users/analytics", "/dashboard/owners",
    "/dashboard/invoices", "/dashboard/reports", "/dashboard/audit", "/dashboard/gamification", "/dashboard/settings", "/dashboard/profile"],
};
const ACCOUNTS: Record<string, [string, string]> = {
  player: ["E2E_PLAYER_EMAIL", "E2E_PLAYER_PASSWORD"], manager: ["E2E_MANAGER_EMAIL", "E2E_MANAGER_PASSWORD"],
  owner: ["E2E_OWNER_EMAIL", "E2E_OWNER_PASSWORD"], admin: ["E2E_ADMIN_EMAIL", "E2E_ADMIN_PASSWORD"],
};
// Ruido conocido de terceros (no es de la app)
const IGNORE = /google|gstatic|mapbox|tile|favicon|sentry|vercel|analytics|speed-insights|hot-update|webpack|_next\/static|ERR_ABORTED|net::ERR_FAILED.*(mapa|tile)/i;

async function login(page: Page, email: string, password: string, home: RegExp) {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(home, { timeout: 30_000 });
}

for (const role of Object.keys(ROUTES)) {
  test(`recorrido ${role}: todas sus pantallas sin fallas visibles`, async ({ page, isMobile }) => {
    const [ek, pk] = ACCOUNTS[role];
    test.skip(!(await exists(env[ek])), "Sin cuentas de prueba (script de datos de prueba)");
    test.setTimeout(300_000);
    const issues: string[] = [];
    let current = "";
    page.on("console", (m) => { if (m.type() === "error" && !IGNORE.test(m.text())) issues.push(`${current} · consola: ${m.text().slice(0, 160)}`); });
    page.on("pageerror", (e) => issues.push(`${current} · excepción: ${String(e).slice(0, 160)}`));
    page.on("response", (r) => {
      const u = r.url();
      if (r.status() >= 400 && u.includes("localhost") && !IGNORE.test(u)) issues.push(`${current} · HTTP ${r.status()} ${u.replace(/^https?:\/\/[^/]+/, "").slice(0, 100)}`);
    });
    await login(page, env[ek], env[pk], role === "player" ? /\/player/ : /\/dashboard/);

    for (const route of ROUTES[role]) {
      current = route;
      await page.goto(route);
      await page.waitForTimeout(3500); // datos de Firestore y animaciones
      const found = await page.evaluate((mobile) => {
        const out: string[] = [];
        const text = document.body.innerText;
        for (const bad of ["undefined", "NaN", "[object Object]", "Invalid Date", "null null"]) {
          const re = new RegExp(`(^|[^\\w])${bad.replace(/[[\]]/g, "\\$&")}([^\\w]|$)`);
          if (re.test(text)) {
            const line = text.split("\n").find((l) => l.includes(bad)) || "";
            out.push(`texto basura «${bad}»: "${line.trim().slice(0, 80)}"`);
          }
        }
        document.querySelectorAll("img").forEach((img) => {
          if (img.complete && img.naturalWidth === 0 && img.src && !img.src.startsWith("data:")) out.push(`imagen rota: ${img.src.slice(0, 90)}`);
        });
        if (mobile && document.documentElement.scrollWidth > window.innerWidth + 2) {
          const wide = [...document.querySelectorAll("body *")].find((el) => (el as HTMLElement).getBoundingClientRect().right > window.innerWidth + 2);
          out.push(`scroll horizontal (${document.documentElement.scrollWidth}px > ${window.innerWidth}px), p. ej. <${wide?.tagName.toLowerCase()} class="${String((wide as HTMLElement)?.className || "").slice(0, 60)}">`);
        }
        const unnamed = [...document.querySelectorAll("button, a[href], [role=button]")].filter((el) => {
          const r = (el as HTMLElement).getBoundingClientRect();
          if (r.width === 0 || r.height === 0) return false;
          return !((el as HTMLElement).innerText.trim() || el.getAttribute("aria-label") || el.getAttribute("title") || el.querySelector("img[alt]:not([alt=''])"));
        });
        if (unnamed.length) out.push(`${unnamed.length} botón(es)/enlace(s) sin nombre accesible, p. ej. <${unnamed[0].tagName.toLowerCase()} class="${String((unnamed[0] as HTMLElement).className).slice(0, 60)}">`);
        return out;
      }, isMobile);
      for (const f of found) issues.push(`${route} · ${f}`);
    }
    // Un problema por línea; se informan todos juntos
    expect([...new Set(issues)], [...new Set(issues)].join("\n")).toEqual([]);
  });
}
