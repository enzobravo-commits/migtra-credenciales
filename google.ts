import { google } from 'googleapis';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

export type Ctx = { email: string; auth: InstanceType<typeof google.auth.OAuth2> };

export async function contexto(req: NextRequest): Promise<Ctx | null> {
  const t: any = await getToken({ req });
  if (!t?.accessToken || t.error || !t.email) return null;
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: t.accessToken });
  return { email: String(t.email).toLowerCase(), auth };
}
