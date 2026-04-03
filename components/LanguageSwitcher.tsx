"use client";

import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Globe } from 'lucide-react';

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={
        <Button variant="ghost" size="sm" className="h-10 px-4 rounded-[1.5rem] text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 bg-white/50 backdrop-blur-sm border border-white/50 shadow-sm transition-all duration-300">
          <Globe className="h-4 w-4 mr-2" />
          <span className="text-[10px] font-black uppercase tracking-widest">{language === 'en' ? 'EN' : 'ZH'}</span>
        </Button>
      } />
      <DropdownMenuContent align="end" className="border-none shadow-2xl glass-card rounded-2xl p-2 min-w-[140px]">
        <DropdownMenuItem 
          onClick={() => setLanguage('en')}
          className={`text-[10px] font-black uppercase tracking-widest py-3 px-4 cursor-pointer rounded-xl transition-colors ${language === 'en' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:bg-emerald-50 hover:text-emerald-600'}`}
        >
          English
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setLanguage('zh')}
          className={`text-[10px] font-black uppercase tracking-widest py-3 px-4 cursor-pointer rounded-xl transition-colors ${language === 'zh' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:bg-emerald-50 hover:text-emerald-600'}`}
        >
          中文 (Chinese)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
