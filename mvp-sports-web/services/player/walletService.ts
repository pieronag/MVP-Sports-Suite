import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth } from '@/services/firebase';

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

  // El servidor calcula el monto: solo se envía qué se reserva
  async createMercadoPagoBooking(input: { tenantId: string; courtId: string; sport: string; date: string; startTime: string; couponCode?: string; teamId?: string }): Promise<{ url: string; preferenceId: string; bookingId: string; amount: number }> {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("Inicia sesión para pagar");
    const res = await fetch("/api/mercadopago/create", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(input),
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
