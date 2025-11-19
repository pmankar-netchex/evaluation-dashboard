import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const handleSignOut = async () => {
    'use server';
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect('/auth/login');
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <nav className="bg-white shadow-sm border-b border-[#e0e0e0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-[22px] font-medium leading-[28px] text-[#212121]">
                Chatbot Evaluator
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="text-sm font-normal leading-5 text-[#212121] hover:text-[#1976d2] transition-colors"
              >
                Evaluator
              </Link>
              <Link
                href="/chat"
                className="text-sm font-normal leading-5 text-[#212121] hover:text-[#1976d2] transition-colors"
              >
                Chat
              </Link>
              <Link
                href="/analytics"
                className="text-sm font-normal leading-5 text-[#212121] hover:text-[#1976d2] transition-colors"
              >
                Analytics
              </Link>
              <Link
                href="/logs"
                className="text-sm font-normal leading-5 text-[#212121] hover:text-[#1976d2] transition-colors"
              >
                Logs
              </Link>
              <span className="text-sm font-normal leading-5 text-[#757575]">{user.email}</span>
              <form action={handleSignOut}>
                <button
                  type="submit"
                  className="text-sm font-normal leading-5 text-[#212121] hover:text-[#1976d2] transition-colors"
                >
                  Logout
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}

