import { collection, doc, addDoc, getDocs, deleteDoc, updateDoc, Timestamp, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';

export interface PaymentCard {
    id?: string;
    brand: string;
    last4: string;
    holderName: string;
    expiryMonth: string;
    expiryYear: string;
    isDefault: boolean;
    createdAt: any;
}

export interface WalletTransaction {
    id?: string;
    type: 'deposit' | 'withdrawal' | 'payment' | 'refund';
    amount: number;
    description: string;
    method: string;
    createdAt: any;
}

/**
 * Detect card brand based on card number
 */
function detectCardBrand(cardNumber: string): string {
    const cleaned = cardNumber.replace(/\s/g, '');
    if (/^4/.test(cleaned)) return 'Visa';
    if (/^5[1-5]/.test(cleaned)) return 'Mastercard';
    if (/^3[47]/.test(cleaned)) return 'Amex';
    if (/^6(?:011|5)/.test(cleaned)) return 'Discover';
    return 'Card';
}

/**
 * Basic Luhn algorithm for card validation
 */
function validateCardNumber(number: string): boolean {
    const cleaned = number.replace(/\s/g, '');
    
    // Bypass para tarjetas de prueba Transbank (Integration)
    if (cleaned.startsWith('5970') || cleaned.startsWith('5661')) return true;

    if (!/^\d{12,19}$/.test(cleaned)) return false;

    let sum = 0;
    let alternate = false;
    for (let i = cleaned.length - 1; i >= 0; i--) {
        let n = parseInt(cleaned[i], 10);
        if (alternate) {
            n *= 2;
            if (n > 9) n -= 9;
        }
        sum += n;
        alternate = !alternate;
    }
    return sum % 10 === 0;
}

export const walletService = {
    /**
     * Add a payment card to the user's Firestore subcollection
     */
    async addCard(userId: string, cardData: {
        cardNumber: string;
        expiryMonth: string;
        expiryYear: string;
        cvv: string;
        holderName: string;
    }): Promise<{ success: boolean; cardId?: string; error?: string }> {
        try {
            const { cardNumber, expiryMonth, expiryYear, cvv, holderName } = cardData;
            const cleaned = cardNumber.replace(/\s/g, '');

            // Validate card length (Permitir 12 para Transbank Integration)
            if (cleaned.length < 12 || cleaned.length > 19) {
                return { success: false, error: 'Número de tarjeta inválido (mínimo 12 dígitos).' };
            }

            // Luhn check
            if (!validateCardNumber(cleaned)) {
                return { success: false, error: 'Número de tarjeta no válido (verificación fallida).' };
            }

            // Validate expiry
            const month = parseInt(expiryMonth, 10);
            const year = parseInt(expiryYear, 10);
            if (month < 1 || month > 12) {
                return { success: false, error: 'Mes de expiración inválido.' };
            }
            const fullYear = year < 100 ? 2000 + year : year;
            const now = new Date();
            const expiry = new Date(fullYear, month);
            if (expiry <= now) {
                return { success: false, error: 'La tarjeta está expirada.' };
            }

            // CVV check
            if (!/^\d{3,4}$/.test(cvv)) {
                return { success: false, error: 'CVV inválido.' };
            }

            // Holder name check
            if (!holderName || holderName.trim().length < 3) {
                return { success: false, error: 'Nombre del titular requerido.' };
            }

            // Check existing cards
            const cardsRef = collection(db, 'profiles', userId, 'cards');
            const existingCards = await getDocs(cardsRef);
            const isFirst = existingCards.empty;

            // Store only the last 4 digits for security
            const last4 = cleaned.slice(-4);
            const brand = detectCardBrand(cleaned);

            const newCard: Omit<PaymentCard, 'id'> = {
                brand,
                last4,
                holderName: holderName.trim().toUpperCase(),
                expiryMonth: expiryMonth.padStart(2, '0'),
                expiryYear: String(fullYear),
                isDefault: isFirst,
                createdAt: Timestamp.now()
            };

            const docRef = await addDoc(cardsRef, newCard);
            return { success: true, cardId: docRef.id };
        } catch (error) {
            console.error('Error adding card:', error);
            return { success: false, error: 'No se pudo vincular la tarjeta. Intenta de nuevo.' };
        }
    },

    /**
     * Get all cards for a user
     */
    async getCards(userId: string): Promise<PaymentCard[]> {
        try {
            const cardsRef = collection(db, 'profiles', userId, 'cards');
            const snap = await getDocs(cardsRef);
            return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaymentCard));
        } catch (error) {
            console.error('Error fetching cards:', error);
            return [];
        }
    },

    /**
     * Delete a card
     */
    async deleteCard(userId: string, cardId: string): Promise<void> {
        await deleteDoc(doc(db, 'users', userId, 'cards', cardId));
    },

    /**
     * Set default card
     */
    async setDefaultCard(userId: string, cardId: string): Promise<void> {
        const cards = await this.getCards(userId);
        for (const card of cards) {
            if (card.id) {
                await updateDoc(doc(db, 'users', userId, 'cards', card.id), {
                    isDefault: card.id === cardId
                });
            }
        }
    },

    /**
     * Add funds to the user's wallet (MVP Credits)
     */
    async addFunds(userId: string, amount: number, method: string): Promise<{ success: boolean; error?: string }> {
        try {
            // Solo validar monto mínimo para depósitos (cargas de fondos)
            if (amount > 0 && amount < 1000) {
                return { success: false, error: 'Monto mínimo de carga: $1.000 CLP.' };
            }
            if (amount > 500000) {
                return { success: false, error: 'Monto máximo: $500.000 CLP.' };
            }

            // Get current wallet balance
            const userRef = doc(db, 'users', userId);
            const snap = await getDoc(userRef);
            const currentBalance = snap.data()?.walletBalance || 0;

            // Update balance
            await updateDoc(userRef, {
                walletBalance: currentBalance + amount,
                walletUpdatedAt: Timestamp.now()
            });

            // Record transaction
            await addDoc(collection(db, 'users', userId, 'transactions'), {
                type: 'deposit',
                amount,
                description: `Carga de fondos vía ${method}`,
                method,
                balanceAfter: currentBalance + amount,
                createdAt: Timestamp.now()
            });

            return { success: true };
        } catch (error) {
            console.error('Error adding funds:', error);
            return { success: false, error: 'Error al cargar fondos. Intenta de nuevo.' };
        }
    },

    /**
     * Get wallet balance
     */
    async getWalletBalance(userId: string): Promise<number> {
        try {
            const userRef = doc(db, 'users', userId);
            const snap = await getDoc(userRef);
            return snap.data()?.walletBalance || 0;
        } catch (error) {
            console.error('Error fetching balance:', error);
            return 0;
        }
    },

    /**
     * Get transaction history
     */
    async getTransactions(userId: string): Promise<WalletTransaction[]> {
        try {
            const txRef = collection(db, 'users', userId, 'transactions');
            const snap = await getDocs(txRef);
            return snap.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as WalletTransaction))
                .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        } catch (error) {
            console.error('Error fetching transactions:', error);
            return [];
        }
    },

    /**
     * TRANSBANK WEBPAY PLUS: Iniciar transacción de pago directo
     */
    async createWebpayTransaction(bookingId: string, tenantId: string, amount: number, buyOrder: string): Promise<{ url: string; token: string }> {
        const functions = getFunctions(undefined, 'southamerica-west1');
        const startFn = httpsCallable(functions, 'createWebpayTransaction');
        const result = await startFn({ bookingId, tenantId, amount, buyOrder });
        return result.data as any;
    },

    /**
     * TRANSBANK ONECLICK: Iniciar proceso de inscripción de tarjeta
     */
    async startInscription(userId: string, email: string, cardData?: any): Promise<{ url: string; token: string; isMock?: boolean }> {
        const functions = getFunctions(undefined, 'southamerica-west1');
        const startFn = httpsCallable(functions, 'startOneclickInscription');
        const result = await startFn({ 
            email, 
            cardNumber: cardData?.cardNumber?.replace(/\s/g, ''),
            holderName: cardData?.holderName,
            expiryMonth: cardData?.expiryMonth,
            expiryYear: cardData?.expiryYear
        });
        return result.data as any;
    },

    /**
     * TRANSBANK ONECLICK: Autorizar un pago con tarjeta guardada
     */
    async authorizePayment(userId: string, amount: number, bookingId: string, tenantId: string, cardId?: string): Promise<{ success: boolean; error?: string }> {
        const functions = getFunctions(undefined, 'southamerica-west1');
        const authFn = httpsCallable(functions, 'authorizeOneclickPayment');
        try {
            const result = await authFn({ amount, bookingId, tenantId, cardId });
            const data = result.data as any;
            return { success: data.success };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }
};

