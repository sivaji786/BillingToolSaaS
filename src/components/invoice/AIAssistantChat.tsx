import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { ChatMessage, Invoice, AIPromptRequest } from '../../types/invoice';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { ChatMessageComponent } from './ChatMessage';
import { aiInvoiceService } from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';
import {
    Sparkles,
    X,
    Send,
    Loader2,
    ChevronDown,
    ChevronUp,
    MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';

interface AIAssistantChatProps {
    context: 'create' | 'edit';
    existingInvoice?: Invoice;
    onUseInvoice: (invoice: Invoice) => void;
    className?: string;
}

export function AIAssistantChat({
    context,
    existingInvoice,
    onUseInvoice,
    className = '',
}: AIAssistantChatProps) {
    const { t } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(true);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Focus input when chat opens
    useEffect(() => {
        if (isOpen && isExpanded) {
            inputRef.current?.focus();
        }
    }, [isOpen, isExpanded]);

    // Add welcome message on first open
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            const welcomeMessage: ChatMessage = {
                id: 'welcome',
                role: 'assistant',
                content:
                    context === 'create'
                        ? t('ai.welcomeCreate') ||
                        'Hello! I can help you create invoices from natural language. Try saying something like:\n\n"Create invoice for ABC Pvt Ltd, Guntur, India, 522002. I sold 10 bags cement each bag 700 EUR @ 18% tax"'
                        : t('ai.welcomeEdit') ||
                        'Hello! I can help you edit this invoice. Try saying something like:\n\n"Add 5 bags of sand at 500 EUR each with 12% tax"',
                timestamp: new Date().toISOString(),
            };
            setMessages([welcomeMessage]);
        }
    }, [isOpen, messages.length, context, t]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim() || isLoading) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: inputValue,
            timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);

        try {
            const request: AIPromptRequest = {
                prompt: inputValue,
                context,
                existingInvoice: context === 'edit' ? existingInvoice : undefined,
                language: (t as any).language || 'en' // Get language from context if available, fallback to 'en'
            };

            const response = await aiInvoiceService.parseInvoicePrompt(request);

            let assistantContent = '';
            if (response.success && response.invoice) {
                assistantContent = t('ai.parsedSuccessfully') || 'I\'ve parsed your request! Here\'s the invoice:';

                if (response.suggestions && response.suggestions.length > 0) {
                    assistantContent += '\n\n' + (t('ai.suggestions') || 'Suggestions:') + '\n';
                    assistantContent += response.suggestions.map(s => `• ${s}`).join('\n');
                }
            } else {
                assistantContent = t('ai.parseFailed') || 'I couldn\'t fully understand your request.';

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
                content:
                    t('ai.error') ||
                    'Sorry, I encountered an error processing your request. Please try again.',
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

    const handleUseInvoice = (invoiceData: Invoice) => {
        onUseInvoice(invoiceData);
        toast.success(t('ai.invoiceApplied') || 'Invoice data applied!');
        setIsOpen(false);
    };

    const handleClearChat = () => {
        setMessages([]);
        toast.success(t('ai.chatCleared') || 'Chat cleared');
    };

    if (!isOpen) {
        return (
            <Button
                onClick={() => setIsOpen(true)}
                className={`fixed bottom-6 right-6 rounded-full h-14 w-14 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 ${className}`}
                size="icon"
            >
                <Sparkles className="h-6 w-6 animate-pulse" />
            </Button>
        );
    }

    return (
        <Card
            className={`fixed bottom-6 right-6 w-[min(400px,calc(100vw-3rem))] max-h-[min(600px,calc(100vh-6rem))] shadow-2xl border-2 border-purple-200 overflow-hidden transition-all duration-300 z-50 ${isExpanded ? 'h-[min(600px,calc(100vh-6rem))]' : 'h-[60px]'
                } ${className}`}
        >
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    <h3 className="font-semibold">{t('ai.assistant') || 'AI Assistant'}</h3>
                    {messages.length > 1 && (
                        <Badge variant="secondary" className="bg-purple-800 text-white">
                            {messages.length - 1}
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="h-8 w-8 text-white hover:bg-purple-800"
                    >
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsOpen(false)}
                        className="h-8 w-8 text-white hover:bg-purple-800"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Chat Messages */}
            {isExpanded && (
                <>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[calc(100%-140px)] bg-gradient-to-b from-purple-50/30 to-transparent">
                        {messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                                <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
                                <p className="text-body">{t('ai.noMessages') || 'No messages yet'}</p>
                                <p className="text-micro mt-2">
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
                                        onDiscard={message.invoiceData ? handleClearChat : undefined}
                                    />
                                ))}
                                {isLoading && (
                                    <div className="flex justify-start">
                                        <div className="bg-card border border-border rounded-2xl px-4 py-3 flex items-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                                            <span className="text-body text-muted-foreground">
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
                    <form onSubmit={handleSubmit} className="p-4 border-t bg-background">
                        <div className="flex gap-2">
                            <Input
                                ref={inputRef}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder={t('ai.typeMessage') || 'Type your invoice request...'}
                                disabled={isLoading}
                                className="flex-1"
                            />
                            <Button type="submit" disabled={isLoading || !inputValue.trim()} size="icon">
                                {isLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Send className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                        <p className="text-micro text-muted-foreground mt-2">
                            {t('ai.hint') || 'Describe your invoice in natural language'}
                        </p>
                    </form>
                </>
            )}
        </Card>
    );
}
