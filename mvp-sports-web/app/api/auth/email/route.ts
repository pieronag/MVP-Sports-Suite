import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/services/firebase-admin";
import { verifyAuthedCaller } from "@/services/server-auth";
import { allowRequest } from "@/services/rateLimit";

// Correos de verificación y de restablecimiento de contraseña (Resend).
// Funciona sin sesión: el enlace solo viaja al buzón indicado, nunca en la respuesta.
export async function POST(request: Request) {
  const caller = await verifyAuthedCaller(request);
  const body = await request.json().catch(() => ({}));
  const cleanEmail = String(body?.email || "").trim().toLowerCase();
  const type = body?.type;
  if (!cleanEmail || (type !== "verify" && type !== "reset")) {
    return NextResponse.json({ error: "El correo y el tipo son requeridos." }, { status: 400 });
  }
  if (!(await allowRequest(`authEmail_${caller?.uid || "anon:" + cleanEmail}`, 3, 60_000))) {
    return NextResponse.json({ error: "Demasiadas solicitudes. Intenta de nuevo en un minuto." }, { status: 429 });
  }
  if (type === "verify" && caller && cleanEmail !== caller.email.toLowerCase()) {
    return NextResponse.json({ error: "Solo puedes verificar tu propio correo." }, { status: 403 });
  }

  try {
    const db = adminDb();
    let name = String(body?.name || "Jugador").slice(0, 80).replace(/[<>&"']/g, "");
    const userQuery = await db.collection("users").where("email", "==", cleanEmail).limit(1).get();
    if (!userQuery.empty) {
      const u = userQuery.docs[0].data();
      name = String(u.displayName || u.fullName || name).replace(/[<>&"']/g, "");
    }
    const emailSettings = (await db.collection("settings_private").doc("email").get()).data()
      || (await db.collection("settings").doc("email").get()).data() || {};
    const resendApiKey = emailSettings.resendApiKey || process.env.RESEND_API_KEY;
    const fromEmail = emailSettings.fromEmail || process.env.RESEND_FROM_EMAIL || "MVP Sports <noreply@mvpsports.cl>";
    const actionCodeSettings = { url: "https://mvpsports.cl", handleCodeInApp: false };

    let actionLink = "";
    let subject = "", title = "", description = "", buttonText = "";
    try {
      if (type === "verify") {
        actionLink = await adminAuth().generateEmailVerificationLink(cleanEmail, actionCodeSettings);
        subject = "Verifica tu correo electrónico - MVP Sports";
        title = "Activa tu Cuenta";
        description = `Hola, ${name}. Gracias por unirte a MVP Sports. Para activar tu cuenta y poder iniciar sesión en la aplicación móvil y el panel de control, haz clic en el botón de abajo:`;
        buttonText = "Verificar Cuenta";
      } else {
        actionLink = await adminAuth().generatePasswordResetLink(cleanEmail, actionCodeSettings);
        subject = "Restablece tu contraseña - MVP Sports";
        title = "Restablece tu Contraseña";
        description = `Hola, ${name}. Hemos recibido una solicitud para restablecer tu contraseña. Si no realizaste esta solicitud, puedes ignorar este correo. De lo contrario, haz clic en el siguiente botón para continuar:`;
        buttonText = "Restablecer Contraseña";
      }
    } catch (e: any) {
      // Respuesta idéntica exista o no la cuenta (evita enumerar correos)
      if (e?.code === "auth/user-not-found" || e?.code === "auth/email-not-found") return NextResponse.json({ success: true });
      // Firebase a veces responde "internal-error" para correos inexistentes: se confirma antes de fallar
      const exists = await adminAuth().getUserByEmail(cleanEmail).then(() => true).catch((x: any) => x?.code !== "auth/user-not-found");
      if (!exists) return NextResponse.json({ success: true });
      throw e;
    }

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body {
      background-color: #020617;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      background-color: #020617;
      padding: 40px 20px;
    }
    .container {
      max-width: 500px;
      margin: 0 auto;
      background-color: #0f172a;
      border: 1px solid rgba(255,255,255,0.05);
      border-radius: 28px;
      overflow: hidden;
      box-shadow: 0 20px 50px rgba(0,0,0,0.6);
    }
    .header {
      background: linear-gradient(135deg, #0f172a, #064e3b);
      padding: 40px 30px;
      text-align: center;
      border-bottom: 2px solid #10b981;
    }
    .logo-img {
      height: 55px;
      max-width: 220px;
      object-fit: contain;
      margin: 0 auto;
      display: block;
    }
    .content {
      padding: 40px 35px;
      text-align: center;
    }
    h1 {
      font-size: 22px;
      font-weight: 900;
      color: #f8fafc;
      margin-top: 0;
      margin-bottom: 15px;
      text-transform: uppercase;
      letter-spacing: -0.5px;
    }
    p {
      color: #94a3b8;
      font-size: 14px;
      line-height: 1.6;
      margin-top: 0;
      margin-bottom: 30px;
      text-align: left;
    }
    .cta-button {
      display: inline-block;
      background-color: #10b981;
      color: #020617 !important;
      font-size: 13px;
      font-weight: 900;
      text-transform: uppercase;
      text-decoration: none;
      letter-spacing: 1px;
      padding: 16px 36px;
      border-radius: 16px;
      box-shadow: 0 10px 20px rgba(16, 185, 129, 0.25);
      transition: all 0.3s ease;
      margin-bottom: 10px;
    }
    .footer {
      background-color: #0b0f19;
      padding: 25px 30px;
      text-align: center;
      border-top: 1px solid rgba(255,255,255,0.05);
    }
    .footer-text {
      color: #64748b;
      font-size: 10px;
      font-weight: 700;
      margin: 0;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <img src="https://mvpsports.cl/Logo.png" alt="MVP Sports" class="logo-img" />
      </div>
      <div class="content">
        <h1>${title}</h1>
        <p>${description}</p>
        
        <a href="${actionLink}" class="cta-button" target="_blank">${buttonText}</a>
        
        <p style="color: #64748b; font-size: 11px; margin-top: 30px; margin-bottom: 0; text-align: center;">
          Si el botón no funciona, puedes copiar y pegar el siguiente enlace en tu navegador:<br>
          <a href="${actionLink}" style="color: #10b981; word-break: break-all; text-decoration: none; font-size: 11px;">${actionLink}</a>
        </p>
      </div>
      <div class="footer">
        <p class="footer-text">MVP Sports Suite © 2026 • El Futuro del Deporte</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

    if (!resendApiKey) {
      console.error("RESEND_API_KEY no configurada: no se pudo enviar el correo.");
      return NextResponse.json({ success: false, error: "El envío de correos no está configurado." }, { status: 503 });
    }
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendApiKey}` },
      body: JSON.stringify({ from: fromEmail, to: [cleanEmail], subject, html: htmlContent }),
    });
    if (!resp.ok) {
      console.error("Resend", await resp.text());
      return NextResponse.json({ success: false, error: "No se pudo enviar el correo." }, { status: 502 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("auth email", e);
    return NextResponse.json({ error: "Error interno al enviar correo." }, { status: 500 });
  }
}
