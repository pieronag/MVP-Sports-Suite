import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/services/firebase-admin';

export async function POST(request: Request) {
  try {
    const { email, type, name: providedName } = await request.json();

    if (!email || !type) {
      return NextResponse.json({ error: "Email and Type ('verify' | 'reset') are required." }, { status: 400 });
    }

    // Resolving name from Firestore if not provided
    let name = providedName || 'Jugador';
    try {
      const userQuery = await adminDb.collection('users').where('email', '==', email.toLowerCase().trim()).limit(1).get();
      if (!userQuery.empty) {
        const userData = userQuery.docs[0].data();
        name = userData.displayName || name;
      }
    } catch (dbErr) {
      console.error('Error fetching user for auth email:', dbErr);
    }

    let actionLink = '';
    let subject = '';
    let title = '';
    let description = '';
    let buttonText = '';

    // Action Code Settings can be passed if we want to redirect to app or dashboard
    const actionCodeSettings = {
      // The URL to redirect to after verification / reset is completed
      url: 'https://mvp-sports-chile.firebaseapp.com',
      handleCodeInApp: false
    };

    if (type === 'verify') {
      actionLink = await adminAuth.generateEmailVerificationLink(email, actionCodeSettings);
      subject = 'Verifica tu correo electrónico - MVP Sports';
      title = 'Activa tu Cuenta';
      description = `Hola, ${name}. Gracias por registrarte en la plataforma de MVP Sports. Para poder iniciar sesión en la aplicación móvil y el panel de control, debes verificar tu cuenta haciendo clic en el siguiente botón:`;
      buttonText = 'Verificar Cuenta';
    } else if (type === 'reset') {
      actionLink = await adminAuth.generatePasswordResetLink(email, actionCodeSettings);
      subject = 'Restablece tu contraseña - MVP Sports';
      title = 'Restablece tu Contraseña';
      description = `Hola, ${name}. Hemos recibido una solicitud para restablecer la contraseña de tu cuenta de MVP Sports. Si no realizaste esta solicitud, puedes ignorar este correo. De lo contrario, haz clic en el siguiente botón para crear una nueva contraseña:`;
      buttonText = 'Restablecer Contraseña';
    } else {
      return NextResponse.json({ error: "Invalid Type. Must be 'verify' or 'reset'." }, { status: 400 });
    }

    // Premium HTML Template
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
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
      max-width: 500px;
      margin: 0 auto;
      background-color: #0f172a;
      border: 1px solid rgba(255,255,255,0.05);
      border-radius: 28px;
      overflow: hidden;
      box-shadow: 0 20px 50px rgba(0,0,0,0.6);
    }
    .header {
      background: linear-gradient(135deg, #0f172a, #064e3b);
      padding: 40px 30px;
      text-align: center;
      border-bottom: 2px solid #10b981;
    }
    .logo {
      font-size: 26px;
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
      padding: 40px 35px;
      text-align: center;
    }
    h1 {
      font-size: 22px;
      font-weight: 900;
      color: #f8fafc;
      margin-top: 0;
      margin-bottom: 15px;
      text-transform: uppercase;
      letter-spacing: -0.5px;
    }
    p {
      color: #94a3b8;
      font-size: 14px;
      line-height: 1.6;
      margin-top: 0;
      margin-bottom: 30px;
      text-align: left;
    }
    .cta-button {
      display: inline-block;
      background-color: #10b981;
      color: #020617 !important;
      font-size: 13px;
      font-weight: 900;
      text-transform: uppercase;
      text-decoration: none;
      letter-spacing: 1px;
      padding: 16px 36px;
      border-radius: 16px;
      box-shadow: 0 10px 20px rgba(16, 185, 129, 0.25);
      transition: all 0.3s ease;
      margin-bottom: 10px;
    }
    .footer {
      background-color: #0b0f19;
      padding: 25px 30px;
      text-align: center;
      border-top: 1px solid rgba(255,255,255,0.05);
    }
    .footer-text {
      color: #64748b;
      font-size: 10px;
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
        <h1>${title}</h1>
        <p>${description}</p>
        
        <a href="${actionLink}" class="cta-button" target="_blank">${buttonText}</a>
        
        <p style="color: #64748b; font-size: 11px; margin-top: 30px; margin-bottom: 0; text-align: center;">
          Si el botón no funciona, puedes copiar y pegar el siguiente enlace en tu navegador:<br>
          <a href="${actionLink}" style="color: #10b981; word-break: break-all; text-decoration: none; font-size: 11px;">${actionLink}</a>
        </p>
      </div>
      <div class="footer">
        <p class="footer-text">MVP Sports Suite © 2026 • El Futuro del Deporte</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      console.warn('RESEND_API_KEY is not set. Simulating custom email dispatch (Mock Mode).');
      console.log('Action Link Generated:', actionLink);
      return NextResponse.json({
        success: true,
        message: 'Mock Mode: Email logged successfully.',
        actionLink,
        data: { name, email, type }
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
        subject: subject,
        html: htmlContent,
      }),
    });

    const resData = await response.json();

    if (!response.ok) {
      console.error('Error from Resend API:', resData);
      return NextResponse.json({ error: resData.message || 'Failed to dispatch email.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: resData, actionLink });
  } catch (error: any) {
    console.error('API send-auth-email error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
