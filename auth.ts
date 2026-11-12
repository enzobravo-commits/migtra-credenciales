import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { permitidos } from './config';

const SCOPES = [
  'openid', 'email', 'profile',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.readonly',
].join(' ');

async function refrescar(token: any) {
  try {
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: 'refresh_token', refresh_token: token.refreshToken,
      }),
    });
    const d = await r.json();
    if (!r.ok) throw d;
    return { ...token, accessToken: d.access_token, expiresAt: Date.now() + d.expires_in * 1000, error: undefined };
  } catch {
    return { ...token, error: 'refresh' };
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: { params: { scope: SCOPES, access_type: 'offline', prompt: 'consent', hd: 'migtra.com' } },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async signIn({ profile }) {
      const email = (profile?.email || '').toLowerCase();
      return email.endsWith('@migtra.com') && permitidos().includes(email);
    },
    async jwt({ token, account }) {
      if (account) {
        return { ...token, accessToken: account.access_token, refreshToken: account.refresh_token,
          expiresAt: Date.now() + ((account.expires_in as number) || 3600) * 1000 };
      }
      if (Date.now() < ((token as any).expiresAt || 0) - 60_000) return token;
      return (token as any).refreshToken ? refrescar(token) : token;
    },
    async session({ session, token }) {
      (session as any).error = (token as any).error;
      return session;
    },
  },
  pages: { signIn: '/', error: '/' },
};
