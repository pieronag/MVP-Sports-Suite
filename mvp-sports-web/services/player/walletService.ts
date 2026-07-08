import { getFunctions, httpsCallable } from 'firebase/functions';
import { collection, doc, addDoc, getDocs, deleteDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/services/firebase';

export interface PaymentCard {
  id?: string;
  brand: string;
  last4: string;
  holderName: string;
  expiryMonth: string;
  expiryYear: string;
  tbkUser?: string;
  authorizationCode?: string;
  isDefault: boolean;
  createdAt: any;
}

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
  },

  async startOneclickInscription(email: string, cardNumber?: string, holderName?: string, expiryMonth?: string, expiryYear?: string): Promise<{ url: string | null; token: string; isMock?: boolean }> {
    const functions = getFunctions(undefined, 'southamerica-west1');
    const insFn = httpsCallable(functions, 'startOneclickInscription');
    const result = await insFn({ email, cardNumber, holderName, expiryMonth, expiryYear });
    return result.data as any;
  },

  async getCards(userId: string): Promise<PaymentCard[]> {
    try {
      const cardsRef = collection(db, 'profiles', userId, 'cards');
      const snap = await getDocs(cardsRef);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as PaymentCard));
    } catch {
      return [];
    }
  },

  async addCard(userId: string, cardData: { cardNumber: string; expiryMonth: string; expiryYear: string; cvv: string; holderName: string }): Promise<{ success: boolean; cardId?: string; error?: string }> {
    try {
      const cleaned = cardData.cardNumber.replace(/\s/g, '');
      if (cleaned.length < 12 || cleaned.length > 19) {
        return { success: false, error: 'Número de tarjeta inválido.' };
      }
      const month = parseInt(cardData.expiryMonth, 10);
      const year = parseInt(cardData.expiryYear, 10);
      if (month < 1 || month > 12) return { success: false, error: 'Mes inválido.' };
      const fullYear = year < 100 ? 2000 + year : year;
      const now = new Date();
      if (new Date(fullYear, month) <= now) return { success: false, error: 'Tarjeta expirada.' };
      if (!/^\d{3,4}$/.test(cardData.cvv)) return { success: false, error: 'CVV inválido.' };
      if (!cardData.holderName || cardData.holderName.trim().length < 3) return { success: false, error: 'Nombre del titular requerido.' };

      const cardsRef = collection(db, 'profiles', userId, 'cards');
      const existingCards = await getDocs(cardsRef);
      const isFirst = existingCards.empty;
      const last4 = cleaned.slice(-4);
      const brand = detectCardBrand(cleaned);

      const newCard = {
        brand, last4, holderName: cardData.holderName.trim().toUpperCase(),
        expiryMonth: cardData.expiryMonth.padStart(2, '0'),
        expiryYear: String(fullYear),
        isDefault: isFirst,
        createdAt: Timestamp.now(),
      };
      const docRef = await addDoc(cardsRef, newCard);
      return { success: true, cardId: docRef.id };
    } catch (error: any) {
      return { success: false, error: error.message || 'Error al agregar tarjeta.' };
    }
  },

  async deleteCard(userId: string, cardId: string): Promise<void> {
    await deleteDoc(doc(db, 'profiles', userId, 'cards', cardId));
  },

  async setDefaultCard(userId: string, cardId: string): Promise<void> {
    const cards = await this.getCards(userId);
    for (const card of cards) {
      if (card.id) {
        await updateDoc(doc(db, 'profiles', userId, 'cards', card.id), { isDefault: card.id === cardId });
      }
    }
  },

  async updateCard(userId: string, cardId: string, data: Partial<Pick<PaymentCard, 'holderName' | 'expiryMonth' | 'expiryYear'>>): Promise<void> {
    await updateDoc(doc(db, 'profiles', userId, 'cards', cardId), data);
  },
};

function detectCardBrand(cardNumber: string): string {
  const cleaned = cardNumber.replace(/\s/g, '');
  if (/^4/.test(cleaned)) return 'Visa';
  if (/^5[1-5]/.test(cleaned)) return 'Mastercard';
  if (/^3[47]/.test(cleaned)) return 'Amex';
  if (/^6(?:011|5)/.test(cleaned)) return 'Discover';
  return 'Card';
}
