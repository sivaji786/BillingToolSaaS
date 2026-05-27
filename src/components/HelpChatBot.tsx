import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { useDockSlot } from '../hooks/useDockSlot';
import { HelpCircle, X, Send, RotateCcw } from 'lucide-react';
import type { FaqEntry, CategoryDef, LocalizedBot } from '../data/faqTypes';
import { findBestMatch, getByCategory, getById, suggestedCategories } from '../lib/helpMatcher';
import { useLanguage } from '../contexts/LanguageContext';

// ── Types ─────────────────────────────────────────────────────────────────────

interface QuickReply { label: string; payload: string; }
interface Message { id: string; role: 'user' | 'bot'; text: string; quickReplies?: QuickReply[]; }

export interface HelpChatBotConfig {
    faq: FaqEntry[];
    categories: CategoryDef[];
    screenCategoryMap: Record<string, string>;
    botName: string;
    /** CSS gradient string for the header and send button */
    accentGradient: string;
    /** Border color for quick-reply buttons */
    accentBorder: string;
    /** Text color for quick-reply buttons */
    accentText: string;
    /** Hover background for quick-reply buttons */
    accentHover: string;
    /** User bubble color */
    userBubbleColor: string;
    /** Launcher button icon color for the dock */
    launcherIcon?: React.ReactNode;
    /** FloatingDock slot id — must be unique across all bots */
    dockId: string;
    /** FloatingDock slot order */
    dockOrder: number;
    /** Welcome message (English fallback) */
    welcomeText: string;
    /** Per-language overrides for FAQ content, categories and welcome text */
    localizedContent?: Partial<Record<string, LocalizedBot>>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
    config: HelpChatBotConfig;
    currentScreen?: string;
}

export function HelpChatBot({ config, currentScreen = '' }: Props) {
    const { language, t, isRtl } = useLanguage();

    const loc = config.localizedContent?.[language];
    const activeFaq = loc?.faq ?? config.faq;
    const activeCategories = loc?.categories ?? config.categories;
    const activeWelcomeText = loc?.welcomeText ?? config.welcomeText;

    const [isOpen, setIsOpen] = useState(false);

    function buildWelcome(): Message {
        const cats = suggestedCategories(currentScreen, activeCategories, config.screenCategoryMap);
        return {
            id: 'welcome',
            role: 'bot',
            text: activeWelcomeText,
            quickReplies: cats.map(c => ({ label: `${c.emoji} ${c.label}`, payload: `__cat__${c.id}` })),
        };
    }

    const [messages, setMessages] = useState<Message[]>(() => [buildWelcome()]);
    const [input, setInput] = useState('');
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
    useEffect(() => { if (isOpen) inputRef.current?.focus(); }, [isOpen]);

    // Rebuild welcome when screen or language changes
    useEffect(() => {
        setMessages(prev => {
            const first = prev[0];
            if (first?.id === 'welcome') {
                return [buildWelcome(), ...prev.slice(1)];
            }
            return prev;
        });
    }, [currentScreen, language]); // eslint-disable-line react-hooks/exhaustive-deps

    function push(msg: Omit<Message, 'id'>) {
        setMessages(prev => [...prev, { ...msg, id: makeId() }]);
    }

    function reset() { setMessages([buildWelcome()]); }

    function showAnswer(entry: FaqEntry) {
        const related = (entry.related ?? [])
            .map(id => getById(id, activeFaq))
            .filter((e): e is FaqEntry => Boolean(e));

        push({
            role: 'bot',
            text: entry.answer,
            quickReplies: [
                { label: t('helpBot.mainMenu'), payload: '__menu__' },
                ...related.map(r => ({ label: `➡️ ${r.question}`, payload: `__faq__${r.id}` })),
            ],
        });
    }

    function handlePayload(payload: string) {
        if (payload === '__menu__') { reset(); return; }

        if (payload.startsWith('__cat__')) {
            const catId = payload.slice('__cat__'.length);
            const cat = activeCategories.find(c => c.id === catId);
            const entries = getByCategory(catId, activeFaq);
            push({
                role: 'bot',
                text: `${cat?.emoji ?? ''} ${cat?.label ?? catId} ${t('helpBot.commonQuestionsLabel')}`,
                quickReplies: [
                    ...entries.map(e => ({ label: `❓ ${e.question}`, payload: `__faq__${e.id}` })),
                    { label: t('helpBot.mainMenu'), payload: '__menu__' },
                ],
            });
            return;
        }

        if (payload.startsWith('__faq__')) {
            const entry = getById(payload.slice('__faq__'.length), activeFaq);
            if (entry) showAnswer(entry);
            return;
        }
    }

    function handleUserInput(text: string) {
        const trimmed = text.trim();
        if (!trimmed) return;
        push({ role: 'user', text: trimmed });
        setInput('');

        const match = findBestMatch(trimmed, activeFaq);
        if (match) {
            showAnswer(match);
        } else {
            const cats = suggestedCategories(currentScreen, activeCategories, config.screenCategoryMap);
            push({
                role: 'bot',
                text: t('helpBot.noMatch'),
                quickReplies: [
                    ...cats.slice(0, 4).map(c => ({ label: `${c.emoji} ${c.label}`, payload: `__cat__${c.id}` })),
                    { label: t('helpBot.mainMenu'), payload: '__menu__' },
                ],
            });
        }
    }

    // Register in FloatingDock
    const ping = useDockSlot(config.dockId, config.dockOrder, () =>
        isOpen ? null : (
            <button
                onClick={() => setIsOpen(true)}
                style={{
                    width: 48, height: 48, borderRadius: '9999px',
                    background: config.accentGradient,
                    border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
                    transition: 'transform 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.transform = 'scale(1.08)';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.25)';
                }}
                onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 14px rgba(0,0,0,0.18)';
                }}
                title={config.botName}
                aria-label={`Open ${config.botName}`}
            >
                {config.launcherIcon ?? <HelpCircle style={{ width: 22, height: 22, color: 'white' }} />}
            </button>
        )
    );
    useEffect(() => { ping(); }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div
            role="dialog"
            aria-label={config.botName}
            dir={isRtl ? 'rtl' : 'ltr'}
            style={{
                position: 'fixed', bottom: 24, right: isRtl ? 'auto' : 24, left: isRtl ? 24 : 'auto',
                zIndex: 9999,
                width: 'min(380px, calc(100vw - 3rem))',
                height: 'min(540px, calc(100vh - 6rem))',
                background: 'white', borderRadius: 16,
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.28)',
                border: `1.5px solid ${config.accentBorder}`,
                display: 'flex', flexDirection: 'column',
                fontFamily: 'inherit',
            }}
        >
            {/* Header */}
            <div style={{
                background: config.accentGradient,
                padding: '13px 16px', borderRadius: '14px 14px 0 0',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexShrink: 0,
            }}>
                <div className="text-heading-2 font-semibold" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'white' }}>
                    <HelpCircle style={{ width: 18, height: 18 }} />
                    {config.botName}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={reset} title={t('helpBot.restart')}
                        style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 6, padding: 5, cursor: 'pointer', display: 'flex', color: 'white' }}>
                        <RotateCcw style={{ width: 15, height: 15 }} />
                    </button>
                    <button onClick={() => setIsOpen(false)} title={t('helpBot.close')}
                        style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 6, padding: 5, cursor: 'pointer', display: 'flex', color: 'white' }}>
                        <X style={{ width: 15, height: 15 }} />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {messages.map(msg => (
                    <div key={msg.id}>
                        <div style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                            <div className="text-heading-3" style={{
                                maxWidth: '84%', padding: '9px 13px', lineHeight: 1.6,
                                borderRadius: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                                background: msg.role === 'user' ? config.userBubbleColor : '#f1f5f9',
                                color:      msg.role === 'user' ? 'white' : '#1e293b',
                                borderBottomRightRadius: msg.role === 'user' ? 3 : 12,
                                borderBottomLeftRadius:  msg.role === 'user' ? 12 : 3,
                            }}>
                                {msg.text}
                            </div>
                        </div>
                        {msg.quickReplies && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8,
                                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                                {msg.quickReplies.map(qr => (
                                    <button key={qr.payload} onClick={() => handlePayload(qr.payload)}
                                        className="text-heading-3"
                                        style={{
                                            padding: '5px 11px', borderRadius: 20,
                                            background: 'white', color: config.accentText,
                                            border: `1.5px solid ${config.accentBorder}`,
                                            cursor: 'pointer', transition: 'background 0.12s', lineHeight: 1.4,
                                        }}
                                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = config.accentHover; }}
                                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'white'; }}
                                    >
                                        {qr.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form onSubmit={e => { e.preventDefault(); handleUserInput(input); }}
                style={{ padding: '10px 14px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 8, flexShrink: 0 }}>
                <input
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder={t('helpBot.placeholder')}
                    className="text-heading-3"
                    style={{
                        flex: 1, padding: '8px 12px',
                        border: '1.5px solid #e2e8f0', borderRadius: 8, outline: 'none',
                        transition: 'border-color 0.15s',
                        textAlign: isRtl ? 'right' : 'left',
                    }}
                    onFocus={e => { (e.target as HTMLInputElement).style.borderColor = config.accentBorder; }}
                    onBlur={e => { (e.target as HTMLInputElement).style.borderColor = '#e2e8f0'; }}
                />
                <button type="submit" disabled={!input.trim()}
                    style={{
                        padding: '8px 13px', borderRadius: 8, border: 'none', cursor: 'pointer',
                        background: input.trim() ? config.accentGradient : '#e2e8f0',
                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'background 0.15s', flexShrink: 0,
                    }}
                    aria-label={t('helpBot.sendAria')}
                >
                    <Send style={{ width: 16, height: 16 }} />
                </button>
            </form>
        </div>
    );
}
