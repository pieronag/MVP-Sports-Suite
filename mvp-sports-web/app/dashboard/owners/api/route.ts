import { NextResponse } from 'next/server';
import { adminAuth as getAdminAuth } from '@/services/server/firebase-admin';
import { isSuperAdminCaller } from '@/services/server/server-auth';
import { passwordIssue } from '@/utils/password';

export async function POST(request: Request) {
  try {
    // Protección: solo administradores del sistema (admin/superadmin) pueden
    // crear usuarios, cambiar contraseñas o eliminar cuentas.
    const caller = await isSuperAdminCaller(request);
    if (!caller) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const body = await request.json();
    const { action, email, password, uid, displayName, role } = body;
    if ((action === 'create' || action === 'updatePassword') && password && passwordIssue(String(password))) {
      return NextResponse.json({ error: passwordIssue(String(password)) }, { status: 400 });
    }

    // --- 1. CREAR USUARIO (AUTH) ---
    if (action === 'create') {
      if (!email || !password) {
        return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
      }

      const userRecord = await getAdminAuth().createUser({
        email,
        password,
        displayName: displayName || '',
        emailVerified: true,
      });

      // Asignar rol 'owner'. El claim del token queda como respaldo; la fuente
      // de verdad del rol es el documento en Firestore (ver firestore.rules).
      await getAdminAuth().setCustomUserClaims(userRecord.uid, { role: role || 'owner' });

      return NextResponse.json({ 
        success: true, 
        uid: userRecord.uid 
      });
    }

    // --- 2. CAMBIAR CONTRASEÑA (URGENCIA) ---
    if (action === 'updatePassword') {
      if (!uid || !password) {
        return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
      }

      await getAdminAuth().updateUser(uid, {
        password: password
      });

      return NextResponse.json({ success: true });
    }

    // --- 3. ELIMINAR USUARIO (AUTH) ---
    // Esto asegura que si borras al dueño de la BD, también se borre su acceso
    if (action === 'delete') {
       if (!uid) return NextResponse.json({ error: 'Falta UID' }, { status: 400 });
       await getAdminAuth().deleteUser(uid);
       return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });

  } catch (error: any) {
    console.error("Error API Owners:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
