import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../firebase';

export interface AcademyClass {
    id: string;
    name: string;
    sport?: string;
    instructor?: string;
    ageGroup?: string;
    price?: number;
    maxStudents?: number;
    enrolledStudents?: number;
    startTime?: string;
    endTime?: string;
    daysOfWeek?: string[];
    startDate?: string;
    endDate?: string;
    description?: string;
    status?: string;
    isVisibleInApp?: boolean;
}

export const academyService = {
    // Clases publicadas y activas
    async getClasses(): Promise<AcademyClass[]> {
        const snap = await getDocs(collection(db, 'academy_classes'));
        return snap.docs
            .map(d => ({ id: d.id, ...d.data() } as AcademyClass))
            .filter(c => c.isVisibleInApp !== false && (c.status || 'active') === 'active');
    },

    // Clases en las que el jugador está inscrito (ids)
    async getMyEnrollments(uid: string): Promise<Record<string, { paymentStatus: string }>> {
        const snap = await getDocs(query(collection(db, 'academy_enrollments'), where('userId', '==', uid)));
        const out: Record<string, { paymentStatus: string }> = {};
        snap.docs.forEach(d => { const e = d.data(); if (e.status !== 'cancelled') out[e.classId] = { paymentStatus: e.paymentStatus }; });
        return out;
    },

    async enroll(classId: string, payOnline: boolean, card?: any, saveCard = false): Promise<any> {
        const token = await auth.currentUser?.getIdToken();
        if (!token) throw new Error('Inicia sesión para inscribirte');
        const res = await fetch('/api/academies/enroll', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ classId, payOnline, card, saveCard }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok && res.status !== 402) throw new Error(data.error || 'No se pudo completar la inscripción');
        return data;
    },
};
