
import { access } from 'node:fs/promises';
import path from 'node:path';

import nodemailer from 'nodemailer';

import type { Env } from '../../../env.js';

// ============================================
// SEGURIDAD PARA CONTENIDO HTML
// ============================================

function escapeHtml(value: string): string {
  const replacements: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };

  return value.replace(
    /[&<>"']/g,
    character => replacements[character] ?? character
  );
}

// ============================================
// SERVICIO DE CORREO
// ============================================

export function createRecoveryMailer(env: Env) {

  // El correo solo estará disponible
  // si existe una configuración SMTP válida.

  const enabled = Boolean(
    env.SMTP_HOST &&
    env.SMTP_USER &&
    env.SMTP_PASS &&
    env.MAIL_FROM &&
    env.FRONTEND_ORIGIN
  );

  // ==========================================
  // TRANSPORTE SMTP
  // ==========================================

  const transport = enabled
    ? nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,

        // El puerto 465 utiliza TLS desde
        // el inicio de la conexión.
        secure: env.SMTP_PORT === 465,

        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS
        },

        // En otros puertos se exige STARTTLS.
        requireTLS: env.SMTP_PORT !== 465
      })
    : null;

  return {
    enabled,

    // ========================================
    // ENVIAR RECUPERACIÓN
    // ========================================

    async send(
      nombre: string,
      correo: string,
      token: string
    ): Promise<void> {

      if (!transport) {
        throw new Error(
          'El servicio SMTP no está configurado.'
        );
      }

      // --------------------------------------
      // GENERAR ENLACE SEGURO
      // --------------------------------------

      const link = new URL(
        '/restablecer-contrasena',
        env.FRONTEND_ORIGIN
      );

      link.searchParams.set('token', token);

      const recoveryUrl = link.toString();

      // --------------------------------------
      // IMAGEN INSTITUCIONAL
      // --------------------------------------

      const imageFile = env.MAIL_SIGNATURE_IMAGE_PATH;

      const attachments = imageFile
        ? [
            {
              filename: path.basename(imageFile),
              path: imageFile,
              cid: 'firma-siip'
            }
          ]
        : [];

      if (imageFile) {
        // Comprobar que el archivo existe.
        await access(imageFile);
      }

      // --------------------------------------
      // CORREO EN TEXTO PLANO
      // --------------------------------------

      const text = `
Hola, ${nombre}:

Recibimos una solicitud para restablecer la contraseña de tu cuenta del SIIP Salamanca.

Para establecer una nueva contraseña, visita este enlace:

${recoveryUrl}

El enlace estará disponible durante 20 minutos y solo podrá utilizarse una vez.

Si no solicitaste este cambio, puedes ignorar este mensaje.

SIIP Salamanca
Sistema Integral de Indicadores y Planeación
      `.trim();

      // --------------------------------------
      // CORREO HTML INSTITUCIONAL
      // --------------------------------------

      const html = `
        <!DOCTYPE html>
        <html lang="es">
          <head>
            <meta charset="UTF-8">
            <meta
              name="viewport"
              content="width=device-width, initial-scale=1.0"
            >
            <title>Recuperación de contraseña</title>
          </head>

          <body style="
            margin:0;
            padding:32px 12px;
            background:#f4f5f7;
            font-family:Arial,Helvetica,sans-serif;
            color:#29313a;
          ">

            <table
              role="presentation"
              cellpadding="0"
              cellspacing="0"
              style="
                width:100%;
                max-width:600px;
                margin:auto;
                background:#ffffff;
                border-collapse:collapse;
              "
            >
              <tr>
                <td style="
                  background:#70273B;
                  color:#ffffff;
                  padding:28px;
                  text-align:center;
                ">
                  <div style="
                    font-size:26px;
                    font-weight:700;
                    letter-spacing:2px;
                  ">
                    SIIP
                  </div>

                  <div style="
                    margin-top:8px;
                    font-size:12px;
                    letter-spacing:1px;
                  ">
                    SALAMANCA
                  </div>
                </td>
              </tr>

              <tr>
                <td style="
                  padding:36px 30px;
                  line-height:1.7;
                ">

                  <h1 style="
                    color:#70273B;
                    font-size:24px;
                    line-height:1.3;
                    margin:0 0 24px;
                  ">
                    Recuperación de contraseña
                  </h1>

                  <p>
                    Hola,
                    <strong>${escapeHtml(nombre)}</strong>:
                  </p>

                  <p>
                    Recibimos una solicitud para
                    restablecer la contraseña de tu
                    cuenta en el SIIP Salamanca.
                  </p>

                  <p>
                    Para establecer una nueva
                    contraseña, selecciona el
                    siguiente botón:
                  </p>

                  <div style="
                    text-align:center;
                    padding:24px 0;
                  ">
                    <a
                      href="${escapeHtml(recoveryUrl)}"
                      style="
                        display:inline-block;
                        padding:14px 26px;
                        background:#70273B;
                        color:#ffffff;
                        border-radius:8px;
                        text-decoration:none;
                        font-size:14px;
                        font-weight:bold;
                      "
                    >
                      Restablecer contraseña
                    </a>
                  </div>

                  <p style="
                    font-size:13px;
                    color:#606975;
                  ">
                    Por seguridad, este enlace
                    caducará en 20 minutos
                    y solo podrá utilizarse
                    una vez.
                  </p>

                  <p style="
                    font-size:13px;
                    color:#606975;
                  ">
                    Si no solicitaste este cambio,
                    puedes ignorar el mensaje.
                    Tu contraseña actual seguirá
                    funcionando.
                  </p>

                  ${
                    imageFile
                      ? `
                        <div style="
                          margin-top:36px;
                          border-top:1px solid #e6e8ec;
                          padding-top:28px;
                          text-align:center;
                        ">
                          <img
                            src="cid:firma-siip"
                            alt="Imagen institucional del IMPLAN"
                            style="
                              max-width:100%;
                              max-height:220px;
                              height:auto;
                            "
                          >
                        </div>
                      `
                      : ''
                  }

                </td>
              </tr>
            </table>
          </body>
        </html>
      `;

      // --------------------------------------
      // ENVIAR CORREO
      // --------------------------------------

      await transport.sendMail({
        from: env.MAIL_FROM,
        to: correo,
        subject:
          'Recuperación de contraseña — SIIP Salamanca',
        text,
        html,
        attachments
      });
    }
  };
}

export type RecoveryMailer =
  ReturnType<typeof createRecoveryMailer>;
