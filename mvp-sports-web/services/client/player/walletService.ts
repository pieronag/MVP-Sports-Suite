import { auth } from '@/services/client/firebase';

export const walletService = {
  // El servidor calcula el monto: solo se envía qué se reserva
  // Cobra la reserva con la tarjeta tokenizada por el Brick. Un rechazo vuelve como { ok: false, error }.
  async payBookingWithCard(input: { tenantId: string; courtId: string; sport: string; date: string; startTime: string; couponCode?: string; teamId?: string }, card: any, saveCard: boolean): Promise<any> {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("Inicia sesión para pagar");
    const res = await fetch("/api/mercadopago/create", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...input, card, saveCard }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok && res.status !== 402) throw new Error(data.error || "No se pudo procesar el pago");
    return data;
  },
};
