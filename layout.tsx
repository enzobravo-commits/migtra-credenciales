import type { ReactNode } from 'react';
import './globals.css';

export const metadata = { title: 'Credenciales MIGTRA' };

export default function Layout({ children }: { children: ReactNode }) {
  return (<html lang="es"><body>{children}</body></html>);
}
