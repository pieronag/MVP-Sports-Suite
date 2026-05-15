import { NextResponse } from 'next/server';
import { adminAuth } from '@/services/firebase-admin'; // Importamos el archivo del Paso 1

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, email, password, uid, displayName, role } = body;

    // --- 1. CREAR USUARIO (AUTH) ---
    if (action === 'create') {
      if (!email || !password) {
        return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
      }

      const userRecord = await adminAuth.createUser({
        email,
        password,
        displayName: displayName || '',
        emailVerified: true,
      });

      // Asignar rol 'owner'
      await adminAuth.setCustomUserClaims(userRecord.uid, { role: role || 'owner' });

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

      await adminAuth.updateUser(uid, {
        password: password
      });

      return NextResponse.json({ success: true });
    }

    // --- 3. ELIMINAR USUARIO (AUTH) ---
    // Esto asegura que si borras al dueño de la BD, también se borre su acceso
    if (action === 'delete') {
       if (!uid) return NextResponse.json({ error: 'Falta UID' }, { status: 400 });
       await adminAuth.deleteUser(uid);
       return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });

  } catch (error: any) {
    console.error("Error API Owners:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
