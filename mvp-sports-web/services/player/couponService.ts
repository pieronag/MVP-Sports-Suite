import { collection, query, where, getDocs, doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

export interface Coupon {
    id: string;
    code: string;
    discount: number;
    type: 'percentage' | 'fixed';
    usageLimit?: number;
    usedCount: number;
    expiresAt: Timestamp;
    tenantId?: string;
}

export const couponService = {
    async validateCoupon(code: string, tenantId: string, price: number): Promise<Coupon> {
        const couponsRef = collection(db, 'coupons');
        const q = query(couponsRef, where('code', '==', code.toUpperCase()));
        const snap = await getDocs(q);
        if (snap.empty) throw new Error('Cupón no encontrado');
        const doc = snap.docs[0];
        const coupon = { id: doc.id, ...doc.data() } as Coupon;
        if (coupon.tenantId && coupon.tenantId !== tenantId) throw new Error('Este cupón no es válido para este recinto');
        if (coupon.expiresAt && coupon.expiresAt.toMillis() < Date.now()) throw new Error('Este cupón ha expirado');
        if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) throw new Error('Este cupón ya no tiene usos disponibles');
        return coupon;
    },

    async incrementCouponUsage(couponId: string) {
        const ref = doc(db, 'coupons', couponId);
        const snap = await getDoc(ref);
        await updateDoc(ref, { usedCount: (snap.data()?.usedCount || 0) + 1 });
    }
};
