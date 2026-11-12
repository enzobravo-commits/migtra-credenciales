import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Panel from '@/components/Panel';
import Login from '@/components/Login';

export default async function Home({ searchParams }: { searchParams: { error?: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || (session as any).error) return <Login denegado={!!searchParams.error} />;
  return <Panel yo={session.user.email} />;
}
