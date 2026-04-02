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
        <Button variant="ghost" size="sm" className="h-9 px-3 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all">
          <Globe className="h-4 w-4 mr-2" />
          <span className="text-xs font-medium uppercase tracking-wider">{language === 'en' ? 'EN' : 'ZH'}</span>
        </Button>
      } />
      <DropdownMenuContent align="end" className="border-slate-100 shadow-xl rounded-xl">
        <DropdownMenuItem 
          onClick={() => setLanguage('en')}
          className={`text-xs font-medium uppercase tracking-wider py-2 px-4 cursor-pointer ${language === 'en' ? 'bg-slate-50 text-slate-900' : 'text-slate-500'}`}
        >
          English
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setLanguage('zh')}
          className={`text-xs font-medium uppercase tracking-wider py-2 px-4 cursor-pointer ${language === 'zh' ? 'bg-slate-50 text-slate-900' : 'text-slate-500'}`}
        >
          中文 (Chinese)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
