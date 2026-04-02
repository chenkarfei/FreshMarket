import type {Metadata} from 'next';
import './globals.css';
import { Inter, Space_Grotesk } from "next/font/google";
import { cn } from "@/lib/utils";
import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-heading' });

export const metadata: Metadata = {
  title: 'FreshMarket: Restaurant Supply Chain',
  description: 'B2B daily market procurement system for restaurants in Malaysia.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={cn("font-sans", inter.variable, spaceGrotesk.variable)}>
      <body suppressHydrationWarning className="bg-slate-50 text-slate-900 antialiased">
        <AuthProvider>
          <LanguageProvider>
            {children}
            <Toaster />
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
