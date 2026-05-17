import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { name, email, rut, phone, sport, position } = await request.json();

    if (!email || !name) {
      return NextResponse.json({ error: 'Email and Name are required.' }, { status: 400 });
    }

    const resendApiKey = process.env.RESEND_API_KEY;

    // Premium HTML Email Template
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>¡Bienvenido a la Élite de MVP Sports!</title>
  <style>
    body {
      background-color: #020617;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      background-color: #020617;
      padding: 40px 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #0f172a;
      border: 1px solid rgba(255,255,255,0.05);
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(0,0,0,0.5);
    }
    .header {
      background: linear-gradient(135deg, #0f172a, #064e3b);
      padding: 40px;
      text-align: center;
      border-bottom: 2px solid #10b981;
    }
    .logo {
      font-size: 28px;
      font-weight: 900;
      color: #f8fafc;
      letter-spacing: -1.5px;
      text-transform: uppercase;
      margin: 0;
    }
    .logo span {
      color: #10b981;
    }
    .content {
      padding: 40px;
    }
    h1 {
      font-size: 24px;
      font-weight: 900;
      color: #f8fafc;
      margin-top: 0;
      margin-bottom: 15px;
      text-transform: uppercase;
      letter-spacing: -0.5px;
    }
    p {
      color: #94a3b8;
      font-size: 15px;
      line-height: 1.6;
      margin-top: 0;
      margin-bottom: 25px;
    }
    .player-card {
      background-color: #1e293b;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 16px;
      padding: 25px;
      margin-bottom: 30px;
    }
    .card-title {
      font-size: 11px;
      font-weight: 900;
      color: #10b981;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-bottom: 15px;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
    }
    .info-item {
      margin-bottom: 12px;
    }
    .info-label {
      font-size: 10px;
      font-weight: 800;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .info-value {
      font-size: 15px;
      font-weight: 900;
      color: #f8fafc;
      margin-top: 2px;
    }
    .footer {
      background-color: #0b0f19;
      padding: 25px 40px;
      text-align: center;
      border-top: 1px solid rgba(255,255,255,0.05);
    }
    .footer-text {
      color: #64748b;
      font-size: 11px;
      font-weight: 700;
      margin: 0;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h2 class="logo">MVP <span>SPORTS</span></h2>
      </div>
      <div class="content">
        <h1>¡Bienvenido a la Élite, ${name}!</h1>
        <p>Tu cuenta ha sido creada con éxito en el sistema unificado de MVP Sports. A partir de ahora, tienes acceso completo al mapa interactivo de recintos, reservas instantáneas y tu ficha de jugador elite.</p>
        
        <div class="player-card">
          <div class="card-title">FICHA DE JUGADOR ACTIVADA</div>
          <div style="margin-bottom: 15px;">
            <div class="info-label">Nombre del Jugador</div>
            <div class="info-value" style="font-size: 20px; color: #10b981;">${name}</div>
          </div>
          <div class="grid">
            <div class="info-item">
              <div class="info-label">RUT</div>
              <div class="info-value">${rut || '---'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Teléfono</div>
              <div class="info-value">${phone || '---'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Deporte Principal</div>
              <div class="info-value">${sport || '---'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Posición</div>
              <div class="info-value">${position || '---'}</div>
            </div>
          </div>
        </div>
        
        <p style="margin-bottom: 0;">Para ingresar, abre la aplicación móvil o accede a través de la web utilizando tu correo <strong>${email}</strong>.</p>
      </div>
      <div class="footer">
        <p class="footer-text">MVP Sports Suite © 2026 • El Futuro del Deporte</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

    if (!resendApiKey) {
      console.warn('RESEND_API_KEY env variable is not set. Simulating successful email dispatch (Mock Mode).');
      return NextResponse.json({
        success: true,
        message: 'Mock Mode: Email logged successfully (no RESEND_API_KEY set).',
        data: { name, email }
      });
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'MVP Sports <onboarding@resend.dev>',
        to: [email],
        subject: '¡Bienvenido a la Élite de MVP Sports!',
        html: htmlContent,
      }),
    });

    const resData = await response.json();

    if (!response.ok) {
      console.error('Error from Resend API:', resData);
      return NextResponse.json({ error: resData.message || 'Failed to dispatch email.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: resData });
  } catch (error: any) {
    console.error('API send-email error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
