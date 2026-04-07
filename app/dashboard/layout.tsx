"use client";

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { LogOut, User, Store } from 'lucide-react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useLanguage } from '@/contexts/LanguageContext';
import { Logo } from '@/components/ui/logo';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, userData, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/');
      } else if (userData && userData.isActive === false) {
        auth.signOut();
        router.push('/');
      }
    }
  }, [user, userData, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50/50">
        <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-slate-200 animate-pulse" />
              <div>
                <div className="h-5 w-32 bg-slate-200 rounded animate-pulse mb-2" />
                <div className="h-3 w-20 bg-slate-200 rounded animate-pulse" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-slate-200 animate-pulse" />
              <div className="h-8 w-8 rounded-full bg-slate-200 animate-pulse" />
            </div>
          </div>
        </header>
        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <div className="h-8 w-64 bg-slate-200 rounded animate-pulse" />
                <div className="h-10 w-32 bg-slate-200 rounded-xl animate-pulse" />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="h-32 bg-slate-200 rounded-xl animate-pulse" />
                <div className="h-32 bg-slate-200 rounded-xl animate-pulse" />
                <div className="h-32 bg-slate-200 rounded-xl animate-pulse" />
              </div>
              <div className="h-10 w-full max-w-md bg-slate-200 rounded-full animate-pulse" />
              <div className="h-96 bg-slate-200 rounded-xl animate-pulse" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="sticky top-0 z-40 w-full border-b border-slate-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Logo size={36} />
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900 font-heading">FreshMarket</h1>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {userData?.role ? t('role_' + userData.role) : ''}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 sm:gap-6">
            <LanguageSwitcher />
            
            <div className="flex items-center gap-4">
              <div className="hidden flex-col items-end sm:flex">
                <span className="text-sm font-medium text-slate-900">{userData?.name}</span>
                <span className="text-[11px] text-slate-400">{userData?.email}</span>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-50 border border-slate-100 text-slate-400">
                <User className="h-5 w-5" />
              </div>
              <Button variant="ghost" size="icon" onClick={() => auth.signOut()} className="h-9 w-9 text-slate-400 hover:text-slate-900 hover:bg-slate-50">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
