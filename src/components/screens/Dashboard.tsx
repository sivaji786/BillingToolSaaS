import { Invoice } from '../../types/invoice';
import { useLanguage } from '../../contexts/LanguageContext';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Label } from '../ui/label';
import {
  Plus,
  FileText,
  Clock,
  CheckCircle,
  Upload,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/invoice-calculations';
import { isInvoiceValid } from '../../utils/invoice-validation';
import { importInvoices } from '../../utils/invoice-import';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';

interface DashboardProps {
  invoices: Invoice[];
  onNewInvoice: () => void;
  onOpenInvoice: (invoice: Invoice) => void;
  onImportInvoices?: (invoices: Invoice[]) => void;
  onUpdateInvoice?: (invoice: Invoice) => void;
}

export function Dashboard({ invoices, onNewInvoice, onOpenInvoice, onImportInvoices, onUpdateInvoice }: DashboardProps) {
  const { t } = useLanguage();
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  // Calculate comprehensive statistics
  const stats = useMemo(() => {
    const paidInvoices = invoices.filter((inv) => inv.status === 'paid');
    const pendingInvoices = invoices.filter((inv) => inv.status === 'sent' || inv.status === 'validated');
    const draftInvoices = invoices.filter((inv) => inv.status === 'draft');
    const overdueInvoices = invoices.filter((inv) => {
      if (inv.status === 'paid' || !inv.dueDate) return false;
      return new Date(inv.dueDate) < new Date();
    });

    return {
      total: invoices.length,
      draft: draftInvoices.length,
      sent: invoices.filter((inv) => inv.status === 'sent').length,
      paid: paidInvoices.length,
      totalValue: invoices.reduce((sum, inv) => sum + inv.payableAmount, 0),
      paidRevenue: paidInvoices.reduce((sum, inv) => sum + inv.payableAmount, 0),
      pendingRevenue: pendingInvoices.reduce((sum, inv) => sum + inv.payableAmount, 0),
      draftValue: draftInvoices.reduce((sum, inv) => sum + inv.payableAmount, 0),
      overdueValue: overdueInvoices.reduce((sum, inv) => sum + inv.payableAmount, 0),
      overdueCount: overdueInvoices.length,
    };
  }, [invoices]);

  // Prepare chart data
  const statusChartData = useMemo(() => [
    { name: t('status.draft'), value: stats.draft, color: '#c026d3' },
    { name: t('status.sent'), value: stats.sent, color: '#06b6d4' },
    { name: t('status.paid'), value: stats.paid, color: '#10b981' },
  ].filter(item => item.value > 0), [stats, t]);

  const revenueChartData = useMemo(() => [
    { name: t('dashboard.paidRevenue'), amount: stats.paidRevenue },
    { name: t('dashboard.pendingRevenue'), amount: stats.pendingRevenue },
    { name: t('dashboard.draftValue'), amount: stats.draftValue },
  ], [stats, t]);

  // Monthly trend data (last 6 months)
  const monthlyTrendData = useMemo(() => {
    const months: { [key: string]: { paid: number; pending: number; draft: number } } = {};
    const now = new Date();

    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toLocaleDateString('en', { month: 'short' });
      months[monthKey] = { paid: 0, pending: 0, draft: 0 };
    }

    // Aggregate invoices by month
    invoices.forEach(inv => {
      const date = new Date(inv.issueDate);
      const monthKey = date.toLocaleDateString('en', { month: 'short' });
      if (months[monthKey]) {
        if (inv.status === 'paid') months[monthKey].paid += inv.payableAmount;
        else if (inv.status === 'sent' || inv.status === 'validated') months[monthKey].pending += inv.payableAmount;
        else months[monthKey].draft += inv.payableAmount;
      }
    });

    return Object.entries(months).map(([name, data]) => ({
      name,
      [t('status.paid')]: data.paid,
      [t('dashboard.pending')]: data.pending,
      [t('status.draft')]: data.draft,
    }));
  }, [invoices, t]);

  const recentInvoices = invoices.slice(0, 10);

  // Handle import
  const handleImport = async () => {
    if (!selectedFile) {
      toast.error(t('common.error'), {
        description: t('import.selectFile'),
      });
      return;
    }

    setIsImporting(true);
    try {
      const importedInvoices = await importInvoices(selectedFile);

      if (onImportInvoices) {
        onImportInvoices(importedInvoices.invoices);
      }

      toast.success(t('import.success'), {
        description: t('import.successDesc', { count: String(importedInvoices.invoices.length) }),
      });

      setShowImportDialog(false);
      setSelectedFile(null);
    } catch (error) {
      toast.error(t('import.error'), {
        description: error instanceof Error ? error.message : t('import.errorDesc'),
      });
    } finally {
      setIsImporting(false);
    }
  };

  // Handle batch validation
  const handleValidateBatch = async () => {
    const draftInvoices = invoices.filter(inv => inv.status === 'draft');

    if (draftInvoices.length === 0) {
      toast.info(t('validation.noDrafts'), {
        description: t('validation.noDraftsDesc'),
      });
      return;
    }

    setIsValidating(true);
    let validatedCount = 0;
    let errorCount = 0;

    try {
      for (const invoice of draftInvoices) {
        const isValid = isInvoiceValid(invoice);

        if (isValid) {
          const updatedInvoice = { ...invoice, status: 'validated' as const };
          if (onUpdateInvoice) {
            onUpdateInvoice(updatedInvoice);
          }
          validatedCount++;
        } else {
          errorCount++;
        }
      }

      if (validatedCount > 0) {
        toast.success(t('validation.batchSuccess'), {
          description: t('validation.batchSuccessDesc', {
            count: String(validatedCount),
            errors: String(errorCount),
          }),
        });
      } else {
        toast.error(t('validation.batchError'), {
          description: t('validation.batchErrorDesc'),
        });
      }
    } finally {
      setIsValidating(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    const config: Record<string, { variant: any; statusKey: string }> = {
      draft: { variant: 'secondary', statusKey: 'status.draft' },
      validated: { variant: 'default', statusKey: 'status.validated' },
      sent: { variant: 'default', statusKey: 'status.sent' },
      paid: { variant: 'default', statusKey: 'status.paid' },
      cancelled: { variant: 'destructive', statusKey: 'status.cancelled' },
    };
    const { variant, statusKey } = config[status || 'draft'] || config.draft;
    return <Badge variant={variant}>{t(statusKey)}</Badge>;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1>{t('dashboard.title')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('dashboard.subtitle')}
          </p>
        </div>
        <Button
          onClick={onNewInvoice}
          size="lg"
          className="bg-gradient-to-r from-[#1e3a5f] via-[#2a8fbd] to-[#3d5a80] hover:from-[#e07530] hover:via-[#f08a3c] hover:to-[#e07530] text-white shadow-lg shadow-[rgba(30,58,95,0.15)]"
        >
          <Plus className="h-5 w-5 mr-2" />
          {t('dashboard.newInvoice')}
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card
          className="p-6 border-2 bg-gradient-to-br from-[#f0f6ff] to-[#f0f6ff] border-[rgba(30,58,95,0.15)] shadow-md cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all"
          onClick={() => window.location.hash = 'invoices'}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-body text-[#1e3a5f]">{t('dashboard.totalInvoices')}</p>
              <p className="text-heading-1 mt-2 bg-gradient-to-r from-[#1e3a5f] to-[#f08a3c] bg-clip-text text-transparent">{stats.total}</p>
            </div>
            <div className="p-3 bg-[#f0f6ff] rounded-xl">
              <FileText className="h-8 w-8 text-[#2a8fbd]" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-2 bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-body text-emerald-700">{t('dashboard.paidRevenue')}</p>
              <p className="text-heading-1 mt-2 bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                €{(stats.paidRevenue / 1000).toFixed(1)}k
              </p>
              <p className="text-micro text-emerald-600 mt-1">{stats.paid} {t('dashboard.invoices')}</p>
            </div>
            <div className="p-3 bg-emerald-100 rounded-xl">
              <DollarSign className="h-8 w-8 text-emerald-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-2 bg-gradient-to-br from-cyan-50 to-blue-50 border-cyan-200 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-body text-cyan-700">{t('dashboard.pendingRevenue')}</p>
              <p className="text-heading-1 mt-2 bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                €{(stats.pendingRevenue / 1000).toFixed(1)}k
              </p>
              <p className="text-micro text-cyan-600 mt-1">{stats.sent} {t('dashboard.invoices')}</p>
            </div>
            <div className="p-3 bg-cyan-100 rounded-xl">
              <Clock className="h-8 w-8 text-cyan-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-2 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-body text-amber-700">{t('dashboard.overdue')}</p>
              <p className="text-heading-1 mt-2 bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                €{(stats.overdueValue / 1000).toFixed(1)}k
              </p>
              <p className="text-micro text-amber-600 mt-1">{stats.overdueCount} {t('dashboard.invoices')}</p>
            </div>
            <div className="p-3 bg-amber-100 rounded-xl">
              <AlertTriangle className="h-8 w-8 text-amber-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Breakdown */}
        <Card className="p-6 border-2 shadow-md">
          <h2 className="mb-6">{t('dashboard.revenueBreakdown')}</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '2px solid #8b5cf6',
                  borderRadius: '0.75rem',
                }}
                formatter={(value: number) => formatCurrency(value, 'EUR')}
              />
              <Bar dataKey="amount" fill="url(#colorGradient)" radius={[8, 8, 0, 0]} />
              <defs>
                <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#c026d3" stopOpacity={0.8} />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Status Distribution */}
        <Card className="p-6 border-2 shadow-md">
          <h2 className="mb-6">{t('dashboard.statusDistribution')}</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {statusChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Monthly Trend */}
        <Card className="p-6 border-2 shadow-md lg:col-span-2">
          <h2 className="mb-6">{t('dashboard.monthlyTrend')}</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '2px solid #8b5cf6',
                  borderRadius: '0.75rem',
                }}
                formatter={(value: number) => formatCurrency(value, 'EUR')}
              />
              <Legend />
              <Line type="monotone" dataKey={t('status.paid')} stroke="#10b981" strokeWidth={3} dot={{ r: 5 }} />
              <Line type="monotone" dataKey={t('dashboard.pending')} stroke="#06b6d4" strokeWidth={3} dot={{ r: 5 }} />
              <Line type="monotone" dataKey={t('status.draft')} stroke="#c026d3" strokeWidth={3} dot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="p-6 border-2 shadow-md">
        <h2 className="mb-4">{t('dashboard.quickActions')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            variant="outline"
            onClick={onNewInvoice}
            className="h-auto py-6 border-2 border-[rgba(30,58,95,0.15)] hover:border-[rgba(30,58,95,0.20)] hover:bg-[#f0f6ff] transition-all"
          >
            <div className="text-left w-full">
              <div className="p-2 bg-[#f0f6ff] rounded-lg inline-block mb-2">
                <FileText className="h-5 w-5 text-[#2a8fbd]" />
              </div>
              <p className="text-[#1e3a5f]">{t('dashboard.createInvoice')}</p>
              <p className="text-body text-muted-foreground mt-1">
                {t('dashboard.createInvoiceDesc')}
              </p>
            </div>
          </Button>

          <Button
            variant="outline"
            onClick={() => setShowImportDialog(true)}
            className="h-auto py-6 border-2 border-[rgba(30,58,95,0.15)] hover:border-[rgba(30,58,95,0.20)] hover:bg-[#f0f6ff] transition-all"
          >
            <div className="text-left w-full">
              <div className="p-2 bg-[#f0f6ff] rounded-lg inline-block mb-2">
                <Upload className="h-5 w-5 text-[#f08a3c]" />
              </div>
              <p className="text-[#1e3a5f]">{t('dashboard.importData')}</p>
              <p className="text-body text-muted-foreground mt-1">
                {t('dashboard.importDataDesc')}
              </p>
            </div>
          </Button>

          <Button
            variant="outline"
            onClick={handleValidateBatch}
            disabled={isValidating || stats.draft === 0}
            className="h-auto py-6 border-2 border-cyan-200 hover:border-cyan-300 hover:bg-cyan-50 transition-all disabled:opacity-50"
          >
            <div className="text-left w-full">
              <div className="p-2 bg-cyan-100 rounded-lg inline-block mb-2">
                <CheckCircle className="h-5 w-5 text-cyan-600" />
              </div>
              <p className="text-cyan-900">{t('dashboard.validateBatch')}</p>
              <p className="text-body text-muted-foreground mt-1">
                {isValidating ? t('dashboard.validating') : t('dashboard.validateBatchDesc')}
              </p>
            </div>
          </Button>
        </div>
      </Card>

      {/* Recent Invoices */}
      <Card className="p-6 border-2 shadow-md">
        <h2 className="mb-4">{t('dashboard.recentInvoices')}</h2>
        <div className="space-y-3">
          {recentInvoices.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="p-4 bg-[#f0f6ff] rounded-2xl inline-block mb-4">
                <FileText className="h-12 w-12 text-[#2a8fbd]" />
              </div>
              <p>{t('dashboard.noInvoices')}</p>
              <p className="text-body mt-2">{t('dashboard.noInvoicesDesc')}</p>
            </div>
          ) : (
            recentInvoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between p-4 border-2 rounded-xl hover:border-[rgba(30,58,95,0.20)] hover:bg-[#f0f6ff]/50 cursor-pointer transition-all shadow-sm hover:shadow-md"
                onClick={() => onOpenInvoice(invoice)}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="p-2 bg-[#f0f6ff] rounded-lg">
                    <FileText className="h-5 w-5 text-[#2a8fbd]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <p>{invoice.invoiceNumber}</p>
                      {getStatusBadge(invoice.status)}
                      {invoice.signed && (
                        <Badge variant="outline" className="gap-1 border-emerald-200 text-emerald-700 bg-emerald-50">
                          <CheckCircle className="h-3 w-3" />
                          {t('status.signed')}
                        </Badge>
                      )}
                    </div>
                    <p className="text-body text-muted-foreground mt-1">
                      {invoice.buyer.name} • {formatDate(invoice.issueDate)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p>{formatCurrency(invoice.payableAmount, invoice.currency)}</p>
                  {invoice.dueDate && (
                    <p className="text-body text-muted-foreground">
                      {t('dashboard.due')} {formatDate(invoice.dueDate)}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-[#2a8fbd]" />
              {t('dashboard.importData')}
            </DialogTitle>
            <DialogDescription>
              {t('import.selectFileDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="import-file">{t('import.selectFile')}</Label>
              <div className="flex items-center gap-2">
                <input
                  id="import-file"
                  type="file"
                  accept=".json,.csv,.xml"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="block w-full text-body text-muted-foreground
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-2
                    file:text-body file:font-medium
                    file:bg-[#f0f6ff] file:text-[#1e3a5f]
                    file:border-[rgba(30,58,95,0.15)]
                    hover:file:bg-[#f0f6ff]
                    file:cursor-pointer cursor-pointer"
                />
              </div>
              {selectedFile && (
                <p className="text-body text-muted-foreground">
                  {t('import.selectedFile')}: {selectedFile.name}
                </p>
              )}
            </div>

            <div className="p-4 bg-[#f0f6ff] border-2 border-[rgba(30,58,95,0.15)] rounded-lg">
              <p className="text-body text-[#1e3a5f] mb-2">{t('import.supportedFormats')}:</p>
              <ul className="text-body text-[#1e3a5f] space-y-1 list-disc list-inside">
                <li>JSON (.json)</li>
                <li>CSV (.csv)</li>
                <li>UBL XML (.xml)</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowImportDialog(false);
                setSelectedFile(null);
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleImport}
              disabled={!selectedFile || isImporting}
              className="bg-gradient-to-r from-[#1e3a5f] via-[#2a8fbd] to-[#3d5a80] hover:from-[#e07530] hover:via-[#f08a3c] hover:to-[#e07530]"
            >
              {isImporting ? (
                <>{t('import.importing')}...</>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {t('import.import')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
