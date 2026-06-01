import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { aiService } from '../../../services/workhubApi';
import { Button } from '../../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Badge } from '../../ui/badge';
import { Skeleton } from '../../ui/skeleton';
import { Languages, RotateCcw } from 'lucide-react';
import { cn } from '../../../lib/utils';

const LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'de', label: 'Deutsch' },
    { code: 'pl', label: 'Polski' },
    { code: 'fr', label: 'Français' },
    { code: 'it', label: 'Italiano' },
];

interface TranslationToggleProps {
    text: string;
    defaultLanguage?: string;
    className?: string;
}

export function TranslationToggle({ text, defaultLanguage = 'en', className }: TranslationToggleProps) {
    const [targetLang, setTargetLang] = useState(defaultLanguage);
    const [showOriginal, setShowOriginal] = useState(false);
    const [enabled, setEnabled] = useState(false);

    const isSourceLang = targetLang === 'en';

    const { data: translation, isLoading } = useQuery({
        queryKey: ['wh-translation', text.slice(0, 80), targetLang],
        queryFn: () => aiService.translate(text, targetLang),
        enabled: enabled && !isSourceLang,
        staleTime: 7 * 24 * 60 * 60 * 1000,
    });

    const displayText = showOriginal || !enabled || isSourceLang
        ? text
        : (translation?.translated ?? text);

    const handleLangChange = (lang: string) => {
        setTargetLang(lang);
        setEnabled(true);
        setShowOriginal(false);
    };

    const isTranslated = !showOriginal && enabled && !isSourceLang && !!translation?.translated;

    return (
        <div className={cn('space-y-2', className)}>
            {/* Language selector row */}
            <div className="flex items-center gap-2 flex-wrap">
                <Languages className="h-3.5 w-3.5 text-purple-500 flex-shrink-0" />
                <Select value={targetLang} onValueChange={handleLangChange}>
                    <SelectTrigger className="h-7 w-36 text-caption">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {LANGUAGES.map((l) => (
                            <SelectItem key={l.code} value={l.code} className="text-caption">
                                {l.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {isTranslated && (
                    <>
                        <Badge className="bg-purple-100 text-purple-700 text-caption px-1.5">
                            {translation?.from_cache ? 'cached' : 'translated'}
                        </Badge>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-caption"
                            onClick={() => setShowOriginal((prev) => !prev)}
                        >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            {showOriginal ? 'Show translation' : 'Show original'}
                        </Button>
                    </>
                )}
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="space-y-1.5">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-4/5" />
                    <Skeleton className="h-4 w-3/5" />
                </div>
            ) : (
                <div className={cn(
                    'text-body leading-relaxed whitespace-pre-wrap',
                    showOriginal && 'text-muted-foreground italic'
                )}>
                    {displayText}
                    {showOriginal && (
                        <span className="ml-2 text-caption text-muted-foreground">(original)</span>
                    )}
                </div>
            )}
        </div>
    );
}
