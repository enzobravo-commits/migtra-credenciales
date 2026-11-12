'use client';
import { useCallback, useEffect, useState } from 'react';
import { signOut } from 'next-auth/react';

type Item = { id: string; fila: number; email: string; fleet: string; pw: string; html: string; borrador?: boolean };
type Data = { pestana: string; items: Item[]; omitidas: { yaEnviados: number; inactivos: number; sinClave: number; rojas: number }; yo: string; puedeEnviar: boolean };
type Res = { email: string; ok: boolean; msg: string };

export default function Panel({ yo }: { yo: string }) {
  const [d, setD] = useState<Data | null>(null);
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const [cur, setCur] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ k: string; t: string; lines?: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmar, setConfirmar] = useState(false);

  const cargar = useCallback(async () => {
    setBusy(true); setMsg({ k: 'info', t: 'Leyendo la hoja…' });
    try {
      const r = await fetch('/api/pending', { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok) { setMsg({ k: 'err', t: j.error || 'Error' }); if (r.status === 401) setTimeout(() => signOut(), 1500); return; }
      setD(j); setSel({}); setCur(null); setMsg(null);
    } catch { setMsg({ k: 'err', t: 'No pude conectar. Revisa tu internet e intenta de nuevo.' }); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const ids = Object.keys(sel).filter((k) => sel[k]);
  const actual = d?.items.find((i) => i.id === cur);

  async function enviar(modo: 'borrador' | 'enviar' | 'prueba') {
    setBusy(true); setConfirmar(false); setMsg({ k: 'info', t: 'Procesando…' });
    try {
      const r = await fetch('/api/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids, modo }) });
      const j = await r.json();
      if (!r.ok) { setMsg({ k: 'err', t: j.error || 'Error' }); setBusy(false); return; }
      const res: Res[] = j.resultados;
      const ok = res.filter((x) => x.ok).length;
      const etiqueta = modo === 'enviar' ? 'Enviados' : modo === 'prueba' ? 'Pruebas enviadas a tu correo' : 'Borradores creados';
      setMsg({ k: ok === res.length ? 'ok' : 'err', t: `${etiqueta}: ${ok} de ${res.length}.`, lines: res.filter((x) => !x.ok).map((x) => `${x.email}: ${x.msg}`) });
      if (modo === 'prueba') setBusy(false); else await cargar2(`${etiqueta}: ${ok} de ${res.length}.`, res);
    } catch { setMsg({ k: 'err', t: 'Falló la conexión. Antes de reintentar revisa Gmail y la pestaña Envíos para no duplicar.' }); setBusy(false); }
  }
  async function cargar2(t: string, res: Res[]) {
    const bad = res.filter((x) => !x.ok).map((x) => `${x.email}: ${x.msg}`);
    await cargar();
    setMsg({ k: bad.length ? 'err' : 'ok', t, lines: bad });
  }

  return (
    <>
      <header>
        <h1>Credenciales MIGTRA</h1>
        <div className="who"><span>{yo}</span><button onClick={() => signOut()}>Salir</button></div>
      </header>
      <main>
        {msg && <div className={`msg ${msg.k}`}>{msg.t}{msg.lines?.length ? <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>{msg.lines.map((l, i) => <li key={i}>{l}</li>)}</ul> : null}</div>}
        <section>
          <h2>Pendientes {d ? `(pestaña ${d.pestana})` : ''}</h2>
          {d && <div className="muted">{d.items.length} pendiente(s). Omitidas: {d.omitidas.yaEnviados} ya enviadas, {d.omitidas.inactivos} inactivas, {d.omitidas.rojas} en rojo, {d.omitidas.sinClave} sin clave o internas.</div>}
          <div className="tw" style={{ marginTop: 8 }}>
            <table>
              <thead><tr><th><input type="checkbox" aria-label="Todas" checked={!!d?.items.length && d.items.every((i) => sel[i.id])} onChange={(e) => { const m: Record<string, boolean> = {}; d?.items.forEach((i) => (m[i.id] = e.target.checked)); setSel(m); }} /></th><th>Correo</th><th>Nombre EESS</th><th>Contraseña</th><th>Fila</th><th>Estado</th></tr></thead>
              <tbody>
                {!d?.items.length && <tr><td colSpan={6} className="muted">{busy ? 'Cargando…' : 'No hay pendientes.'}</td></tr>}
                {d?.items.map((i) => (
                  <tr key={i.id} className={cur === i.id ? 'sel' : ''} style={{ cursor: 'pointer' }} onClick={() => setCur(i.id)}>
                    <td><input type="checkbox" aria-label={`Seleccionar ${i.email}`} checked={!!sel[i.id]} onClick={(e) => e.stopPropagation()} onChange={(e) => setSel({ ...sel, [i.id]: e.target.checked })} /></td>
                    <td>{i.email}</td><td>{i.fleet || '—'}</td><td className="pw">{i.pw}</td><td>{i.fila}</td>
                    <td><span className={`tag${i.borrador ? ' ok' : ''}`}>{i.borrador ? 'borrador creado' : 'pendiente'}</span></td>
                  </tr>))}
              </tbody>
            </table>
          </div>
          <div className="row">
            <button onClick={cargar} disabled={busy}>Actualizar</button>
            <button onClick={() => enviar('prueba')} disabled={busy || !ids.length}>Enviar prueba a mi correo</button>
            <button className={d?.puedeEnviar ? '' : 'primary'} onClick={() => enviar('borrador')} disabled={busy || !ids.length}>Crear borradores</button>
            {d?.puedeEnviar && (confirmar
              ? <><button className="primary" onClick={() => enviar('enviar')} disabled={busy}>Confirmar envío de {ids.length}</button><button onClick={() => setConfirmar(false)}>Cancelar</button></>
              : <button className="primary" onClick={() => setConfirmar(true)} disabled={busy || !ids.length}>Enviar seleccionados</button>)}
            <span className="muted">{ids.length ? `${ids.length} seleccionada(s)` : ''}</span>
          </div>
        </section>
        <section>
          <h2>Vista previa</h2>
          <div className="muted">{actual ? `Para: ${actual.email}` : 'Haz clic en una fila para ver el correo.'}</div>
          <iframe sandbox="" title="Vista previa" srcDoc={actual?.html || ''} />
          <div className="muted" style={{ marginTop: 6 }}>Adjunto: Guía de Acceso a Plataforma CMPC (Migtra).pdf</div>
        </section>
      </main>
    </>
  );
}
