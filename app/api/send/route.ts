import { NextRequest, NextResponse } from 'next/server';
import { contexto } from '@/lib/google';
import { leerPendientes, registrar } from '@/lib/sheet';
import { crear } from '@/lib/mail';
import { puedeEnviar } from '@/lib/config';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const ctx = await contexto(req);
  if (!ctx) return NextResponse.json({ error: 'Sesión vencida. Vuelve a entrar.' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
  const modo: 'borrador' | 'enviar' | 'prueba' = body.modo;
  if (!ids.length || !['borrador', 'enviar', 'prueba'].includes(modo)) return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 });
  if (modo === 'enviar' && !puedeEnviar(ctx.email)) return NextResponse.json({ error: 'Tu usuario solo puede crear borradores.' }, { status: 403 });

  const l = await leerPendientes(ctx);
  const resultados: { email: string; ok: boolean; msg: string }[] = [];
  for (const id of ids) {
    const f = l.items.find((x) => x.id === id);
    if (!f) { resultados.push({ email: id, ok: false, msg: 'Ya no está pendiente (¿ya enviada o cambió la hoja?)' }); continue; }
    try {
      if (modo === 'prueba') await crear(ctx, f, 'enviar', ctx.email);
      else await crear(ctx, f, modo);
      if (modo !== 'prueba') await registrar(ctx, l.pestana, f, `${modo === 'enviar' ? 'ENVIADO' : 'BORRADOR'} por ${ctx.email}`);
      resultados.push({ email: f.email, ok: true, msg: modo === 'enviar' ? 'Enviado' : modo === 'prueba' ? 'Prueba enviada a tu correo' : 'Borrador creado' });
    } catch (e: any) {
      resultados.push({ email: f.email, ok: false, msg: e?.errors?.[0]?.message || e?.message || 'Error' });
    }
  }
  return NextResponse.json({ resultados });
}
