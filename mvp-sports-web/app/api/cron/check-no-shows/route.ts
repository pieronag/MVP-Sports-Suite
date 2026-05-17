import { NextResponse } from 'next/server';
import { adminDb } from '@/services/firebase-admin';

export async function GET(request: Request) {
  try {
    // 1. Verificar autorización (Vercel Cron Security)
    const authHeader = request.headers.get('authorization');
    if (process.env.NODE_ENV === 'production' && process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const nowChileStr = new Date().toLocaleString("en-US", { timeZone: "America/Santiago" });
    const now = new Date(nowChileStr);
    const bookingsRef = adminDb.collection('bookings');
    
    // Obtener reservas activas/pendientes que aún no se han jugado (no han hecho check-in)
    const snapshot = await bookingsRef
      .where('status', 'in', ['pending', 'confirmed'])
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ 
        success: true, 
        message: 'No pending or confirmed bookings found.', 
        processedCount: 0 
      });
    }

    const batch = adminDb.batch();
    let processedCount = 0;
    const details: any[] = [];

    snapshot.docs.forEach((doc) => {
      const bData = doc.data();
      const bookingId = doc.id;
      
      // A. COMPROBACIÓN 1: El horario de la reserva ya pasó (NO-SHOW)
      let isNoShow = false;
      let isTimeout = false;

      if (bData.date && bData.startTime) {
        let bookingDate: Date;
        if (bData.date.toDate) {
          bookingDate = bData.date.toDate();
        } else {
          bookingDate = new Date(bData.date);
        }
        
        const [hours, minutes] = (bData.startTime || "00:00").split(':').map(Number);
        const bookingDateChileStr = bookingDate.toLocaleString("en-US", { timeZone: "America/Santiago" });
        const startDateTime = new Date(bookingDateChileStr);
        startDateTime.setHours(hours, minutes, 0, 0);

        // Si la hora de inicio es de madrugada (< 6 AM), pertenece al día siguiente cronológico
        if (hours < 6) {
          startDateTime.setDate(startDateTime.getDate() + 1);
        }

        // Si la hora de inicio de la reserva ya pasó en el tiempo real en Chile y no ha hecho check-in
        if (now >= startDateTime && bData.checkIn !== true) {
          isNoShow = true;
        }
      }

      // B. COMPROBACIÓN 2: Reserva pendiente de pago abandonada hace más de 15 minutos en el checkout
      if (bData.status === 'pending' && bData.createdAt) {
        const createdAtDate = new Date(bData.createdAt);
        const diffMs = now.getTime() - createdAtDate.getTime();
        const diffMins = diffMs / (1000 * 60);

        // Si lleva más de 15 minutos en 'pending' y no se ha pagado, liberamos el cupo
        if (diffMins > 15) {
          isTimeout = true;
        }
      }

      // C. APLICAR CANCELACIÓN AUTOMÁTICA
      if (isNoShow || isTimeout) {
        const docRef = bookingsRef.doc(bookingId);
        
        const updateData: any = {
          status: 'cancelled',
          cancelledAt: now.toISOString(),
          cancelledBy: 'system_cron_job',
          updatedAt: now.toISOString()
        };

        if (isNoShow) {
          if (bData.paymentStatus !== 'paid' && bData.paymentStatus !== 'partial') {
            updateData.paymentStatus = 'no-show';
          }
          updateData.notes = 'Cancelación automática por inasistencia sin check-in (No-Show).';
        } else if (isTimeout) {
          updateData.paymentStatus = 'failed';
          updateData.notes = 'Liberación automática por tiempo de pago agotado en pasarela.';
        }

        batch.update(docRef, updateData);
        processedCount++;
        details.push({
          id: bookingId,
          client: bData.clientName || 'Jugador',
          court: bData.courtName || 'Cancha',
          type: isNoShow ? 'no-show' : 'timeout'
        });
      }
    });

    if (processedCount > 0) {
      await batch.commit();
      console.log(`[CRON] Se procesaron y cancelaron ${processedCount} reservas impagas.`);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully executed no-show and timeout check.`,
      processedCount,
      details
    });

  } catch (error: any) {
    console.error('API check-no-shows cron error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
