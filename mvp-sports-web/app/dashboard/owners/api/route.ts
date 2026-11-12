import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth as getAdminAuth, adminDb } from '@/services/server/firebase-admin';
import { isSuperAdminCaller } from '@/services/server/server-auth';
import { passwordIssue } from '@/utils/password';

// Alta, cambio de contraseña y baja de dueños (solo superadmin).
// La cuenta de acceso y su documento en users se crean y borran juntos en el servidor.
const text = (v: unknown, max = 160) => String(v ?? '').trim().slice(0, max);

const AUTH_ERRORS: Record<string, string> = {
  'auth/email-already-exists': 'Ya existe una cuenta con ese email.',
  'auth/invalid-email': 'El email no es válido.',
  'auth/user-not-found': 'La cuenta ya no existe.',
  'auth/invalid-password': 'La contraseña no cumple los requisitos.',
};

export async function POST(request: Request) {
  try {
    const caller = await isSuperAdminCaller(request);
    if (!caller) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const { action, password, uid } = body || {};
    if ((action === 'create' || action === 'updatePassword') && passwordIssue(String(password || ''))) {
      return NextResponse.json({ error: passwordIssue(String(password || '')) }, { status: 400 });
    }

    if (action === 'create') {
      const email = text(body.email).toLowerCase();
      const displayName = text(body.displayName, 80);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || displayName.length < 3) return NextResponse.json({ error: 'Faltan el nombre o un email válido.' }, { status: 400 });
      // Solo se crean dueños: este endpoint no puede dar otros roles
      const user = await getAdminAuth().createUser({ email, password: String(password), displayName, emailVerified: true });
      try {
        await getAdminAuth().setCustomUserClaims(user.uid, { role: 'owner' });
        await adminDb().collection('users').doc(user.uid).set({
          uid: user.uid, email, displayName, role: 'owner', status: 'active',
          phone: text(body.phone, 30), companyName: text(body.companyName, 120), rut: text(body.rut, 20), billingAddress: text(body.billingAddress, 200),
          paymentHistory: [], createdAt: FieldValue.serverTimestamp(), createdBy: caller.uid,
        });
      } catch (e) {
        // Sin documento la cuenta quedaría a medias: se deshace
        await getAdminAuth().deleteUser(user.uid).catch(() => undefined);
        throw e;
      }
      return NextResponse.json({ success: true, uid: user.uid });
    }

    if (action === 'updatePassword') {
      if (!uid) return NextResponse.json({ error: 'Falta la cuenta.' }, { status: 400 });
      await getAdminAuth().updateUser(String(uid), { password: String(password) });
      return NextResponse.json({ success: true });
    }

    if (action === 'delete') {
      if (!uid) return NextResponse.json({ error: 'Falta la cuenta.' }, { status: 400 });
      const id = String(uid);
      if (id === caller.uid) return NextResponse.json({ error: 'No puedes eliminar tu propia cuenta.' }, { status: 409 });
      const db = adminDb();
      const target = (await db.collection('users').doc(id).get()).data();
      if (target && String(target.role || '').toLowerCase() !== 'owner') return NextResponse.json({ error: 'Esta cuenta no es de un dueño.' }, { status: 409 });
      // Con recintos a su nombre quedarían huérfanos: primero se reasignan o se eliminan los recintos
      const [byOwner, byOwners] = await Promise.all([
        db.collection('tenants').where('ownerId', '==', id).limit(1).get(),
        db.collection('tenants').where('ownerIds', 'array-contains', id).limit(1).get(),
      ]);
      if (!byOwner.empty || !byOwners.empty) {
        return NextResponse.json({ error: 'Este dueño tiene recintos a su nombre. Reasígnalos o elimínalos antes, o suspende al dueño.' }, { status: 409 });
      }
      await getAdminAuth().deleteUser(id).catch((e) => { if (e?.code !== 'auth/user-not-found') throw e; });
      await db.collection('users').doc(id).delete();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Acción no válida.' }, { status: 400 });
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code || '';
    console.error('API dueños:', code || error);
    return NextResponse.json({ error: AUTH_ERRORS[code] || 'No se pudo completar la acción.' }, { status: AUTH_ERRORS[code] ? 400 : 500 });
  }
}
