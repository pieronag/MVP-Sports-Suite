import { auth } from '@/services/firebase';

export const walletService = {
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
};
