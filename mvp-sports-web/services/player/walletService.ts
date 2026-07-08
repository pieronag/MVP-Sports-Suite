import { getFunctions, httpsCallable } from 'firebase/functions';

export const walletService = {
  async createWebpayTransaction(bookingId: string, tenantId: string, amount: number, buyOrder: string, bookingData?: any, returnUrl?: string): Promise<{ url: string; token: string }> {
    const res = await fetch("/api/webpay/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId, tenantId, amount, buyOrder, bookingData, returnUrl }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al iniciar pago");
    return data;
  },

  async authorizePayment(userId: string, amount: number, bookingId: string, tenantId: string, cardId?: string): Promise<{ success: boolean; error?: string }> {
    const functions = getFunctions(undefined, 'southamerica-west1');
    const authFn = httpsCallable(functions, 'authorizeOneclickPayment');
    try {
      const result = await authFn({ amount, bookingId, tenantId, cardId });
      return { success: (result.data as any).success };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
};
