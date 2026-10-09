import {onCall, HttpsError} from "firebase-functions/v2/https";
import {onSchedule} from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {checkRateLimit} from "./rateLimiter";

admin.initializeApp();

const db = admin.firestore();

// Token Mercado Pago del recinto (tenant_secrets) o de la plataforma (settings_private)
async function resolveMercadoPagoToken(tenantId?: string): Promise<string | undefined> {
  if (tenantId && tenantId !== "system") {
    const sec = (await db.collection("tenant_secrets").doc(tenantId).get()).data();
    if (sec?.mercadopagoAccessToken) return sec.mercadopagoAccessToken;
    const legacy = (await db.collection("tenants").doc(tenantId).get()).data();
    if (legacy?.mercadopagoAccessToken) return legacy.mercadopagoAccessToken;
  }
  const priv = (await db.collection("settings_private").doc("global").get()).data();
  return priv?.mercadopagoAccessToken || process.env.MERCADOPAGO_ACCESS_TOKEN || undefined;
}

interface GamificationSettings {
  xpPerCheckin: number;
  xpPerMatch: number;
  xpPerWin: number;
  xpPerMvp: number;
  tiers: {
    bronze: number;
    silver: number;
    gold: number;
    elite: number;
  };
}

const DEFAULT_SETTINGS: GamificationSettings = {
  xpPerCheckin: 50,
  xpPerMatch: 100,
  xpPerWin: 150,
  xpPerMvp: 200,
  tiers: {bronze: 0, silver: 1000, gold: 5000, elite: 10000},
};

export const awardPlayerXp = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "Debes estar autenticado para ganar XP.",
    );
  }

  const uid = request.auth.uid;
  await checkRateLimit("awardPlayerXp", uid);

  const {action} = request.data as {
    action: "checkin" | "match" | "win" | "mvp";
  };

  if (action === "win" || action === "mvp") {
    const requesterDoc = await db.collection("profiles").doc(uid).get();
    const requesterRole = requesterDoc.data()?.role || "player";
    if (!["superadmin", "admin", "owner", "manager", "staff"].includes(requesterRole)) {
      throw new HttpsError(
        "permission-denied",
        "Solo el personal autorizado puede otorgar XP por victorias o MVP.",
      );
    }
  }

  try {
    const [settingsDoc, userDoc] = await Promise.all([
      db.collection("settings").doc("global").get(),
      db.collection("profiles").doc(uid).get(),
    ]);

    const globalData = settingsDoc.data();
    const settings = (globalData?.gamification as GamificationSettings) ||
      DEFAULT_SETTINGS;
    const userData = userDoc.data();

    if (!userData) {
      throw new HttpsError("not-found", "Usuario no encontrado.");
    }

    let xpGained = 0;
    switch (action) {
    case "checkin": xpGained = settings.xpPerCheckin; break;
    case "match": xpGained = settings.xpPerMatch; break;
    case "win": xpGained = settings.xpPerWin; break;
    case "mvp": xpGained = settings.xpPerMvp; break;
    }

    const newXp = (userData.xp || 0) + xpGained;
    const newOvr = (userData.ovr || 0) + Math.floor(xpGained / 10);

    let newTier = "Bronce";
    if (newXp >= settings.tiers.elite) newTier = "Elite";
    else if (newXp >= settings.tiers.gold) newTier = "Oro";
    else if (newXp >= settings.tiers.silver) newTier = "Plata";

    await db.collection("profiles").doc(uid).update({
      xp: newXp,
      ovr: newOvr,
      tier: newTier,
      lastXpUpdate: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      xpGained,
      newXp,
      newTier,
    };
  } catch (error) {
    logger.error("Error rewarding XP:", error);
    throw new HttpsError("internal", "Error al procesar la recompensa.");
  }
});

/**
 * Handle No-Shows: Cancel bookings that passed their start time without check-in
 * and award a strike to the user.
 * Runs every 15 minutes.
 * 
 * DESACTIVADO (V17.25): Este cron job/función agendada de fondo ha sido desactivado permanentemente.
 * La verificación y limpieza de no-shows ahora se gestiona de manera reactiva e interactiva 
 * exclusivamente a través de los flujos de la aplicación del manager y del jugador.
 *
 * export const handleNoShows = onSchedule("every 15 minutes", async (event) => {
 *   const now = admin.firestore.Timestamp.now();
 *   
 *   try {
 *     const snap = await db.collection("bookings")
 *       .where("checkIn", "==", false)
 *       .where("status", "==", "confirmed")
 *       .get();
 * 
 *     if (snap.empty) return;
 * 
 *     const batch = db.batch();
 *     const userUpdates: { [uid: string]: number } = {};
 * 
 *     snap.docs.forEach((doc) => {
 *       const data = doc.data();
 *       const startTime = data.startTime?.toDate?.() || 
 *                         (typeof data.startTime === "string" ? new Date(`${data.date?.toDate?.().toISOString().split("T")[0]}T${data.startTime}`) : null);
 *       
 *       if (!startTime) return;
 * 
 *       const limit = startTime.getTime() + (15 * 60 * 1000);
 *       
 *       if (now.toMillis() > limit) {
 *         batch.update(doc.ref, {
 *           status: "cancelled",
 *           noShow: true,
 *           updatedAt: admin.firestore.FieldValue.serverTimestamp(),
 *         });
 * 
 *         if (data.userId) {
 *           userUpdates[data.userId] = (userUpdates[data.userId] || 0) + 1;
 *         }
 *       }
 *     });
 * 
 *     for (const uid in userUpdates) {
 *       const profileRef = db.collection("profiles").doc(uid);
 *       batch.update(profileRef, {
 *         strikes: admin.firestore.FieldValue.increment(userUpdates[uid]),
 *         lastStrikeAt: admin.firestore.FieldValue.serverTimestamp(),
 *       });
 *     }
 * 
 *     await batch.commit();
 *     logger.info(`Processed ${Object.keys(userUpdates).length} users with no-shows.`);
 *   } catch (error) {
 *     logger.error("Error in handleNoShows:", error);
 *   }
 * });
 */

/**
 * Cleanup expired pending bookings (older than 15 minutes)
 * Runs every 5 minutes
 */
export const cleanupPendingBookings = onSchedule("every 5 minutes", async (event) => {
  const now = admin.firestore.Timestamp.now().toMillis();
  const limit = now - (15 * 60 * 1000); // 15 minutes ago

  try {
    const expiredSnap = await db.collection("bookings")
      .where("paymentStatus", "==", "pending")
      .where("createdAt", "<=", admin.firestore.Timestamp.fromMillis(limit))
      .get();

    if (expiredSnap.empty) {
      return;
    }

    const batch = db.batch();
    expiredSnap.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    logger.info(`Cleaned up ${expiredSnap.size} expired pending bookings.`);
  } catch (error) {
    logger.error("Cleanup error:", error);
  }
});

/**
 * Refund Booking Payment: Realiza un reembolso parcial (descontando 3% por comisión)
 * para reservas canceladas con más de 4 horas de anticipación.
 */
export const refundBookingPayment = onCall({region: "southamerica-west1"}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes estar autenticado.");
  }

  const uid = request.auth.uid;
  await checkRateLimit("refundBookingPayment", uid);

  const {bookingId} = request.data as { bookingId: string };
  if (!bookingId) {
    throw new HttpsError("invalid-argument", "Debe proveer un bookingId.");
  }

  try {
    const bookingDoc = await db.collection("bookings").doc(bookingId).get();
    const bookingData = bookingDoc.data();

    if (!bookingData) {
      throw new HttpsError("not-found", "No se encontró la reserva.");
    }

    if (bookingData.userId !== request.auth.uid) {
      throw new HttpsError("permission-denied", "No tienes permisos sobre esta reserva.");
    }

    let paymentDoc = null;
    let paymentData: any = null;
    let originalAmount = bookingData.totalPrice || bookingData.price || 0;

    const paymentSnap = await db.collection("payments")
      .where("bookingId", "==", bookingId)
      .limit(1)
      .get();

    if (!paymentSnap.empty) {
      paymentDoc = paymentSnap.docs[0];
      
      // Bloqueo por idempotencia
      await db.runTransaction(async (transaction) => {
        const pDoc: any = await transaction.get(paymentDoc!.ref);
        if (pDoc.data()?.isRefundProcessing) {
          throw new HttpsError("aborted", "El reembolso ya está en proceso. Por favor, espere.");
        }
        // Marcar como en proceso
        transaction.update(paymentDoc!.ref, { isRefundProcessing: true });
      });

      const refreshedDoc = await paymentDoc.ref.get();
      paymentData = refreshedDoc.data();
      originalAmount = paymentData?.amount || originalAmount;
    }

    // Reembolso parcial: se descuenta el 3% de comisión de la pasarela
    const fee = Math.round(originalAmount * 0.03);
    const refundAmount = Math.max(0, originalAmount - fee);

    let refundResult: any;
    const mpPaymentId = paymentData?.mercadopagoPaymentId;
    const paidOnline = paymentData?.method === "mercadopago" && paymentData?.status === "approved" && mpPaymentId;

    if (paidOnline) {
      const accessToken = await resolveMercadoPagoToken(paymentData.tenantId || bookingData.tenantId);
      try {
        if (!accessToken) throw new Error("Recinto sin credenciales de Mercado Pago.");
        const resp = await fetch(`https://api.mercadopago.com/v1/payments/${mpPaymentId}/refunds`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`,
            "X-Idempotency-Key": `refund-${bookingId}`,
          },
          body: JSON.stringify({amount: refundAmount}),
        });
        const data: any = await resp.json();
        if (!resp.ok) throw new Error(data?.message || `Mercado Pago respondió ${resp.status}`);
        refundResult = {type: "REFUNDED", mercadopagoRefundId: data.id, nullified_amount: refundAmount, response_code: 0};
      } catch (apiError: any) {
        logger.error(`Mercado Pago refund failed for booking ${bookingId}:`, apiError.message || apiError);
        refundResult = {type: "FAILED_PHYSICAL_REFUND", error: apiError.message || String(apiError), response_code: -99, nullified_amount: 0};
      }
    } else if (paymentData && paymentData.status === "approved") {
      // Pagos históricos (Webpay/Oneclick): Transbank ya no está integrado
      refundResult = {
        type: "FAILED_PHYSICAL_REFUND",
        error: "Pago histórico con Transbank: el reembolso debe hacerse manualmente desde el portal de Transbank.",
        response_code: -98,
        nullified_amount: 0,
      };
    } else {
      // Sin pago online aprobado (pago en recinto o pendiente): solo se cancela
      refundResult = {type: "NO_ONLINE_PAYMENT", nullified_amount: 0, response_code: 0};
    }

    // Registrar en Firestore el resultado de la anulación parcial
    const batch = db.batch();
    batch.update(bookingDoc.ref, {
      paymentStatus: refundResult.type === "FAILED_PHYSICAL_REFUND" ? "refund_failed" :
        refundResult.type === "NO_ONLINE_PAYMENT" ? (bookingData.paymentStatus || "pending") : "refunded",
      status: "cancelled",
      refundAmount: refundResult.nullified_amount || 0,
      refundFee: refundResult.nullified_amount ? fee : 0,
      refundedAt: admin.firestore.FieldValue.serverTimestamp(),
      refundDetails: refundResult,
    });

    if (paymentDoc) {
      batch.update(paymentDoc.ref, {
        status: refundResult.type === "FAILED_PHYSICAL_REFUND" ? "refund_failed" : "refunded",
        refundAmount: refundResult.nullified_amount || 0,
        refundFee: refundResult.nullified_amount ? fee : 0,
        refundDetails: refundResult,
        isRefundProcessing: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();
    logger.info(`Reembolso procesado con éxito para reserva ${bookingId}. Devuelto: $${refundAmount}`);

    return {
      success: refundResult.type !== "FAILED_PHYSICAL_REFUND",
      refundAmount: refundResult.nullified_amount || 0,
      fee,
      responseCode: refundResult.response_code || 0,
      error: refundResult.error || null,
    };

  } catch (error: any) {
    logger.error("Error al procesar reembolso:", error);
    throw new HttpsError("internal", error.message || "Error al procesar el reembolso.");
  }
});

/**
 * Envía un correo electrónico personalizado de autenticación (activación o restablecimiento)
 * utilizando Resend y plantillas HTML modernas.
 */
export const sendAuthEmail = onCall({region: "southamerica-west1"}, async (request) => {
  const { email, type, name: providedName } = request.data as {
    email: string;
    type: "verify" | "reset";
    name?: string;
  };

  if (!email || !type) {
    throw new HttpsError("invalid-argument", "El correo y el tipo son requeridos.");
  }

  const cleanEmail = email.trim().toLowerCase();

  // "Olvidé mi contraseña" funciona sin sesión; la verificación exige sesión
  if (!request.auth && type !== "reset") {
    throw new HttpsError("unauthenticated", "Debes estar autenticado.");
  }
  // Límite por usuario y, sin sesión, por correo destino (evita spam a terceros)
  await checkRateLimit("sendAuthEmail", request.auth?.uid || `anon:${cleanEmail}`);

  // Verificación: solo para el propio correo de la sesión
  if (type === "verify" && cleanEmail !== (request.auth?.token.email || "").toLowerCase()) {
    throw new HttpsError("permission-denied", "Solo puedes verificar tu propio correo.");
  }

  try {
    // 1. Resolver el nombre real del usuario desde Firestore si no está provisto
    let name = providedName || "Jugador";
    const userQuery = await db.collection("users")
      .where("email", "==", cleanEmail)
      .limit(1)
      .get();
      
    if (!userQuery.empty) {
      const userData = userQuery.docs[0].data();
      name = userData.displayName || userData.fullName || name;
    }

    // 2. Cargar configuraciones de correo desde Firestore
    // settings_private/email (sin acceso cliente); settings/email es heredado y público
    const privateEmailDoc = await db.collection("settings_private").doc("email").get();
    const emailSettings = privateEmailDoc.data() || (await db.collection("settings").doc("email").get()).data() || {};
    const resendApiKey = emailSettings.resendApiKey || process.env.RESEND_API_KEY;
    const fromEmail = emailSettings.fromEmail || process.env.RESEND_FROM_EMAIL || "MVP Sports <noreply@mvpsports.cl>";

    // 3. Configurar redirección post-acción
    const actionCodeSettings = {
      url: "https://mvpsports.cl",
      handleCodeInApp: false,
    };

    let actionLink = "";
    let subject = "";
    let title = "";
    let description = "";
    let buttonText = "";

    const adminAuth = admin.auth();

    if (type === "verify") {
      actionLink = await adminAuth.generateEmailVerificationLink(cleanEmail, actionCodeSettings);
      subject = "Verifica tu correo electrónico - MVP Sports";
      title = "Activa tu Cuenta";
      description = `Hola, ${name}. Gracias por unirte a MVP Sports. Para activar tu cuenta y poder iniciar sesión en la aplicación móvil y el panel de control, haz clic en el botón de abajo:`;
      buttonText = "Verificar Cuenta";
    } else if (type === "reset") {
      try {
        actionLink = await adminAuth.generatePasswordResetLink(cleanEmail, actionCodeSettings);
      } catch (e: any) {
        // Respuesta idéntica exista o no la cuenta (evita enumerar correos)
        if (e?.code === "auth/user-not-found" || e?.code === "auth/email-not-found") {
          return {success: true, method: "resend"};
        }
        throw e;
      }
      subject = "Restablece tu contraseña - MVP Sports";
      title = "Restablece tu Contraseña";
      description = `Hola, ${name}. Hemos recibido una solicitud para restablecer tu contraseña. Si no realizaste esta solicitud, puedes ignorar este correo. De lo contrario, haz clic en el siguiente botón para continuar:`;
      buttonText = "Restablecer Contraseña";
    } else {
      throw new HttpsError("invalid-argument", "Tipo de correo inválido.");
    }

    // Plantilla HTML Premium con Logo Oficial
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
      // Nunca devolver el enlace al cliente: permitiría tomar cuentas ajenas
      logger.error("RESEND_API_KEY no configurada: no se pudo enviar el correo.");
      return {success: false, error: "El envío de correos no está configurado."};
    }

    // Enviar correo vía Resend
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [cleanEmail],
        subject: subject,
        html: htmlContent,
      }),
    });

    const resData = await response.json() as any;

    if (!response.ok) {
      logger.error("Error de Resend API:", resData);
      return {
        success: false,
        error: "No se pudo enviar el correo.",
      };
    }

    logger.info(`Correo custom enviado con éxito a ${cleanEmail} vía Resend.`);
    return {
      success: true,
      method: "resend",
      id: resData.id,
    };

  } catch (error: any) {
    logger.error("Error en sendAuthEmail Cloud Function:", error);
    throw new HttpsError("internal", error.message || "Error interno al enviar correo.");
  }
});

export {onBookingWritten} from "./publicProjections";
