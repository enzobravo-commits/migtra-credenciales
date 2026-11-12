import { google } from 'googleapis';
import { CONFIG, copiaPara as copiaPara_ } from './config';
import type { Ctx } from './google';

export type Datos = { email: string; fleet: string; pw: string };

export function saludo(d = new Date()) {
  const h = parseInt(new Intl.DateTimeFormat('es-CL', { hour: 'numeric', hour12: false, timeZone: CONFIG.zona }).format(d), 10) % 24;
  return h < 12 ? 'buenos días' : h < 20 ? 'buenas tardes' : 'buenas noches';
}
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const INTRO = [
  'Espero que te encuentres bien.',
  'A continuación, te comparto los accesos a las plataformas MIGTRA. Adjunto encontrarás el paso a paso que debes seguir para ingresar correctamente.',
  'Es importante mencionar que, al instalar la aplicación Authenticator, esta quedará asociada a ese celular en específico. Por lo tanto, será a ese dispositivo donde llegará el código de acceso.',
];
const NOTA = 'Nota: Es fundamental que el celular tenga la hora exacta, sin adelantos ni retrasos.';
const CIERRE = 'Ante cualquier duda o inconveniente, por favor indícanos para poder apoyarte.';

export function armarCorreo(d: Datos) {
  const g = `Estimados, ${saludo()}.`;
  const td = 'style="border:1px solid #ccc;padding:6px 10px"';
  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#222"><p>${g}</p>${INTRO.map((t) => `<p>${t}</p>`).join('')}<p><b>Datos de acceso</b></p><table style="border-collapse:collapse"><tr><th ${td}>Nombre EESS</th><th ${td}>Correo electrónico</th><th ${td}>Contraseña temporal</th></tr><tr><td ${td}>${esc(d.fleet || '—')}</td><td ${td}>${esc(d.email)}</td><td ${td}><span style="font-family:Consolas,monospace">${esc(d.pw)}</span></td></tr></table><p>${NOTA}</p><p>${CIERRE}</p><p>Saludos cordiales,</p></div>`;
  const txt = `${g}\n\n${INTRO.join('\n\n')}\n\nDatos de acceso\nNombre EESS: ${d.fleet || '—'}\nCorreo electrónico: ${d.email}\nContraseña temporal: ${d.pw}\n\n${NOTA}\n\n${CIERRE}\n\nSaludos cordiales,`;
  return { asunto: CONFIG.asunto, html, txt };
}

const b64 = (s: string | Buffer) => Buffer.from(s).toString('base64');
const b64lineas = (buf: Buffer) => buf.toString('base64').replace(/(.{76})/g, '$1\r\n');
const cab = (s: string) => `=?UTF-8?B?${b64(s)}?=`;

function mime(para: string, cc: string[], asunto: string, txt: string, html: string, pdf: Buffer) {
  const b1 = 'mix_' + Date.now().toString(36), b2 = 'alt_' + Date.now().toString(36);
  const l = [
    `To: ${para}`, ...(cc.length ? [`Cc: ${cc.join(', ')}`] : []), `Subject: ${cab(asunto)}`, 'MIME-Version: 1.0', `Content-Type: multipart/mixed; boundary="${b1}"`, '',
    `--${b1}`, `Content-Type: multipart/alternative; boundary="${b2}"`, '',
    `--${b2}`, 'Content-Type: text/plain; charset="UTF-8"', 'Content-Transfer-Encoding: base64', '', b64(txt).replace(/(.{76})/g, '$1\r\n'),
    `--${b2}`, 'Content-Type: text/html; charset="UTF-8"', 'Content-Transfer-Encoding: base64', '', b64(html).replace(/(.{76})/g, '$1\r\n'),
    `--${b2}--`,
    `--${b1}`, `Content-Type: application/pdf; name="${cab(CONFIG.adjuntoNombre)}"`, 'Content-Transfer-Encoding: base64',
    `Content-Disposition: attachment; filename="${cab(CONFIG.adjuntoNombre)}"`, '', b64lineas(pdf),
    `--${b1}--`, '',
  ];
  return Buffer.from(l.join('\r\n')).toString('base64url');
}

export async function crear(ctx: Ctx, d: Datos, modo: 'borrador' | 'enviar', copiaPara?: string) {
  const dr = google.drive({ version: 'v3', auth: ctx.auth });
  const r = await dr.files.get({ fileId: CONFIG.guiaId, alt: 'media' }, { responseType: 'arraybuffer' });
  const pdf = Buffer.from(r.data as ArrayBuffer);
  const m = armarCorreo(d);
  const cc = copiaPara ? [] : copiaPara_(ctx.email, d.email);
  const raw = mime(copiaPara || d.email, cc, m.asunto, m.txt, m.html, pdf);
  const gmail = google.gmail({ version: 'v1', auth: ctx.auth });
  if (modo === 'borrador') await gmail.users.drafts.create({ userId: 'me', requestBody: { message: { raw } } });
  else await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
}
