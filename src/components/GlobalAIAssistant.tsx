import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { ChatMessage, Invoice, AIPromptRequest } from '../types/invoice';
import { Sparkles, X, Send, Loader2, MessageSquare, Mic, MicOff } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { aiInvoiceService, invoiceService } from '../services/api';
import { ChatMessageComponent } from './invoice/ChatMessage';
import { toast } from 'sonner';

interface GlobalAIAssistantProps {
    onGenerateInvoiceNumber?: () => string;
    currentInvoice?: Invoice | null;
    currentScreen?: string;
    onUpdateInvoice?: (invoice: Invoice) => void;
}

export function GlobalAIAssistant({ onGenerateInvoiceNumber, currentInvoice, currentScreen, onUpdateInvoice }: GlobalAIAssistantProps) {
    const { t, language } = useLanguage();
    // ... existing state and voice logic ...
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Reset textarea height when input clears
    useEffect(() => {
        if (inputRef.current && !inputValue) {
            inputRef.current.style.height = 'auto';
        }
    }, [inputValue]);

    // Voice Input State
    const [isDictating, setIsDictating] = useState(false);
    const recognitionRef = useRef<any>(null);
    const isDictatingRef = useRef(isDictating);

    useEffect(() => { isDictatingRef.current = isDictating; }, [isDictating]);

    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            console.log('[AI] Mic started');
        };
        recognition.onend = () => {
            console.log('[AI] Mic ended');
            // Only restart if user is actively dictating
            if (isDictatingRef.current) {
                console.log('[AI] Restarting mic for active dictation...');
                setTimeout(() => {
                    try { recognition.start(); } catch (e) { console.error('[AI] Restart failed', e); }
                }, 500);
            }
        };

        recognition.onerror = (event: any) => {
            console.error('[AI] Speech error:', event.error);
            if (event.error === 'not-allowed') {
                setIsDictating(false);
                toast.error('Microphone access denied', {
                    description: 'Please allow microphone access to use voice input.',
                });
            }
        };

        recognition.onresult = (event: any) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                }
            }

            if (finalTranscript && isDictatingRef.current) {
                console.log('[AI] Heard:', finalTranscript);
                setInputValue(prev => (prev ? prev + ' ' : '') + finalTranscript);
            }
        };

        recognitionRef.current = recognition;

        return () => {
            recognition.stop();
        };
    }, []);

    const toggleDictation = () => {
        const newDictatingState = !isDictating;
        setIsDictating(newDictatingState);

        if (recognitionRef.current) {
            if (newDictatingState) {
                // Start listening when enabling dictation
                try {
                    recognitionRef.current.start();
                    toast.success('Voice input activated', {
                        description: 'Speak now to dictate your invoice request.',
                    });
                } catch (e) {
                    console.error('[AI] Failed to start recognition', e);
                }
            } else {
                // Stop listening when disabling dictation
                try {
                    recognitionRef.current.stop();
                } catch (e) {
                    console.error('[AI] Failed to stop recognition', e);
                }
            }
        }
    };

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Focus input and add welcome message when chat opens
    useEffect(() => {
        if (isOpen) {
            inputRef.current?.focus();
            if (messages.length === 0) {
                const welcomeMessage: ChatMessage = {
                    id: 'welcome',
                    role: 'assistant',
                    content: t('ai.welcomeCreate') || 'Hello! I can help you create invoices from natural language. Try saying something like:\n\n"Create invoice for ABC Pvt Ltd, Guntur, India, 522002. I sold 10 bags cement each bag 700 EUR @ 18% tax"',
                    timestamp: new Date().toISOString(),
                };
                setMessages([welcomeMessage]);
            }
        }
    }, [isOpen, t]);


    const processCommand = async (text: string) => {
        if (!text.trim() || isLoading) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: text,
            timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);

        try {
            // Determine context and existing invoice
            let context: 'create' | 'edit' = 'create';
            let targetInvoice = currentInvoice;

            // Simple keyword detection for "update" or "change"
            const updateMatch = text.match(/(?:update|change|modify|edit)\s+(?:invoice\s+)?(INV-[\w-]+)/i);
            const genericUpdate = /\b(update|change|modify|edit)\b/i.test(text);

            if (updateMatch) {
                const invoiceNumber = updateMatch[1];
                setIsLoading(true);
                try {
                    const invoices = await invoiceService.getAll({ search: invoiceNumber });
                    const found = invoices.find(inv => inv.invoiceNumber === invoiceNumber);
                    if (found) {
                        targetInvoice = await invoiceService.getById(found.id!);
                        context = 'edit';
                    }
                } catch (e) {
                    console.error('Failed to fetch invoice for update:', e);
                }
            } else if (genericUpdate || currentScreen === 'editor' || currentScreen === 'preview') {
                if (currentInvoice) {
                    context = 'edit';
                    targetInvoice = currentInvoice;
                }
            }

            // Call backend directly with raw prompt and context
            const request: AIPromptRequest = {
                prompt: userMessage.content,
                context: context,
                existingInvoice: targetInvoice || undefined,
                language: language
            };

            const response = await aiInvoiceService.parseInvoicePrompt(request);

            let assistantContent = '';
            if (response.success && response.invoice) {
                assistantContent = t('ai.parsedSuccessfully') || "I've parsed your request! Here's the invoice:";

                if (response.suggestions && response.suggestions.length > 0) {
                    assistantContent += '\n\n' + (t('ai.suggestions') || 'Suggestions:') + '\n';
                    assistantContent += response.suggestions.map(s => `• ${s}`).join('\n');
                }
            } else {
                assistantContent = t('ai.parseFailed') || "I couldn't fully understand your request.";

                if (response.errors && response.errors.length > 0) {
                    assistantContent += '\n\n' + (t('ai.errors') || 'Issues:') + '\n';
                    assistantContent += response.errors.map(e => `• ${e}`).join('\n');
                }

                if (response.suggestions && response.suggestions.length > 0) {
                    assistantContent += '\n\n' + (t('ai.suggestions') || 'Suggestions:') + '\n';
                    assistantContent += response.suggestions.map(s => `• ${s}`).join('\n');
                }
            }

            const assistantMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: assistantContent,
                timestamp: new Date().toISOString(),
                invoiceData: response.invoice,
            };

            setMessages((prev) => [...prev, assistantMessage]);

            if (response.success && response.confidence && response.confidence < 70) {
                toast.warning(t('ai.lowConfidence') || 'Low confidence parsing', {
                    description: t('ai.lowConfidenceDesc') || 'Please review the invoice carefully before using it.',
                });
            }
        } catch (error) {
            console.error('AI parsing error:', error);
            const errorMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: t('ai.error') || 'Sorry, I encountered an error processing your request. Please try again.',
                timestamp: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, errorMessage]);
            toast.error(t('common.error'), {
                description: t('ai.errorDesc') || 'Failed to parse invoice prompt',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        processCommand(inputValue);
    };

    const handleUseInvoice = (invoiceData: Invoice) => {
        // If we are in edit mode or have an update function, use it
        if (onUpdateInvoice && (currentScreen === 'editor' || currentScreen === 'preview')) {
            const updatedData = { ...invoiceData };
            // Preserve ID if it exists in currentInvoice but is missing in the AI response
            if (!updatedData.id && currentInvoice?.id) {
                updatedData.id = currentInvoice.id;
            }
            onUpdateInvoice(updatedData);
            setIsOpen(false);
            setIsDictating(false);
            toast.success(t('ai.invoiceUpdated') || 'Invoice updated!');
            return;
        }

        // Otherwise, prepare new invoice with clean ID and number (CREATE mode)
        const newInvoice = { ...invoiceData };

        // If it's a completely new one, ensure it has a proper temporary ID
        if (!newInvoice.id || !newInvoice.id.includes('_')) {
            newInvoice.id = `new_${Date.now()}`;
            newInvoice.status = 'draft';
            newInvoice.issueDate = new Date().toISOString().split('T')[0];

            // Generate new invoice number if function provided
            if (onGenerateInvoiceNumber) {
                newInvoice.invoiceNumber = onGenerateInvoiceNumber();
            }
        }

        // Navigate to invoice preview with the generated invoice
        const invoiceDataStr = encodeURIComponent(JSON.stringify(newInvoice));
        window.location.hash = `#preview?data=${invoiceDataStr}`;
        setIsOpen(false);
        setIsDictating(false);
        toast.success(t('ai.invoiceApplied') || 'Invoice data applied!');
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                style={{
                    position: 'fixed',
                    bottom: '100px',
                    right: '24px',
                    width: '56px',
                    height: '56px',
                    borderRadius: '9999px',
                    background: 'linear-gradient(to bottom right, #9333ea, #7e22ce)',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 40,
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
                    e.currentTarget.style.background = 'linear-gradient(to bottom right, #7e22ce, #6b21a8)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
                    e.currentTarget.style.background = 'linear-gradient(to bottom right, #9333ea, #7e22ce)';
                }}
                title={t('ai.assistant') || 'AI Invoice Assistant'}
                aria-label={t('ai.assistant') || 'AI Invoice Assistant'}
            >
                <Sparkles
                    style={{
                        width: '24px',
                        height: '24px',
                        color: 'white',
                        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                    }}
                />
                <style>{`
                    @keyframes pulse {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.5; }
                    }
                `}</style>
            </button>
        );
    }

    return (
        <div
            style={{
                position: 'fixed',
                bottom: '24px',
                right: '24px',
                width: 'min(420px, calc(100vw - 3rem))',
                height: 'min(650px, calc(100vh - 6rem))',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                borderRadius: '16px',
                overflow: 'hidden',
                zIndex: 50,
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: 'white',
                border: '2px solid #e9d5ff',
            }}
        >
            {/* Header */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px',
                    background: 'linear-gradient(to right, #9333ea, #7e22ce)',
                    color: 'white',
                    flexShrink: 0,
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles style={{ width: '20px', height: '20px' }} />
                    <h3 style={{ fontWeight: 600, margin: 0, fontSize: '16px' }}>
                        {t('ai.assistant') || 'AI Invoice Assistant'}
                    </h3>
                </div>
                <button
                    onClick={() => {
                        setIsOpen(false);
                        setIsDictating(false);
                    }}
                    style={{
                        background: 'rgba(255, 255, 255, 0.2)',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                    aria-label="Close AI Assistant"
                >
                    <X style={{ width: '20px', height: '20px', color: 'white' }} />
                </button>
            </div>

            {/* Chat Messages */}
            <div
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '16px',
                    background: 'linear-gradient(to bottom, rgba(243, 232, 255, 0.3), transparent)',
                }}
            >
                {messages.length === 0 ? (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        textAlign: 'center',
                        color: '#6b7280',
                    }}>
                        <MessageSquare style={{ width: '48px', height: '48px', marginBottom: '16px', opacity: 0.5 }} />
                        <p style={{ fontSize: '14px', margin: 0 }}>{t('ai.noMessages') || 'No messages yet'}</p>
                        <p style={{ fontSize: '12px', marginTop: '8px' }}>
                            {t('ai.startConversation') || 'Start a conversation to create or edit invoices'}
                        </p>
                    </div>
                ) : (
                    <>
                        {messages.map((message) => (
                            <ChatMessageComponent
                                key={message.id}
                                message={message}
                                onUseInvoice={message.invoiceData ? handleUseInvoice : undefined}
                            />
                        ))}
                        {isLoading && (
                            <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '16px' }}>
                                <div style={{
                                    backgroundColor: 'white',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '16px',
                                    padding: '12px 16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                }}>
                                    <Loader2 style={{ width: '16px', height: '16px', color: '#9333ea', animation: 'spin 1s linear infinite' }} />
                                    <span style={{ fontSize: '14px', color: '#6b7280' }}>
                                        {t('ai.thinking') || 'Thinking...'}
                                    </span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Input Form */}
            <form
                onSubmit={handleSubmit}
                style={{
                    padding: '16px',
                    borderTop: '1px solid #e5e7eb',
                    backgroundColor: 'white',
                    flexShrink: 0,
                }}
            >
                <div style={{ display: 'flex', gap: '8px' }}>
                    <textarea
                        ref={inputRef}
                        value={inputValue}
                        onChange={(e) => {
                            setInputValue(e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = `${e.target.scrollHeight}px`;
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmit(e);
                            }
                        }}
                        placeholder={t('ai.typeMessage') || 'Type your invoice request...'}
                        disabled={isLoading}
                        rows={1}
                        style={{
                            flex: 1,
                            padding: '8px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            fontSize: '14px',
                            outline: 'none',
                            resize: 'none',
                            minHeight: '38px',
                            overflowY: 'hidden',
                            fontFamily: 'inherit'
                        }}
                    />
                    <button
                        type="button"
                        onClick={toggleDictation}
                        style={{
                            padding: '8px',
                            backgroundColor: isDictating ? '#fee2e2' : 'transparent',
                            color: isDictating ? '#ef4444' : '#6b7280',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                        title={isDictating ? "Stop Voice Input" : "Start Voice Input"}
                    >
                        {isDictating ? (
                            <MicOff style={{ width: '16px', height: '16px' }} />
                        ) : (
                            <Mic style={{ width: '16px', height: '16px' }} />
                        )}
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading || !inputValue.trim()}
                        style={{
                            padding: '8px 12px',
                            backgroundColor: isLoading || !inputValue.trim() ? '#d1d5db' : '#9333ea',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: isLoading || !inputValue.trim() ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        {isLoading ? (
                            <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                        ) : (
                            <Send style={{ width: '16px', height: '16px' }} />
                        )}
                    </button>
                </div>
                <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px', marginBottom: 0 }}>
                    {t('ai.hint') || 'Describe your invoice in natural language'}
                </p>
            </form>

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
