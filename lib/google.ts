import { google } from 'googleapis';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

export type Ctx = { email: string; auth: InstanceType<typeof google.auth.OAuth2> };

export async function contexto(req: NextRequest): Promise<Ctx | null> {
  const t: any = await getToken({ req });
  if (!t?.email || t.error || (!t.accessToken && !t.refreshToken)) return null;
  // Con client id/secret y refresh_token, googleapis renueva el token vencido por su cuenta.
  const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
  auth.setCredentials({
    access_token: t.accessToken,
    refresh_token: t.refreshToken,
    expiry_date: t.expiresAt,
  });
  return { email: String(t.email).toLowerCase(), auth };
}
