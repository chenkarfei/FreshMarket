"use client";

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading || !user) return <div className="flex h-screen items-center justify-center">Loading...</div>;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="sticky top-0 z-10 border-b bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-slate-900">PasarHub</h1>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 capitalize">
              {userData?.role.replace('_', ' ')}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">{userData?.name}</span>
            <Button variant="ghost" size="icon" onClick={() => auth.signOut()}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 p-6">
        {children}
      </main>
    </div>
  );
}
