import { test, expect } from "@playwright/test";
import { env, admin, exists, idToken } from "./helpers";

// Clics simultáneos y carreras por el último cupo: el servidor debe inscribir una sola vez y no sobrepasar el cupo.
// Crea su torneo y su clase gratis (cupo 1) en el recinto de prueba, y los borra al terminar.
const TENANT = "e2e-recinto-prueba";

test.describe.configure({ mode: "serial" });
test.skip(({ isMobile }) => isMobile, "Es lógica del servidor: basta una vez");

test("último cupo: inscripciones simultáneas no sobrepasan el cupo ni duplican", async ({ request }) => {
  test.skip(!(await exists(env.E2E_PLAYER_B_EMAIL)), "Sin datos de prueba (script de datos de prueba)");
  test.setTimeout(120_000);
  const db = admin().firestore();
  const [A, B, O] = await Promise.all([env.E2E_PLAYER_EMAIL, env.E2E_PLAYER_B_EMAIL, env.E2E_OWNER_EMAIL].map((e) => admin().auth().getUserByEmail(e)));
  const [tA, tB] = await Promise.all([idToken(env.E2E_PLAYER_EMAIL, env.E2E_PLAYER_PASSWORD), idToken(env.E2E_PLAYER_B_EMAIL, env.E2E_PLAYER_B_PASSWORD)]);

  const tour = db.collection("tournaments").doc("e2e-torneo-cupo1");
  const cls = db.collection("academy_classes").doc("e2e-clase-cupo1");
  const teamA = db.collection("teams").doc("e2e-equipo-a"), teamB = db.collection("teams").doc("e2e-equipo-b");
  await Promise.all([
    tour.set({ tenantId: TENANT, ownerId: O.uid, name: "Torneo E2E cupo 1", sport: "Pádel", price: 0, maxTeams: 1, teams: [], enrolledTeams: 0, status: "open" }),
    cls.set({ tenantId: TENANT, ownerId: O.uid, name: "Clase E2E cupo 1", sport: "Pádel", price: 0, maxStudents: 1, enrolledStudents: 0, status: "active" }),
    teamA.set({ name: "Equipo A E2E", ownerId: A.uid, members: [A.uid], sport: "Pádel" }),
    teamB.set({ name: "Equipo B E2E", ownerId: B.uid, members: [B.uid], sport: "Pádel" }),
  ]);
  try {
    const post = (token: string, url: string, data: object) => request.post(url, { headers: { Authorization: `Bearer ${token}` }, data });

    // Torneo: A y B a la vez, con doble clic cada uno
    const t = await Promise.all([
      post(tA, "/api/tournaments/register", { tournamentId: tour.id, teamId: teamA.id }), post(tA, "/api/tournaments/register", { tournamentId: tour.id, teamId: teamA.id }),
      post(tB, "/api/tournaments/register", { tournamentId: tour.id, teamId: teamB.id }), post(tB, "/api/tournaments/register", { tournamentId: tour.id, teamId: teamB.id }),
    ]);
    const tOk = t.filter((r) => r.ok()).length, t5xx = t.filter((r) => r.status() >= 500).length;
    const tData = (await tour.get()).data()!;
    const regs = await db.collection("tournament_registrations").where("tournamentId", "==", tour.id).get();
    expect(t5xx, "ningún error 500").toBe(0);
    expect(tData.teams.length, "equipos inscritos").toBe(1);
    expect(regs.size, "inscripciones creadas").toBe(1);
    expect(tOk, "respuestas exitosas (doble clic del mismo equipo cuenta como la misma inscripción)").toBeLessThanOrEqual(2);

    // Academia: 5 clics de A y 5 de B a la vez, cupo 1
    const c = await Promise.all([...Array(5)].flatMap(() => [post(tA, "/api/academies/enroll", { classId: cls.id }), post(tB, "/api/academies/enroll", { classId: cls.id })]));
    const cData = (await cls.get()).data()!;
    const enr = await db.collection("academy_enrollments").where("classId", "==", cls.id).get();
    expect(c.filter((r) => r.status() >= 500).length, "ningún error 500").toBe(0);
    expect(cData.enrolledStudents, "alumnos contados").toBe(1);
    expect(enr.size, "matrículas creadas").toBe(1);
  } finally {
    for (const q of [db.collection("tournament_registrations").where("tournamentId", "==", tour.id), db.collection("academy_enrollments").where("classId", "==", cls.id)])
      for (const d of (await q.get()).docs) await d.ref.delete();
    await Promise.all([tour.delete(), cls.delete(), teamA.delete(), teamB.delete()]);
  }
});
