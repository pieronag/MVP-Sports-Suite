import { collection, query, where, getDocs, doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/services/client/firebase';
import { couponIssue, pickCoupon } from '@/utils/coupon';

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
        const q = query(couponsRef, where('code', '==', code.trim().toUpperCase()));
        const snap = await getDocs(q);
        if (snap.empty) throw new Error('Cupón no encontrado');
        // Misma regla que el servidor (que es el que cobra): el cupón del recinto de la reserva
        const tenant = (await getDoc(doc(db, 'tenants', tenantId))).data() || {};
        const ownerIds = [tenant.ownerId, ...(tenant.ownerIds || [])].filter(Boolean) as string[];
        const coupon = pickCoupon(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Coupon & { ownerId?: string }), tenantId, ownerIds);
        if (!coupon) throw new Error('Este cupón no es válido para este recinto');
        const issue = couponIssue(coupon, { tenantId, price, tenantOwnerIds: ownerIds });
        if (issue) throw new Error(issue);
        return coupon;
    },
};
