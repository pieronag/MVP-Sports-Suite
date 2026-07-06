import { getFunctions, httpsCallable } from 'firebase/functions';

export const walletService = {
    async createWebpayTransaction(bookingId: string, tenantId: string, amount: number, buyOrder: string, bookingData?: any): Promise<{ url: string; token: string }> {
        const functions = getFunctions(undefined, 'southamerica-west1');
        const startFn = httpsCallable(functions, 'createWebpayTransaction');
        const result = await startFn({ bookingId, tenantId, amount, buyOrder, bookingData });
        return result.data as any;
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
