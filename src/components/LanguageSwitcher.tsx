import { useLanguage } from '../contexts/LanguageContext';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Languages, Check } from 'lucide-react';

interface LanguageSwitcherProps {
  variant?: 'default' | 'login';
}

export function LanguageSwitcher({ variant = 'default' }: LanguageSwitcherProps) {
  const { language, setLanguage } = useLanguage();

  const languages = [
    { code: 'en' as const, label: 'English', flag: '🇬🇧' },
    { code: 'de' as const, label: 'Deutsch', flag: '🇩🇪' },
    { code: 'ar' as const, label: 'العربية', flag: '🇸🇦' },
  ];

  const currentLanguage = languages.find((lang) => lang.code === language);

  const buttonClassName = variant === 'login'
    ? 'bg-white/90 text-purple-700 border-purple-200 hover:bg-white hover:border-purple-300'
    : 'bg-white/10 text-white border-white/20 hover:bg-white/20 hover:text-white backdrop-blur-sm';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={buttonClassName}
        >
          <Languages className="h-4 w-4 mr-2" />
          <span className="mr-1">{currentLanguage?.flag}</span>
          {currentLanguage?.code.toUpperCase()}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px]">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className="cursor-pointer"
          >
            <span className="mr-2">{lang.flag}</span>
            <span className="flex-1">{lang.label}</span>
            {language === lang.code && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
