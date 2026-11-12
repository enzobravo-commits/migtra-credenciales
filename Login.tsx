'use client';
import { signIn } from 'next-auth/react';

export default function Login({ denegado }: { denegado: boolean }) {
  return (
    <div className="login">
      <h1 style={{ margin: 0 }}>Credenciales MIGTRA</h1>
      <p className="muted" style={{ margin: 0 }}>Entra con tu cuenta @migtra.com para preparar y enviar los accesos a los transportistas.</p>
      {denegado && <div className="msg err">Esa cuenta no tiene acceso. Pide a Enzo que la agregue.</div>}
      <button className="primary" onClick={() => signIn('google')}>Entrar con Google</button>
    </div>
  );
}
