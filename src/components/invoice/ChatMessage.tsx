import { ChatMessage } from '../../types/invoice';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { CheckCircle, AlertCircle, FileText, Mail, User, AlignLeft } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface ChatMessageProps {
    message: ChatMessage;
    onUseInvoice?: (invoiceData: any) => void;
    onDiscard?: () => void;
}

export function ChatMessageComponent({ message, onUseInvoice, onDiscard }: ChatMessageProps) {
    const { t } = useLanguage();
    const isUser = message.role === 'user';
    const isLetter = message.invoiceData?.templateType === 'business_letter';

    const stripHtml = (html: string) =>
        html.replace(/<[^>]*>/g, ' ').replace(/\s{2,}/g, ' ').trim();

    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
            <div className={`max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`}>
                {/* Message Bubble */}
                <div
                    className={`rounded-2xl px-4 py-3 ${isUser
                            ? 'bg-gradient-to-br from-[#f08a3c] to-[#1e3a5f] text-white'
                            : 'bg-card border border-border'
                        }`}
                >
                    <p className="text-body whitespace-pre-wrap">{message.content}</p>
                    <p className={`text-micro mt-1 ${isUser ? 'text-[rgba(255,255,255,0.8)]' : 'text-muted-foreground'}`}>
                        {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                </div>

                {/* Preview Card */}
                {!isUser && message.invoiceData && (
                    <Card className="mt-3 p-4 space-y-3">
                        {isLetter ? (
                            /* ── Business Letter Preview ── */
                            <>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Mail className="h-5 w-5 text-[#2a8fbd]" />
                                        <h4 className="font-medium">{t('ai.letterPreview') || 'Letter Preview'}</h4>
                                    </div>
                                    {message.invoiceData.body && message.invoiceData.buyer?.name ? (
                                        <Badge variant="outline" className="gap-1">
                                            <CheckCircle className="h-3 w-3 text-green-600" />
                                            {t('ai.parsed') || 'Ready'}
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="gap-1">
                                            <AlertCircle className="h-3 w-3 text-yellow-600" />
                                            {t('ai.incomplete') || 'Incomplete'}
                                        </Badge>
                                    )}
                                </div>

                                <div className="space-y-2 text-body">
                                    {/* Recipient */}
                                    {message.invoiceData.buyer?.name && (
                                        <div className="flex items-start gap-2">
                                            <User className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                                            <div className="flex justify-between flex-1">
                                                <span className="text-muted-foreground">{t('editor.recipient') || 'Recipient'}:</span>
                                                <span className="font-medium text-right">{message.invoiceData.buyer.name}</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Salutation */}
                                    {message.invoiceData.salutation && (
                                        <div className="px-3 py-1.5 bg-[#f0f6ff] dark:bg-[#1e3a5f]/20 rounded text-micro italic text-[#1e3a5f] dark:text-[rgba(255,255,255,0.8)]">
                                            {message.invoiceData.salutation}
                                        </div>
                                    )}

                                    {/* Body preview */}
                                    {message.invoiceData.body && (
                                        <div className="flex items-start gap-2">
                                            <AlignLeft className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                                            <p className="text-muted-foreground text-micro leading-relaxed line-clamp-3">
                                                {stripHtml(message.invoiceData.body).slice(0, 180)}
                                                {stripHtml(message.invoiceData.body).length > 180 ? '…' : ''}
                                            </p>
                                        </div>
                                    )}

                                    {/* Closing */}
                                    {message.invoiceData.closing && (
                                        <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800/50 rounded text-micro italic text-gray-600 dark:text-gray-400">
                                            {message.invoiceData.closing}
                                        </div>
                                    )}
                                </div>

                                {onUseInvoice && (
                                    <div className="flex gap-2 pt-2 border-t">
                                        <Button
                                            onClick={() => onUseInvoice(message.invoiceData)}
                                            className="flex-1 bg-gradient-to-r from-[#1e3a5f] to-[#f08a3c]"
                                            size="sm"
                                        >
                                            <Mail className="h-3.5 w-3.5 mr-1.5" />
                                            {t('ai.useThisLetter') || 'Use This Letter'}
                                        </Button>
                                        {onDiscard && (
                                            <Button onClick={onDiscard} variant="outline" size="sm">
                                                {t('common.discard') || 'Discard'}
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </>
                        ) : (
                            /* ── Invoice Preview ── */
                            <>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <FileText className="h-5 w-5 text-[#2a8fbd]" />
                                        <h4 className="font-medium">{t('ai.invoicePreview') || 'Invoice Preview'}</h4>
                                    </div>
                                    {message.invoiceData.lines && message.invoiceData.lines.length > 0 ? (
                                        <Badge variant="outline" className="gap-1">
                                            <CheckCircle className="h-3 w-3 text-green-600" />
                                            {t('ai.parsed') || 'Parsed'}
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="gap-1">
                                            <AlertCircle className="h-3 w-3 text-yellow-600" />
                                            {t('ai.incomplete') || 'Incomplete'}
                                        </Badge>
                                    )}
                                </div>

                                <div className="space-y-2 text-body">
                                    {message.invoiceData.buyer?.name && (
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">{t('editor.buyer')}:</span>
                                            <span className="font-medium">{message.invoiceData.buyer.name}</span>
                                        </div>
                                    )}
                                    {message.invoiceData.lines && message.invoiceData.lines.length > 0 && (
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">{t('editor.lineItems')}:</span>
                                            <span className="font-medium">{message.invoiceData.lines.length} items</span>
                                        </div>
                                    )}
                                    {message.invoiceData.payableAmount !== undefined && (
                                        <div className="flex justify-between border-t pt-2">
                                            <span className="text-muted-foreground">{t('editor.total')}:</span>
                                            <span className="font-medium text-heading-3">
                                                {message.invoiceData.currency} {message.invoiceData.payableAmount.toFixed(2)}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {onUseInvoice && (
                                    <div className="flex gap-2 pt-2 border-t">
                                        <Button
                                            onClick={() => onUseInvoice(message.invoiceData)}
                                            className="flex-1"
                                            size="sm"
                                        >
                                            {t('ai.useThisInvoice') || 'Use This Invoice'}
                                        </Button>
                                        {onDiscard && (
                                            <Button onClick={onDiscard} variant="outline" size="sm">
                                                {t('common.discard') || 'Discard'}
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </Card>
                )}
            </div>
        </div>
    );
}
