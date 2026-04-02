"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { user, userData, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    if (!loading && user && userData) {
      if (userData.isActive === false) {
        auth.signOut();
        toast.error(t('account_inactive'));
        return;
      }
      if (userData.role === 'super_admin' || userData.role === 'admin') router.push('/dashboard/admin');
      else router.push('/dashboard/restaurant');
    }
  }, [user, userData, loading, router, t]);

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success('Logged in with Google successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to login with Google');
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }
    setIsSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Logged in successfully');
    } catch (error: any) {
      if (error.code === 'auth/invalid-credential') {
        try {
          await createUserWithEmailAndPassword(auth, email, password);
          toast.success('Account created and logged in successfully');
        } catch (signUpError: any) {
          if (signUpError.code === 'auth/email-already-in-use') {
            toast.error('This email is already registered. If you previously used Google Sign-In, please use the Google button below.');
          } else {
            toast.error(signUpError.message || 'Failed to create account');
          }
        }
      } else {
        toast.error(error.message || 'Invalid email or password');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center">{t('loading')}</div>;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50/50 p-6 relative font-sans overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-100/30 rounded-full blur-[120px] -z-10 animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-100/30 rounded-full blur-[120px] -z-10 animate-pulse" />
      
      <div className="absolute top-8 right-8">
        <LanguageSwitcher />
      </div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-[400px]"
      >
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">FreshMarket</h1>
          <p className="text-slate-500 text-sm">{t('sign_in_to_continue')}</p>
        </div>

        <Card className="border-slate-100 shadow-xl shadow-slate-200/50 bg-white rounded-2xl overflow-hidden">
          <CardContent className="p-8 flex flex-col gap-8">
            <form onSubmit={handleEmailLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-medium text-slate-400 uppercase tracking-wider ml-1">{t('email')}</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="restaurant@example.com" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                  className="rounded-xl border-slate-200 focus:border-slate-900 focus:ring-0 h-12 px-4 transition-all"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-medium text-slate-400 uppercase tracking-wider ml-1">{t('password')}</Label>
                <Input 
                  id="password" 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                  className="rounded-xl border-slate-200 focus:border-slate-900 focus:ring-0 h-12 px-4 transition-all"
                />
              </div>
              <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-12 font-medium transition-all" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t('login')}
              </Button>
            </form>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-100" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
                <span className="bg-white px-4 text-slate-400">Or continue with</span>
              </div>
            </div>

            <Button 
              onClick={handleGoogleLogin} 
              variant="outline" 
              className="w-full border-slate-200 hover:bg-slate-50 rounded-xl h-12 font-medium transition-all" 
              type="button"
            >
              <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              {t('sign_in_google')}
            </Button>
          </CardContent>
        </Card>
        
        <p className="text-center mt-8 text-slate-400 text-xs">
          &copy; {new Date().getFullYear()} FreshMarket. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
}
