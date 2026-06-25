import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("transbank-sdk", () => {
  class MockTransaction {
    create = vi.fn().mockResolvedValue({ url: "https://test.url", token: "test_token_123" });
    commit = vi.fn().mockResolvedValue({ vci: "TSY", response_code: 0, amount: 15000 });
    refund = vi.fn().mockResolvedValue({ type: "NULLIFIED", response_code: 0, nullified_amount: 14550 });
  }

  class MockMallInscription {
    start = vi.fn().mockResolvedValue({ url_webpay: "https://test.url", token: "ins_token_123" });
    finish = vi.fn().mockResolvedValue({ response_code: 0, tbk_user: "test_user", authorization_code: "auth_123", card_number: "4321", card_type: "Visa" });
  }

  class MockMallTransaction {
    authorize = vi.fn().mockResolvedValue({ details: [{ response_code: 0, authorization_code: "auth_456" }] });
    refund = vi.fn().mockResolvedValue({ type: "NULLIFIED", response_code: 0 });
  }

  return {
    WebpayPlus: { Transaction: MockTransaction },
    Oneclick: { MallInscription: MockMallInscription, MallTransaction: MockMallTransaction },
    Options: vi.fn(),
    IntegrationCommerceCodes: { WEBPAY_PLUS: "5970123456", ONECLICK_MALL: "5970123456", ONECLICK_MALL_CHILD1: "5970123457" },
    IntegrationApiKeys: { WEBPAY: "test_api_key" },
    Environment: { Integration: "INTEGRATION", Production: "PRODUCTION" },
    TransactionDetail: vi.fn(),
  };
});

import { transbank } from "../transbank";

describe("transbank module", () => {
  describe("createWebpay", () => {
    it("returns url and token when called with defaults", async () => {
      const result = await transbank.createWebpay("ORD-123", "user_1", 15000, "https://return.url");
      expect(result).toHaveProperty("url");
      expect(result).toHaveProperty("token");
      expect(result.token).toBe("test_token_123");
    });

    it("accepts custom commerce code and api key", async () => {
      const result = await transbank.createWebpay("ORD-456", "user_2", 20000, "https://return.url", "5970999999", "custom_key");
      expect(result.url).toBeDefined();
    });
  });

  describe("commitWebpay", () => {
    it("returns success response for valid token", async () => {
      const result = await transbank.commitWebpay("test_token_123");
      expect(result.response_code).toBe(0);
      expect(result.vci).toBe("TSY");
    });
  });

  describe("startInscription", () => {
    it("returns url and token for oneclick inscription", async () => {
      const result = await transbank.startInscription("user_1", "test@test.cl", "https://return.url");
      expect(result).toHaveProperty("url_webpay");
      expect(result).toHaveProperty("token");
    });
  });

  describe("finishInscription", () => {
    it("returns card details on success", async () => {
      const result = await transbank.finishInscription("ins_token_123");
      expect(result.response_code).toBe(0);
      expect(result.tbk_user).toBe("test_user");
      expect(result.card_number).toBe("4321");
    });
  });

  describe("authorizeOneclickPayment", () => {
    it("authorizes payment with saved card", async () => {
      const result = await transbank.authorizeOneclickPayment("user_1", "tbk_user_123", "PAY-123", 15000);
      expect(result.details[0].response_code).toBe(0);
    });
  });

  describe("refundWebpay", () => {
    it("processes partial refund", async () => {
      const result = await transbank.refundWebpay("token_123", 14550);
      expect(result.response_code).toBe(0);
      expect(result.nullified_amount).toBe(14550);
    });
  });

  describe("refundOneclick", () => {
    it("processes oneclick refund", async () => {
      const result = await transbank.refundOneclick("PAY-123", "5970123457", "PAY-123", 14550);
      expect(result.response_code).toBe(0);
    });
  });
});
