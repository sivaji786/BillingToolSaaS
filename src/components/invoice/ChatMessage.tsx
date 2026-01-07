import { ChatMessage } from '../../types/invoice';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface ChatMessageProps {
    message: ChatMessage;
    onUseInvoice?: (invoiceData: any) => void;
    onDiscard?: () => void;
}

export function ChatMessageComponent({ message, onUseInvoice, onDiscard }: ChatMessageProps) {
    const { t } = useLanguage();
    const isUser = message.role === 'user';

    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
            <div className={`max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`}>
                {/* Message Bubble */}
                <div
                    className={`rounded-2xl px-4 py-3 ${isUser
                            ? 'bg-gradient-to-br from-purple-600 to-purple-700 text-white'
                            : 'bg-card border border-border'
                        }`}
                >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p className={`text-xs mt-1 ${isUser ? 'text-purple-200' : 'text-muted-foreground'}`}>
                        {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                </div>

                {/* Invoice Preview Card */}
                {!isUser && message.invoiceData && (
                    <Card className="mt-3 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-purple-600" />
                                <h4 className="font-semibold">{t('ai.invoicePreview') || 'Invoice Preview'}</h4>
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

                        {/* Invoice Summary */}
                        <div className="space-y-2 text-sm">
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
                                    <span className="font-bold text-lg">
                                        {message.invoiceData.currency} {message.invoiceData.payableAmount.toFixed(2)}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
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
                    </Card>
                )}
            </div>
        </div>
    );
}
