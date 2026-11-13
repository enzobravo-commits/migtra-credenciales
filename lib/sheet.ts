import { google } from 'googleapis';
import { createHash } from 'crypto';
import ExcelJS from 'exceljs';
import { CONFIG } from './config';
import type { Ctx } from './google';

export type Fila = { id: string; fila: number; email: string; fleet: string; pw: string; borrador?: boolean };
export type Lectura = { pestana: string; items: Fila[]; omitidas: { yaEnviados: number; inactivos: number; sinClave: number; rojas: number } };

export const huella = (email: string, pw: string) =>
  createHash('sha256').update(email.trim().toLowerCase() + '|' + pw).digest('base64url').slice(0, 16);

type Color = { red?: number; green?: number; blue?: number } | undefined;
const rgb = (c: Color) => [Math.round((c?.red || 0) * 255), Math.round((c?.green || 0) * 255), Math.round((c?.blue || 0) * 255)];
const esBlanco = (c: Color) => { const [r, g, b] = rgb(c); return r > 250 && g > 250 && b > 250; };
function esVerde(c: Color) { const [r, g, b] = rgb(c); return g >= 120 && g >= r + 12 && g >= b + 12; }
function esRojo(c: Color) { const [r, g, b] = rgb(c); return r >= 150 && r >= g + 35 && r >= b + 35; }

function colorCelda(c: ExcelJS.Cell): Color {
  const f: any = c.fill;
  const argb: string | undefined = f && f.type === 'pattern' ? f.fgColor?.argb : undefined;
  if (!argb || argb.length < 6) return undefined;
  const h = argb.slice(-6);
  return { red: parseInt(h.slice(0, 2), 16) / 255, green: parseInt(h.slice(2, 4), 16) / 255, blue: parseInt(h.slice(4, 6), 16) / 255 };
}

// Roberto sube un archivo nuevo de vez en cuando: toma el .xlsx "usuarios*" más reciente de la carpeta.
// Si no se puede listar la carpeta, usa el archivo configurado.
async function archivoVigente(drive: ReturnType<typeof google.drive>): Promise<string> {
  try {
    const l = await drive.files.list({
      q: `'${process.env.SOURCE_FOLDER_ID || '1RvggaG0-yDP0yB7wGQFa3kTA8JPi40l9'}' in parents and trashed = false and name contains 'usuarios' and mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'`,
      orderBy: 'createdTime desc', pageSize: 1, fields: 'files(id,name)',
      supportsAllDrives: true, includeItemsFromAllDrives: true,
    });
    return l.data.files?.[0]?.id || CONFIG.archivoId;
  } catch {
    return CONFIG.archivoId;
  }
}

async function descargarLibro(ctx: Ctx): Promise<ExcelJS.Workbook> {
  const drive = google.drive({ version: 'v3', auth: ctx.auth });
  const fileId = await archivoVigente(drive);
  const r = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'arraybuffer' });
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(Buffer.from(r.data as ArrayBuffer) as any);
  return wb;
}

const sheets = (ctx: Ctx) => google.sheets({ version: 'v4', auth: ctx.auth });

async function huellasEnviadas(ctx: Ctx): Promise<{ enviadas: Set<string>; borradores: Set<string> }> {
  const s = sheets(ctx);
  const meta = await s.spreadsheets.get({ spreadsheetId: CONFIG.registroId, fields: 'sheets.properties.title' });
  const existe = (meta.data.sheets || []).some((x) => x.properties?.title === CONFIG.hojaRegistro);
  if (!existe) {
    await s.spreadsheets.batchUpdate({ spreadsheetId: CONFIG.registroId, requestBody: { requests: [{ addSheet: { properties: { title: CONFIG.hojaRegistro } } }] } });
    await s.spreadsheets.values.update({
      spreadsheetId: CONFIG.registroId, range: `'${CONFIG.hojaRegistro}'!A1:G1`, valueInputOption: 'RAW',
      requestBody: { values: [['Fecha', 'Pestaña', 'Fila', 'Email', 'Flota', 'Huella', 'Resultado / quién']] },
    });
    return { enviadas: new Set(), borradores: new Set() };
  }
  const r = await s.spreadsheets.values.get({ spreadsheetId: CONFIG.registroId, range: `'${CONFIG.hojaRegistro}'!F2:G` });
  const enviadas = new Set<string>(), borradores = new Set<string>();
  (r.data.values || []).forEach((v) => {
    const est = String(v[1] || '');
    if (v[0] && est.startsWith('ENVIADO')) enviadas.add(String(v[0]));
    else if (v[0] && est.startsWith('BORRADOR')) borradores.add(String(v[0]));
  });
  return { enviadas, borradores };
}

export async function leerPendientes(ctx: Ctx): Promise<Lectura> {
  if (!CONFIG.registroId) throw new Error('Falta LOG_SHEET_ID (hoja de registro) en las variables de entorno.');
  const wb = await descargarLibro(ctx);
  const pestanas = wb.worksheets.map((w) => w.name).filter((t) => CONFIG.pestanaPatron.test(t)).sort();
  if (!pestanas.length) throw new Error('No encontré pestañas con nombre UsersAAAAMMDD en el archivo.');
  const pestana = pestanas[pestanas.length - 1];
  const ws = wb.getWorksheet(pestana)!;
  const { enviadas, borradores } = await huellasEnviadas(ctx);

  const texto = (c: ExcelJS.Cell) => String(c.text ?? '').trim();
  const enc: string[] = [];
  ws.getRow(1).eachCell({ includeEmpty: true }, (c, n) => { enc[n - 1] = texto(c).toLowerCase(); });
  const ix = (n: string, d: number) => (enc.indexOf(n) >= 0 ? enc.indexOf(n) : d);
  const I = { email: ix('email', 0), type: ix('type', 1), sso: ix('sso', 2), fleet: ix('fleet', 3), pw: ix('password', 4), active: ix('active', 5) };

  const omitidas = { yaEnviados: 0, inactivos: 0, sinClave: 0, rojas: 0 };
  const items: Fila[] = [];
  for (let i = 2; i <= ws.rowCount; i++) {
    const row = ws.getRow(i);
    const celdas = [0, 1, 2, 3, 4, 5, 6].map((k) => row.getCell(k + 1));
    const col = celdas.map(colorCelda);
    const v = (k: number) => texto(row.getCell(k + 1));
    if (!v(I.email)) continue;
    if (col.some(esRojo)) { omitidas.rojas++; continue; }
    if (!col.some((c) => !esBlanco(c) && esVerde(c))) continue;
    if (v(I.active) === '0') { omitidas.inactivos++; continue; }
    const pw = v(I.pw);
    if (!pw || v(I.type).toLowerCase() === 'interno' || v(I.sso) === '1') { omitidas.sinClave++; continue; }
    const h = huella(v(I.email), pw);
    if (enviadas.has(h)) { omitidas.yaEnviados++; continue; }
    items.push({ id: h, fila: i, email: v(I.email), fleet: v(I.fleet), pw, borrador: borradores.has(h) });
  }
  return { pestana, items, omitidas };
}

export async function registrar(ctx: Ctx, pestana: string, f: Fila, resultado: string) {
  await sheets(ctx).spreadsheets.values.append({
    spreadsheetId: CONFIG.registroId, range: `'${CONFIG.hojaRegistro}'!A:G`, valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [[new Date().toLocaleString('es-CL', { timeZone: CONFIG.zona }), pestana, f.fila, f.email, f.fleet, huella(f.email, f.pw), resultado]] },
  });
}
