import {onCall, onRequest, HttpsError} from "firebase-functions/v2/https";
import {onSchedule} from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {transbank} from "./transbank";
import {checkRateLimit} from "./rateLimiter";
import {IntegrationCommerceCodes} from "transbank-sdk";

admin.initializeApp();

const db = admin.firestore();

function withTimeout<T>(promise: Promise<T>, ms: number, msg: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout: ${msg} (${ms}ms)`)), ms)
    ),
  ]);
}

// Configura estas variables de entorno con las URLs reales después del deploy:
// CF_BASE_URL → URL de commitWebpayTransaction (HTTP onRequest)
// ONECLICK_BASE_URL → URL de finishOneclickInscription (HTTP onRequest)
function getBaseUrl(): string {
  return process.env.CF_BASE_URL || "https://commitwebpaytransaction-i6cn7w2g5a-tl.a.run.app";
}

function getOneclickBaseUrl(): string {
  return process.env.ONECLICK_BASE_URL || "https://finishoneclickinscription-i6cn7w2g5a-tl.a.run.app";
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
      db.collection("settings").doc("gamification").get(),
      db.collection("profiles").doc(uid).get(),
    ]);

    const settings = (settingsDoc.data() as GamificationSettings) ||
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
 * WEBPAY PLUS: Iniciar Transacción
 */
export const createWebpayTransaction = onCall(
  {region: "southamerica-west1"},
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Debes estar autenticado.");
    }

    const uid = request.auth.uid;
    await checkRateLimit("createWebpayTransaction", uid);

    const {bookingId, tenantId, amount, buyOrder, bookingData, returnUrl} = request.data;

    try {
      const tenantDoc = await db.collection("tenants").doc(tenantId).get();
      const tenantData = tenantDoc.data();

      const commerceCode = tenantData?.transbankCommerceCode;
      const apiKey = tenantData?.transbankApiKey;

      const baseUrl = getBaseUrl();
      const commitUrl = `${baseUrl}?tenantId=${tenantId}`;

      const response = await withTimeout(
        transbank.createWebpay(
          buyOrder || `ORD-${Date.now()}`,
          uid,
          amount,
          commitUrl,
          commerceCode,
          apiKey,
        ),
        15000,
        "Transbank.createWebpay",
      );

      await db.collection("payments").add({
        userId: uid,
        bookingId,
        tenantId,
        amount,
        buyOrder: buyOrder || `ORD-${Date.now()}`,
        token: response.token,
        status: "pending",
        method: "webpay_plus",
        pendingBookingData: bookingData || null,
        returnUrl: returnUrl || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        url: response.url,
        token: response.token,
      };
    } catch (error: any) {
      logger.error("Webpay Create Error:", error);
      throw new HttpsError(
        "internal",
        error.message || "Error al iniciar pago con Webpay.",
      );
    }
  });

/**
 * WEBPAY PLUS: Confirmar Transacción (Webhook)
 */
export const commitWebpayTransaction = onRequest(
  {region: "southamerica-west1"},
  async (req, res) => {
    const requestToken = req.query._token as string;
    const settingsDoc = await db.collection("settings").doc("webhook_secret").get();
    const webhookSecret = settingsDoc.data()?.secret;
    if (webhookSecret && requestToken !== webhookSecret) {
      logger.error("Webhook commit: invalid secret token");
      return res.redirect("mvpdeportes://checkout/error?reason=invalid_webhook");
    }

    const token = req.body.token_ws || req.query.token_ws || req.body.TBK_TOKEN || req.query.TBK_TOKEN;
    const tenantId = req.query.tenantId as string;
    const fallbackUrl = req.query.fallbackUrl as string;

    if (!token) return res.redirect(fallbackUrl || "mvpdeportes://checkout/error?reason=no_token");

    try {
      let commerceCode;
      let apiKey;

      if (tenantId) {
        const tDoc = await db.collection("tenants").doc(tenantId).get();
        commerceCode = tDoc.data()?.transbankCommerceCode;
        apiKey = tDoc.data()?.transbankApiKey;
      }

      const result = await transbank.commitWebpay(
        token as string,
        commerceCode,
        apiKey,
      );

      if (result.vci === "TSY" || result.response_code === 0) {
        const paySnap = await db.collection("payments")
          .where("token", "==", token).limit(1).get();
        let redirectUrl: string | undefined;

        if (!paySnap.empty) {
          const payDoc = paySnap.docs[0];
          const payData = payDoc.data();
          redirectUrl = payData.returnUrl;

          if (payData.status === "approved") {
            logger.info(`Webpay commit: payment already processed for token ${token}`);
            return res.redirect(redirectUrl || `mvpdeportes://checkout/success?token=${token}`);
          }

          const bookingId = payData.bookingId;
          const pendingBookingData = payData.pendingBookingData;

      const batch = db.batch();
      batch.update(payDoc.ref, {status: "approved", result});
      if (bookingId) {
          if (pendingBookingData) {
          const rawDate = pendingBookingData.date;
          let finalDate = admin.firestore.FieldValue.serverTimestamp();
          if (rawDate) {
            if (typeof rawDate?.toDate === "function") {
              finalDate = rawDate;
            } else if (typeof rawDate === "string") {
              finalDate = admin.firestore.Timestamp.fromDate(new Date(rawDate));
            } else if (rawDate?._seconds != null) {
              finalDate = new admin.firestore.Timestamp(rawDate._seconds, rawDate._nanoseconds || 0);
            } else if (rawDate?.seconds != null) {
              finalDate = new admin.firestore.Timestamp(rawDate.seconds, rawDate.nanoseconds || 0);
            }
          }
          batch.set(db.collection("bookings").doc(bookingId), {
            ...pendingBookingData,
            date: finalDate,
            paymentStatus: "paid",
            status: "confirmed",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        } else {
          batch.set(db.collection("bookings").doc(bookingId), {
            paymentStatus: "paid",
            status: "confirmed",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          }, {merge: true});
        }
      }
      await batch.commit();
    }
    return res.redirect(redirectUrl || `mvpdeportes://checkout/success?token=${token}`);
  } else {
    return res.redirect(fallbackUrl || `mvpdeportes://checkout/error?token=${token}&code=${result.response_code}`);
  }
} catch (error: any) {
  logger.error("Webpay Commit Error:", error.message || error);
  return res.redirect(fallbackUrl || `mvpdeportes://checkout/error?err=${encodeURIComponent(error.message || "unknown")}`);
}
  });

/**
 * ONECLICK: Iniciar Inscripción de Tarjeta
 */
export const startOneclickInscription = onCall(
  {region: "southamerica-west1"},
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Debes estar autenticado.");
    }

    const uid = request.auth.uid;
    await checkRateLimit("createWebpayTransaction", uid);

    const {email, cardNumber, holderName, expiryMonth, expiryYear} = request.data;
    const cleanEmail = email || request.auth.token.email || `user_${uid}@mvpsports.cl`;

    logger.info(`Starting Inscription for UID: ${uid} | Email: ${cleanEmail}`);

    try {
      // MODO RÁPIDO PARA PRUEBAS: Si es la tarjeta de Transbank, vinculamos directo
      const cleanCard = (cardNumber || "").replace(/\s/g, "");
      if (cleanCard === "597087654321" || cleanCard === "597011112222") {
        logger.info(`Fast Mock Card Detected (${cleanCard}) - Bypassing Transbank`);
        const isRejectedMock = cleanCard === "597011112222";
        const userRef = db.collection("profiles").doc(uid);
        const userSnap = await userRef.get();
        const userData = userSnap.data();
        const realName = userData?.displayName || userData?.fullName || holderName || "JUGADOR MVP";

        await userRef.collection("cards").add({
          tbkUser: isRejectedMock ? `MOCK_USER_REJECT_${uid}` : `MOCK_USER_SUCCESS_${uid}`,
          authorizationCode: "123456",
          last4: isRejectedMock ? "2222" : "4321",
          brand: "Visa",
          holderName: realName.toUpperCase(),
          expiryMonth: expiryMonth || "12",
          expiryYear: expiryYear || "2030",
          isDefault: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        return { 
          url: null, 
          token: "MOCK_SUCCESS",
          isMock: true 
        };
      }

      const resUrl = getOneclickBaseUrl();
      
      // Intentar cargar llaves maestras globales
      const masterDoc = await db.collection("settings").doc("transbank_master").get();
      const mData = masterDoc.data();
      const commerceCode = mData?.commerceCode;
      const apiKey = mData?.apiKey;

      logger.info(`Oneclick Mall Start - CC: ${commerceCode || "DEFAULT"} | resUrl: ${resUrl}`);

      const response = await transbank.startInscription(uid, cleanEmail, resUrl, commerceCode, apiKey);

      return {
        url: response.url_webpay,
        token: response.token,
      };
    } catch (error: any) {
      logger.error("Oneclick Inscription Start Error Detail:", {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      throw new HttpsError(
        "internal",
        `Error Transbank: ${error.message || "No se pudo iniciar la inscripción"}`,
      );
    }
  });

/**
 * ONECLICK: Finalizar Inscripción (Webhook/Redirect)
 */
export const finishOneclickInscription = onRequest(
  {region: "southamerica-west1"},
  async (req, res) => {
    const requestToken = req.query._token as string;
    const settingsDoc = await db.collection("settings").doc("webhook_secret").get();
    const webhookSecret = settingsDoc.data()?.secret;
    if (webhookSecret && requestToken !== webhookSecret) {
      logger.error("Oneclick finish: invalid secret token");
      return res.redirect("https://mvpsports.cl/player/billetera?error=invalid_webhook");
    }

    const token = req.body.TBK_TOKEN || req.query.TBK_TOKEN || req.body.token_ws || req.query.token_ws;

    logger.info(`Finish Inscription Check - Method: ${req.method} | Token: ${token}`);

    if (!token) {
      logger.error("No token received from Transbank");
      return res.redirect("https://mvpsports.cl/player/billetera?error=no_token");
    }

    try {
      const masterDoc = await db.collection("settings").doc("transbank_master").get();
      const mData = masterDoc.data();
      const commerceCode = mData?.commerceCode;
      const apiKey = mData?.apiKey;

      // Idempotency: check if this token was already processed
      const existingCard = await db.collection("settings").doc(`inscription_${token}`).get();
      if (existingCard.exists) {
        logger.info(`Oneclick finish: inscription ${token} already processed`);
        return res.redirect("https://mvpsports.cl/player/billetera?card=already");
      }

      const result = await transbank.finishInscription(token as string, commerceCode, apiKey);
      logger.info("Oneclick Finish Result:", JSON.stringify(result));

      if (result.response_code === 0) {
        const uid = result.username;
        const userRef = db.collection("profiles").doc(uid);

        await userRef.collection("cards").add({
          tbkUser: result.tbk_user,
          authorizationCode: result.authorization_code,
          last4: result.card_number,
          brand: result.card_type,
          isDefault: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Mark as processed for idempotency
        await db.collection("settings").doc(`inscription_${token}`).set({
          processed: true,
          uid,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return res.redirect(`https://mvpsports.cl/player/billetera?card=${result.card_number}`);
      } else {
        logger.warn(`Oneclick rejected code: ${result.response_code}`);
        return res.redirect(`https://mvpsports.cl/player/billetera?error=rejected&code=${result.response_code}`);
      }
    } catch (error: any) {
      logger.error("Oneclick Finish Error:", error.message || error);
      return res.redirect(`https://mvpsports.cl/player/billetera?error=unknown&err=${encodeURIComponent(error.message || "unknown")}`);
    }
  });

/**
 * ONECLICK: Autorizar Pago (Cargar a tarjeta guardada)
 */
export const authorizeOneclickPayment = onCall(
  {region: "southamerica-west1"},
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Debes estar autenticado.");
    }

    const uid = request.auth.uid;
    await checkRateLimit("authorizeOneclickPayment", uid);

    const {amount, bookingId, tenantId, cardId} = request.data;

    try {
      // Determinar qué tarjeta usar
      let cardDoc;
      if (cardId) {
        cardDoc = await db.collection("profiles").doc(uid)
          .collection("cards").doc(cardId).get();
      } else {
        const cardsSnap = await db.collection("profiles").doc(uid)
          .collection("cards").where("isDefault", "==", true)
          .limit(1).get();
        cardDoc = cardsSnap.empty ? null : cardsSnap.docs[0];
      }

      if (!cardDoc || !cardDoc.exists) {
        throw new Error("No se encontró la tarjeta seleccionada.");
      }

      const card = cardDoc.data() || {};
      const tenantDoc = await db.collection("tenants").doc(tenantId).get();
      const tenantData = tenantDoc.data();

      // 1. CARGAR LLAVES MAESTRAS PRIMERO
      const masterDoc = await db.collection("settings").doc("transbank_master").get();
      const mData = masterDoc.data();
      const masterCommerceCode = (mData?.commerceCode || "").toString().trim();
      const masterApiKey = mData?.apiKey;
      
      // 2. DETERMINAR HIJO (Recinto)
      let childCommerceCode = (tenantData?.transbankCommerceCode || "").toString().trim();
      
      // Si el hijo es igual al padre o está vacío, usamos el de pruebas
      if (!childCommerceCode || childCommerceCode === masterCommerceCode) {
        childCommerceCode = IntegrationCommerceCodes.ONECLICK_MALL_CHILD1;
      }
      
      const buyOrder = `PAY-${Date.now()}`;
      logger.info(`AUTORIZANDO PAGO - Padre: ${masterCommerceCode} | Hijo: ${childCommerceCode}`);

      const tbkUser = (card.tbkUser || "").toString();
      if (!tbkUser) {
        throw new HttpsError("failed-precondition",
          "Esta tarjeta no está registrada para Oneclick. Usa Webpay Plus.");
      }

      // MOCK mode para tarjetas de prueba registradas vía Oneclick
      if (tbkUser.toUpperCase().includes("MOCK_USER")) {
        if (tbkUser.toUpperCase().includes("REJECT")) {
          return { success: false, error: "Transacción rechazada (Simulado)", response_code: 1 };
        }
        logger.info("Simulando éxito de pago Oneclick (Modo Prueba)");
        const batch = db.batch();
        const paymentRef = db.collection("payments").doc();
        batch.set(paymentRef, {
          userId: uid, bookingId, amount, buyOrder,
          authorizationCode: "123456", status: "approved", method: "oneclick_mock",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        if (bookingId) {
          batch.update(db.collection("bookings").doc(bookingId), { paymentStatus: "paid", status: "confirmed" });
        }
        await batch.commit();
        return { success: true, buy_order: buyOrder, authorization_code: "123456", amount, response_code: 0 };
      }

      const response = await transbank.authorizeOneclickPayment(
        uid,
        tbkUser,
        buyOrder,
        amount,
        masterCommerceCode,
        masterApiKey,
        childCommerceCode
      );

      if (response.details[0].response_code === 0) {
        const batch = db.batch();

        const paymentRef = db.collection("payments").doc();
        batch.set(paymentRef, {
          userId: uid,
          bookingId,
          amount,
          buyOrder,
          authorizationCode: response.details[0].authorization_code,
          status: "approved",
          method: "oneclick",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        if (bookingId) {
          const bookingRef = db.collection("bookings").doc(bookingId);
          batch.update(bookingRef, {
            paymentStatus: "paid",
            status: "confirmed",
          });
        }

        await batch.commit();
        return {success: true, buyOrder};
      } else {
        return {success: false, error: "Transacción rechazada por el banco."};
      }
    } catch (error: any) {
      logger.error("Oneclick Authorize Error:", error);
      throw new HttpsError(
        "internal",
        error.message || "Error al procesar el pago.",
      );
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

    // Calcular reembolso parcial descontando el 3% de comisión (Transbank + IVA)
    const fee = Math.round(originalAmount * 0.03);
    const refundAmount = Math.max(0, originalAmount - fee);

    let refundResult: any = {
      type: "NULLIFIED_FALLBACK",
      response_code: 0,
      authorization_code: "123456",
      nullified_amount: refundAmount,
      isMock: true,
    };

    if (paymentData) {
      const isMock = paymentData.token === "MOCK_SUCCESS" || 
                     (paymentData.tbkUser && paymentData.tbkUser.toUpperCase().includes("MOCK_USER")) ||
                     (paymentData.buyOrder && paymentData.buyOrder.startsWith("PAY-") && paymentData.authorizationCode === "123456") ||
                     paymentData.status === "pending";

      if (isMock) {
        logger.info(`Simulando REEMBOLSO PARCIAL exitoso (Modo Prueba) por $${refundAmount}`);
        refundResult = {
          type: "NULLIFIED",
          response_code: 0,
          authorization_code: "654321",
          nullified_amount: refundAmount,
          isMock: true,
        };
      } else {
        // Cargar llaves del Recinto (Tenant)
        const tenantDoc = await db.collection("tenants").doc(bookingData.tenantId).get();
        const tenantData = tenantDoc.data();
        const commerceCode = tenantData?.transbankCommerceCode;
        const apiKey = tenantData?.transbankApiKey;

        try {
          if (paymentData.method === "webpay_plus") {
            refundResult = await transbank.refundWebpay(
              paymentData.token,
              refundAmount,
              commerceCode,
              apiKey
            );
          } else if (paymentData.method === "oneclick") {
            const masterDoc = await db.collection("settings").doc("transbank_master").get();
            const masterCC = masterDoc.data()?.commerceCode;
            
            let childCC = commerceCode;
            if (!childCC || childCC === masterCC) {
              childCC = IntegrationCommerceCodes.ONECLICK_MALL_CHILD1;
            }

            refundResult = await transbank.refundOneclick(
              paymentData.buyOrder,
              childCC,
              paymentData.buyOrder, // Se usa como childBuyOrder
              refundAmount,
              commerceCode,
              apiKey
            );
          } else {
            throw new Error("Método de pago no soportado para reembolso automático.");
          }
        } catch (apiError: any) {
          logger.error(`Transbank physical refund failed for booking ${bookingId}:`, apiError.message || apiError);
          refundResult = {
            type: "FAILED_PHYSICAL_REFUND",
            error: apiError.message || String(apiError),
            response_code: -99,
            nullified_amount: 0,
            isMock: false,
          };
        }
      }
    } else {
      logger.info(`No se encontró registro de pago físico para la reserva ${bookingId}. Procediendo con reembolso simulado.`);
    }

    // Registrar en Firestore el resultado de la anulación parcial
    const batch = db.batch();
    batch.update(bookingDoc.ref, {
      paymentStatus: refundResult.type === "FAILED_PHYSICAL_REFUND" ? "refund_failed" : "refunded",
      status: "cancelled",
      refundAmount: refundResult.type === "FAILED_PHYSICAL_REFUND" ? 0 : refundAmount,
      refundFee: fee,
      refundedAt: admin.firestore.FieldValue.serverTimestamp(),
      refundDetails: refundResult,
    });

    if (paymentDoc) {
      batch.update(paymentDoc.ref, {
        status: refundResult.type === "FAILED_PHYSICAL_REFUND" ? "refund_failed" : "refunded",
        refundAmount: refundResult.type === "FAILED_PHYSICAL_REFUND" ? 0 : refundAmount,
        refundFee: fee,
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
    throw new HttpsError("internal", error.message || "Error al procesar el reembolso parcial en Transbank.");
  }
});

/**
 * Envía un correo electrónico personalizado de autenticación (activación o restablecimiento)
 * utilizando Resend y plantillas HTML modernas.
 */
export const sendAuthEmail = onCall({region: "southamerica-west1"}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes estar autenticado.");
  }

  await checkRateLimit("sendAuthEmail", request.auth.uid);

  const { email, type, name: providedName } = request.data as {
    email: string;
    type: "verify" | "reset";
    name?: string;
  };

  if (!email || !type) {
    throw new HttpsError("invalid-argument", "El correo y el tipo son requeridos.");
  }

  const cleanEmail = email.trim().toLowerCase();

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
    const emailSettingsDoc = await db.collection("settings").doc("email").get();
    const emailSettings = emailSettingsDoc.data() || {};
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
      actionLink = await adminAuth.generatePasswordResetLink(cleanEmail, actionCodeSettings);
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
      logger.warn("RESEND_API_KEY no configurada. Retornando enlace en modo Mock.");
      return {
        success: true,
        method: "mock",
        actionLink,
      };
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
        error: resData.message || "Error al enviar el correo con Resend.",
        actionLink,
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
