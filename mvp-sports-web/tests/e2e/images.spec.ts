import { test, expect } from "@playwright/test";
import { env, admin, exists, idToken } from "./helpers";

// Imágenes subidas: /api/images guarda la foto aparte y /api/images/<id> la entrega con caché larga.
// (El proyecto no tiene bucket de Storage; antes cada subida fallaba o la foto quedaba en base64 dentro del documento.)
const PNG_1PX = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

test.describe("Imágenes", () => {
  test("sube, entrega con caché y rechaza lo que no corresponde", async ({ request, isMobile }) => {
    test.skip(isMobile, "Solo API: basta una vez");
    test.skip(!(await exists(env.E2E_PLAYER_EMAIL)), "Sin jugador de prueba");
    const token = await idToken(env.E2E_PLAYER_EMAIL, env.E2E_PLAYER_PASSWORD);
    const auth = { Authorization: `Bearer ${token}` };

    // Sin sesión, destino inventado, formato no permitido y archivo gigante
    expect((await request.post("/api/images", { data: { folder: "avatars", data: PNG_1PX } })).status()).toBe(401);
    expect((await request.post("/api/images", { headers: auth, data: { folder: "../secret", data: PNG_1PX } })).status()).toBe(400);
    expect((await request.post("/api/images", { headers: auth, data: { folder: "avatars", data: "data:image/svg+xml;base64,PHN2Zy8+" } })).status()).toBe(400);
    const huge = "data:image/png;base64," + Buffer.alloc(800 * 1024, 1).toString("base64");
    expect((await request.post("/api/images", { headers: auth, data: { folder: "avatars", data: huge } })).status()).toBe(413);

    // Subida válida → URL propia que entrega los mismos bytes
    const up = await request.post("/api/images", { headers: auth, data: { folder: "avatars", data: PNG_1PX } });
    expect(up.status()).toBe(200);
    const { id, url } = await up.json();
    expect(url).toBe(`/api/images/${id}`);
    const img = await request.get(url);
    expect(img.status()).toBe(200);
    expect(img.headers()["content-type"]).toBe("image/png");
    expect(img.headers()["cache-control"]).toContain("immutable");
    expect((await img.body()).equals(Buffer.from(PNG_1PX.split(",")[1], "base64"))).toBe(true);

    // La colección no se lee desde el cliente: solo por la ruta
    const doc = await admin().firestore().collection("images").doc(id).get();
    expect(doc.data()?.owner).toBeTruthy();
    expect((await request.get("/api/images/no-existe-123")).status()).toBe(404);
    expect((await request.get("/api/images/..%2Fusers")).status()).toBe(404);
    await doc.ref.delete();
  });
});
