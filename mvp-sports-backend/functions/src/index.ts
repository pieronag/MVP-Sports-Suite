import {onCall, onRequest, HttpsError} from "firebase-functions/v2/https";
import {onSchedule} from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {transbank} from "./transbank";
import {IntegrationCommerceCodes} from "transbank-sdk";
// import cors from "cors";

// const corsHandler = cors({origin: true});

admin.initializeApp();

const db = admin.firestore();

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

  const {action} = request.data as {
    action: "checkin" | "match" | "win" | "mvp";
  };
  const uid = request.auth.uid;

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

    const {bookingId, tenantId, amount, buyOrder} = request.data;
    const uid = request.auth.uid;

    try {
      const tenantDoc = await db.collection("tenants").doc(tenantId).get();
      const tenantData = tenantDoc.data();

      const commerceCode = tenantData?.transbankCommerceCode;
      const apiKey = tenantData?.transbankApiKey;

      // URL directa a la Cloud Function para evitar 404 en el Hosting
      const baseUrl = "https://commitwebpaytransaction-i6cn7w2g5a-tl.a.run.app";
      const commitUrl = `${baseUrl}?tenantId=${tenantId}`;

      const response = await transbank.createWebpay(
        buyOrder || `ORD-${Date.now()}`,
        uid,
        amount,
        commitUrl,
        commerceCode,
        apiKey,
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
    // No usar corsHandler en webhooks/redirects de Transbank
    const token = req.body.token_ws || req.query.token_ws || req.body.TBK_TOKEN || req.query.TBK_TOKEN;
    const tenantId = req.query.tenantId as string;

    if (!token) return res.redirect("mvpdeportes://checkout/error?reason=no_token");

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

        if (!paySnap.empty) {
          const payDoc = paySnap.docs[0];
          const bookingId = payDoc.data().bookingId;

          const batch = db.batch();
          batch.update(payDoc.ref, {status: "approved", result});
          if (bookingId) {
            batch.update(db.collection("bookings").doc(bookingId), {
              paymentStatus: "paid",
              status: "confirmed",
            });
          }
          await batch.commit();
        }
        return res.redirect(`mvpdeportes://checkout/success?token=${token}`);
      } else {
        return res.redirect(`mvpdeportes://checkout/error?token=${token}&code=${result.response_code}`);
      }
    } catch (error: any) {
      logger.error("Webpay Commit Error:", error.message || error);
      return res.redirect(`mvpdeportes://checkout/error?err=${encodeURIComponent(error.message || "unknown")}`);
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

    const {email, cardNumber, holderName, expiryMonth, expiryYear} = request.data;
    const uid = request.auth.uid;
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

      const baseUrl = "https://finishoneclickinscription-i6cn7w2g5a-tl.a.run.app";
      const resUrl = baseUrl;
      
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
    // No usar corsHandler en webhooks/redirects de Transbank
    const token = req.body.TBK_TOKEN || req.query.TBK_TOKEN || req.body.token_ws || req.query.token_ws;

    logger.info(`Finish Inscription Check - Method: ${req.method} | Token: ${token}`);

    if (!token) {
      logger.error("No token received from Transbank");
      return res.redirect("mvpdeportes://wallet/error?reason=no_token");
    }

    try {
      const masterDoc = await db.collection("settings").doc("transbank_master").get();
      const mData = masterDoc.data();
      const commerceCode = mData?.commerceCode;
      const apiKey = mData?.apiKey;

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

        return res.redirect(`mvpdeportes://wallet/success?card=${result.card_number}`);
      } else {
        logger.warn(`Oneclick rejected code: ${result.response_code}`);
        return res.redirect(`mvpdeportes://wallet/error?code=${result.response_code}`);
      }
    } catch (error: any) {
      logger.error("Oneclick Finish Error:", error.message || error);
      return res.redirect(`mvpdeportes://wallet/error?err=${encodeURIComponent(error.message || "unknown")}`);
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

    const {amount, bookingId, tenantId, cardId} = request.data;
    const uid = request.auth.uid;

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

      // MODO RÁPIDO PARA PAGOS: Si es usuario de prueba, aprobamos directo
      const tbkUser = (card.tbkUser || "").toString();
      if (tbkUser && tbkUser.toUpperCase().includes("MOCK_USER")) {
        if (tbkUser.toUpperCase().includes("REJECT")) {
          logger.info("Simulando RECHAZO de pago Oneclick (Modo Prueba)");
          return {
            success: false,
            error: "Transacción rechazada por el banco (Simulado)",
            response_code: 1
          };
        }

        logger.info("Simulando éxito de pago Oneclick (Modo Prueba)");
        return {
          success: true,
          buy_order: buyOrder,
          authorization_code: "123456",
          amount: amount,
          response_code: 0
        };
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
 */
export const handleNoShows = onSchedule("every 15 minutes", async (event) => {
  const now = admin.firestore.Timestamp.now();
  
  try {
    // Buscar reservas de hoy que ya pasaron su hora de inicio + 15 min de gracia
    // y que no tengan check-in ni estén canceladas aún.
    const snap = await db.collection("bookings")
      .where("checkIn", "==", false)
      .where("status", "==", "confirmed")
      .get();

    if (snap.empty) return;

    const batch = db.batch();
    const userUpdates: { [uid: string]: number } = {};

    snap.docs.forEach((doc) => {
      const data = doc.data();
      const startTime = data.startTime?.toDate?.() || 
                        (typeof data.startTime === "string" ? new Date(`${data.date?.toDate?.().toISOString().split("T")[0]}T${data.startTime}`) : null);
      
      if (!startTime) return;

      // 15 minutos de tolerancia
      const limit = startTime.getTime() + (15 * 60 * 1000);
      
      if (now.toMillis() > limit) {
        // Marcar reserva como cancelada por No-Show
        batch.update(doc.ref, {
          status: "cancelled",
          noShow: true,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Registrar strike para el usuario si existe userId
        if (data.userId) {
          userUpdates[data.userId] = (userUpdates[data.userId] || 0) + 1;
        }
      }
    });

    // Aplicar strikes a los perfiles de usuario
    for (const uid in userUpdates) {
      const profileRef = db.collection("profiles").doc(uid);
      batch.update(profileRef, {
        strikes: admin.firestore.FieldValue.increment(userUpdates[uid]),
        lastStrikeAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();
    logger.info(`Processed ${Object.keys(userUpdates).length} users with no-shows.`);
  } catch (error) {
    logger.error("Error in handleNoShows:", error);
  }
});

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
