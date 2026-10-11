import { collection, query, where, getDocs, doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/services/client/firebase';
import { couponIssue } from '@/utils/coupon';

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
        const issue = couponIssue(coupon, { tenantId, price });
        if (issue) throw new Error(issue);
        return coupon;
    },

    async incrementCouponUsage(couponId: string) {
        const ref = doc(db, 'coupons', couponId);
        const snap = await getDoc(ref);
        await updateDoc(ref, { usedCount: (snap.data()?.usedCount || 0) + 1 });
    }
};
