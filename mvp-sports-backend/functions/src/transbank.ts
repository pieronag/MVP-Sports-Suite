import {
  WebpayPlus,
  Oneclick,
  Options,
  IntegrationApiKeys,
  IntegrationCommerceCodes,
  Environment,
  TransactionDetail,
} from "transbank-sdk";

// Por defecto usamos integración
const getOptions = (commerceCode?: string, apiKey?: string) => {
  if (commerceCode && apiKey) {
    // Detectar si es código de prueba (empieza con 5970) o producción
    const env = commerceCode.startsWith("5970") ?
      Environment.Integration : Environment.Production;
    return new Options(commerceCode, apiKey, env);
  }
  return new Options(
      IntegrationCommerceCodes.WEBPAY_PLUS,
      IntegrationApiKeys.WEBPAY,
      Environment.Integration,
  );
};

const getOneclickOptions = (commerceCode?: string, apiKey?: string) => {
  if (commerceCode && apiKey) {
    const env = commerceCode.startsWith("5970") ?
      Environment.Integration : Environment.Production;
    return new Options(commerceCode, apiKey, env);
  }
  return new Options(
      IntegrationCommerceCodes.ONECLICK_MALL,
      IntegrationApiKeys.WEBPAY,
      Environment.Integration,
  );
};

export const transbank = {
  // WEBPAY PLUS
  createWebpay: async (
      buyOrder: string,
      sessionId: string,
      amount: number,
      returnUrl: string,
      commerceCode?: string,
      apiKey?: string,
  ) => {
    const tx = new WebpayPlus.Transaction(getOptions(commerceCode, apiKey));
    return await tx.create(buyOrder, sessionId, amount, returnUrl);
  },

  commitWebpay: async (
      token: string,
      commerceCode?: string,
      apiKey?: string,
  ) => {
    const tx = new WebpayPlus.Transaction(getOptions(commerceCode, apiKey));
    return await tx.commit(token);
  },

  // ONECLICK MALL
  startInscription: async (
      username: string,
      email: string,
      responseUrl: string,
      commerceCode?: string,
      apiKey?: string,
  ) => {
    const ins = new Oneclick.MallInscription(
        getOneclickOptions(commerceCode, apiKey),
    );
    return await ins.start(username, email, responseUrl);
  },

  finishInscription: async (
      token: string,
      commerceCode?: string,
      apiKey?: string,
  ) => {
    const ins = new Oneclick.MallInscription(
        getOneclickOptions(commerceCode, apiKey),
    );
    return await ins.finish(token);
  },

  authorizeOneclickPayment: async (
      username: string,
      tbkUser: string,
      buyOrder: string,
      amount: number,
      commerceCode?: string,
      apiKey?: string,
      childCommerceCode?: string,
  ) => {
    const tx = new Oneclick.MallTransaction(
        getOneclickOptions(commerceCode, apiKey),
    );
    const details = [
      new TransactionDetail(
          amount,
          childCommerceCode || IntegrationCommerceCodes.ONECLICK_MALL_CHILD1,
          buyOrder,
          1,
      ),
    ];
    return await tx.authorize(username, tbkUser, buyOrder, details);
  },

  refundWebpay: async (
      token: string,
      amount: number,
      commerceCode?: string,
      apiKey?: string,
  ) => {
    const tx = new WebpayPlus.Transaction(getOptions(commerceCode, apiKey));
    return await tx.refund(token, amount);
  },

  refundOneclick: async (
      buyOrder: string,
      childCommerceCode: string,
      childBuyOrder: string,
      amount: number,
      commerceCode?: string,
      apiKey?: string,
  ) => {
    const tx = new Oneclick.MallTransaction(getOneclickOptions(commerceCode, apiKey));
    return await tx.refund(buyOrder, childCommerceCode, childBuyOrder, amount);
  },
};
