import { NextRequest, NextResponse } from 'next/server';
import { contexto } from '@/lib/google';
import { leerPendientes } from '@/lib/sheet';
import { armarCorreo } from '@/lib/mail';
import { puedeEnviar } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const ctx = await contexto(req);
  if (!ctx) return NextResponse.json({ error: 'Sesión vencida. Vuelve a entrar.' }, { status: 401 });
  try {
    const l = await leerPendientes(ctx);
    const items = l.items.map((f) => ({ ...f, html: armarCorreo(f).html }));
    return NextResponse.json({ ...l, items, yo: ctx.email, puedeEnviar: puedeEnviar(ctx.email) });
  } catch (e: any) {
    const msg = e?.errors?.[0]?.message || e?.message || 'Error al leer la hoja';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
