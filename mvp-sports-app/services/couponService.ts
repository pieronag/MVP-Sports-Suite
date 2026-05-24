import { db } from './firebase';
import { collection, query, where, getDocs, doc, updateDoc, increment, getDoc } from 'firebase/firestore';

export interface Coupon {
    id: string;
    code: string;
    tenantId: string;
    discount: number;
    limit: number;
    uses: number;
    validFrom: string;
    validUntil: string;
    minimumPurchase: number;
    status: 'active' | 'inactive';
}

export const couponService = {
    /**
     * Valida si un cupón es válido para ser usado en una reserva.
     */
    validateCoupon: async (code: string, tenantId: string, currentAmount: number): Promise<Coupon> => {
        try {
            const upperCode = code.trim().toUpperCase();
            if (!upperCode) throw new Error('Código vacío');

            const q = query(
                collection(db, 'coupons'),
                where('code', '==', upperCode),
                where('tenantId', '==', tenantId)
            );

            const snap = await getDocs(q);

            if (snap.empty) {
                throw new Error('Cupón no encontrado para este recinto');
            }

            const couponData = snap.docs[0].data() as Coupon;
            const couponId = snap.docs[0].id;

            if (couponData.status !== 'active') {
                throw new Error('El cupón se encuentra inactivo');
            }

            const today = new Date();
            // Convert validFrom and validUntil to Date correctly (they are stored as YYYY-MM-DD usually)
            const fromDate = new Date(couponData.validFrom + 'T00:00:00');
            const untilDate = new Date(couponData.validUntil + 'T23:59:59');

            if (today < fromDate) {
                throw new Error('El cupón aún no es válido');
            }

            if (today > untilDate) {
                throw new Error('El cupón ha caducado');
            }

            if ((couponData.uses || 0) >= couponData.limit) {
                throw new Error('El cupón ha alcanzado su límite de usos');
            }

            if (currentAmount < couponData.minimumPurchase) {
                throw new Error(`El monto mínimo para usar este cupón es de $${couponData.minimumPurchase.toLocaleString()}`);
            }

            return { ...couponData, id: couponId };
        } catch (error: any) {
            console.error('Error validating coupon:', error);
            throw new Error(error.message || 'Error al validar el cupón');
        }
    },

    /**
     * Incrementa en 1 el contador de usos del cupón en la BD.
     */
    incrementCouponUsage: async (couponId: string): Promise<void> => {
        try {
            if (!couponId) return;
            const couponRef = doc(db, 'coupons', couponId);
            await updateDoc(couponRef, {
                uses: increment(1)
            });
        } catch (error) {
            console.error('Error incrementing coupon usage:', error);
        }
    }
};
