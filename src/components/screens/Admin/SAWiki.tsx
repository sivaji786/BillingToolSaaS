import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { adminWikiService } from '../../../services/adminApi';
import { Card, CardContent } from '../../ui/card';
import { ScrollArea } from '../../ui/scroll-area';
import { Input } from '../../ui/input';
import { Search, ChevronRight, ChevronDown, FileText, Folder, BookOpen, Clock, Download, Pencil, X, Save } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../../../lib/utils';
import { toast } from 'sonner';
let mermaidInstance: typeof import('mermaid')['default'] | null = null;

async function getMermaid() {
    if (!mermaidInstance) {
        const mod = await import('mermaid');
        mermaidInstance = mod.default;
        mermaidInstance.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' });
    }
    return mermaidInstance;
}

interface WikiItem {
    name: string;
    type: 'file' | 'directory';
    path?: string;
    children?: WikiItem[];
}

// Characters that make Mermaid v11 choke when unquoted in node labels
const MERMAID_SPECIAL_CHARS = /[—–\-\/\\:+&<>|,(){}[\]@#*!?'"`~%^=áéíóúäöüÄÖÜßàèìòùâêîôûçñÑ\u2000-\u206F\u2E00-\u2E7F\u{1F000}-\u{1FFFF}]/u;

/**
 * Pre-process Mermaid source to quote any unquoted node-label text that
 * contains characters Mermaid v11's strict lexer cannot handle.
 *
 * Covers node shapes:  [text]  {text}  (text)  ((text))  >text]
 * Does NOT touch already-quoted labels like ["text"] or style/classDef lines.
 */
function sanitizeMermaid(code: string): string {
    // Match node label patterns: [label], {label}, (label), ((label)), >label]
    // Regex captures the opening bracket char and the label content
    return code.replace(
        /(\[{1,2}|>{1}|\({1,2}|\{{1,2})([^"'\[\]{}\(\)<>\n]+?)(\]{1,2}|\){1,2}|\}{1,2})/g,
        (match, open, label, close) => {
            // Skip if already wrapped in quotes
            if (label.startsWith('"') && label.endsWith('"')) return match;
            if (label.startsWith("'") && label.endsWith("'")) return match;
            // Quote if special chars OR whitespace present (Mermaid v11 is strict)
            if (MERMAID_SPECIAL_CHARS.test(label) || /\s/.test(label)) {
                const safeLabel = label.replace(/"/g, '&quot;');
                return `${open}"${safeLabel}"${close}`;
            }
            return match;
        }
    );
}

// Mermaid diagram component — silently skips diagrams that fail to parse/render
function MermaidDiagram({ code }: { code: string }) {
    const [svg, setSvg] = useState<string>('');

    useEffect(() => {
        setSvg('');
        let cancelled = false;

        const render = async () => {
            try {
                const sanitized = sanitizeMermaid(code);
                const mermaid = await getMermaid();

                // Step 1: Validate syntax with mermaid.parse() (Mermaid v10+ API).
                // This throws a ParseError if the diagram has syntax issues,
                // preventing mermaid.render() from ever producing a bomb SVG.
                try {
                    await (mermaid as any).parse(sanitized);
                } catch {
                    // Silent: diagram has a syntax error — just don't render it
                    return;
                }

                // Step 2: Render the valid diagram
                const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
                const { svg: rendered } = await mermaid.render(id, sanitized);

                // Step 3: Secondary guard — detect error SVGs by content
                const lower = rendered.toLowerCase();
                if (
                    lower.includes('syntax error') ||
                    lower.includes('parse error') ||
                    lower.includes('error-icon') ||
                    lower.includes('error-text') ||
                    lower.includes('errorbounds')
                ) {
                    return; // Silent: don't render the bomb SVG
                }

                if (!cancelled) setSvg(rendered);
            } catch {
                // Silent: any unexpected render error — just skip the diagram
            }
        };

        render();
        return () => { cancelled = true; };
    }, [code]);

    if (!svg) return null;

    return (
        <div
            className="my-6 flex justify-center bg-white rounded-xl border border-slate-200 p-4 overflow-auto"
            dangerouslySetInnerHTML={{ __html: svg }}
        />
    );
}


export function SAWiki() {
    const { language } = useLanguage();
    const [tree, setTree] = useState<WikiItem[]>([]);
    const [selectedPath, setSelectedPath] = useState<string | null>(null);
    const [content, setContent] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [contentLoading, setContentLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['developer', 'product_manager_reports', 'sales']));
    const [editMode, setEditMode] = useState(false);
    const [editContent, setEditContent] = useState('');
    const [saving, setSaving] = useState(false);
    const prevLanguage = useRef(language);

    const getPageTitle = () => {
        if (!selectedPath) return 'Wiki';
        const filename = selectedPath.split('/').pop() || 'Wiki';
        return filename.replace('.md', '').replace(/_/g, ' ');
    };

    const handleExportPDF = () => {
        const contentEl = document.getElementById('wiki-print-content');
        if (!contentEl) return;

        const printWindow = window.open('', '_blank', 'width=900,height=700');
        if (!printWindow) return;

        const title = getPageTitle();
        printWindow.document.write(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 13px;
      line-height: 1.7;
      color: #1e293b;
      padding: 40px 60px;
      max-width: 900px;
      margin: 0 auto;
    }
    h1, h2, h3, h4, h5, h6 { color: #4c1d95; margin: 1.2em 0 0.5em; line-height: 1.3; }
    h1 { font-size: 2em; border-bottom: 2px solid #ddd6fe; padding-bottom: 0.3em; }
    h2 { font-size: 1.5em; border-bottom: 1px solid #ede9fe; padding-bottom: 0.2em; }
    h3 { font-size: 1.2em; }
    p { margin: 0.6em 0; }
    a { color: #7c3aed; text-decoration: underline; }
    code {
      font-family: 'Courier New', monospace;
      font-size: 0.85em;
      background: #f1f5f9;
      padding: 0.15em 0.4em;
      border-radius: 3px;
    }
    pre {
      background: #1e293b;
      color: #e2e8f0;
      padding: 1em;
      border-radius: 6px;
      overflow-x: auto;
      margin: 1em 0;
    }
    pre code { background: none; padding: 0; color: inherit; }
    table { width: 100%; border-collapse: collapse; margin: 1em 0; }
    th { background: #ede9fe; color: #4c1d95; font-weight: 600; text-align: left; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 12px; }
    tr:nth-child(even) td { background: #f8fafc; }
    ul, ol { padding-left: 1.5em; margin: 0.5em 0; }
    li { margin: 0.25em 0; }
    blockquote { border-left: 4px solid #a78bfa; padding-left: 1em; color: #64748b; margin: 1em 0; }
    img { max-width: 100%; height: auto; }
    hr { border: none; border-top: 1px solid #e2e8f0; margin: 1.5em 0; }
    .print-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 12px;
      margin-bottom: 24px;
      border-bottom: 2px solid #7c3aed;
    }
    .print-header .title { font-size: 0.75em; color: #6d28d9; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; }
    .print-header .date { font-size: 0.7em; color: #94a3b8; }
    @media print {
      body { padding: 20px 30px; }
      @page { margin: 1.5cm; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="print-header">
    <span class="title">Platform Wiki — ${title}</span>
    <span class="date">${new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
  </div>
  ${contentEl.innerHTML}
  <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); };<\/script>
</body>
</html>`);
        printWindow.document.close();
    };

    // Reload tree (and reset selection) when language changes
    useEffect(() => {
        if (prevLanguage.current !== language) {
            prevLanguage.current = language;
            setSelectedPath(null);
            setContent('');
        }
        setLoading(true);
        loadTree();
    }, [language]);

    useEffect(() => {
        if (selectedPath) {
            loadContent(selectedPath);
        }
    }, [selectedPath, language]);

    const loadTree = async () => {
        try {
            const data = await adminWikiService.getTree(language);
            setTree(data);
            if (data.length > 0) {
                const firstFile = findFirstFile(data);
                if (firstFile) setSelectedPath(firstFile);
            }
        } catch (error) {
            console.error('Failed to load wiki tree:', error);
            toast.error('Failed to load documentation structure');
        } finally {
            setLoading(false);
        }
    };

    const findFirstFile = (items: WikiItem[]): string | null => {
        for (const item of items) {
            if (item.type === 'file' && item.path) return item.path;
            if (item.type === 'directory' && item.children) {
                const childFile = findFirstFile(item.children);
                if (childFile) return childFile;
            }
        }
        return null;
    };

    const loadContent = async (path: string) => {
        setEditMode(false);
        setEditContent('');
        setContentLoading(true);
        try {
            const data = await adminWikiService.getContent(path, language);
            setContent(data.content);
        } catch (error) {
            console.error('Failed to load content:', error);
            toast.error('Failed to load document content');
        } finally {
            setContentLoading(false);
        }
    };

    const handleEditToggle = () => {
        setEditContent(content);
        setEditMode(true);
    };

    const handleCancelEdit = () => {
        setEditMode(false);
        setEditContent('');
    };

    const handleSave = async () => {
        if (!selectedPath) return;
        setSaving(true);
        try {
            await adminWikiService.saveContent(selectedPath, editContent, language);
            setContent(editContent);
            setEditMode(false);
            toast.success('Document saved');
        } catch {
            toast.error('Failed to save document');
        } finally {
            setSaving(false);
        }
    };

    const toggleFolder = (name: string) => {
        const next = new Set(expandedFolders);
        if (next.has(name)) {
            next.delete(name);
        } else {
            next.add(name);
        }
        setExpandedFolders(next);
    };

    const renderTree = (items: WikiItem[], depth = 0) => {
        return items
            .filter(item => {
                if (!searchQuery) return true;
                if (item.type === 'file') return item.name.toLowerCase().includes(searchQuery.toLowerCase());
                return true;
            })
            .map((item) => {
                const isExpanded = expandedFolders.has(item.name);
                const isSelected = selectedPath === item.path;

                if (item.type === 'directory') {
                    return (
                        <div key={item.name} className="flex flex-col">
                            <button
                                onClick={() => toggleFolder(item.name)}
                                className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded-md text-body font-medium text-muted-foreground w-full text-left transition-colors"
                                style={{ paddingLeft: `${depth * 1.5 + 0.5}rem` }}
                            >
                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                <Folder className="h-4 w-4 text-purple-600" />
                                <span>{item.name.replace(/_/g, ' ')}</span>
                            </button>
                            {isExpanded && item.children && (
                                <div className="mt-1">
                                    {renderTree(item.children, depth + 1)}
                                </div>
                            )}
                        </div>
                    );
                }

                return (
                    <button
                        key={item.path}
                        onClick={() => item.path && setSelectedPath(item.path)}
                        className={cn(
                            "flex items-center gap-2 px-2 py-1.5 rounded-md text-body w-full text-left transition-all mb-0.5",
                            isSelected
                                ? "bg-purple-100 text-purple-700 font-semibold border-l-2 border-purple-600"
                                : "hover:bg-accent text-muted-foreground"
                        )}
                        style={{ paddingLeft: `${depth * 1.5 + 1.5}rem` }}
                    >
                        <FileText className={cn("h-4 w-4 shrink-0", isSelected ? "text-purple-600" : "text-muted-foreground")} />
                        <span className="truncate">{item.name.replace('.md', '').replace(/_/g, ' ')}</span>
                    </button>
                );
            });
    };

    // Custom code block that renders Mermaid diagrams
    const CodeBlock = ({ node, className, children, ...props }: any) => {
        const match = /language-(\w+)/.exec(className || '');
        const lang = match?.[1];
        const code = String(children).replace(/\n$/, '');

        if (lang === 'mermaid') {
            return <MermaidDiagram code={code} />;
        }

        return (
            <code
                className={cn(
                    "rounded text-body font-mono",
                    className?.includes('language-')
                        ? "block bg-slate-900 text-slate-100 p-4 overflow-x-auto"
                        : "bg-slate-100 text-slate-800 px-1.5 py-0.5"
                )}
                {...props}
            >
                {children}
            </code>
        );
    };

    // Custom anchor: intercept relative .md links for internal navigation
    const resolveLink = (href: string): string | null => {
        if (!href) return null;
        // Pure anchor link — keep as-is
        if (href.startsWith('#')) return null;
        // External URL — open in new tab
        if (href.startsWith('http://') || href.startsWith('https://')) return null;

        // Resolve relative path against current document's directory
        const currentDir = selectedPath ? selectedPath.split('/').slice(0, -1).join('/') : '';

        let resolved = href;
        if (!href.startsWith('/')) {
            // Relative path — join with current dir
            const parts = currentDir ? [currentDir, href] : [href];
            resolved = parts.join('/');
        }

        // Normalize: remove leading slash, collapse ../ segments
        const segments = resolved.replace(/^\//, '').split('/');
        const normalized: string[] = [];
        for (const seg of segments) {
            if (seg === '..') {
                normalized.pop();
            } else if (seg !== '.') {
                normalized.push(seg);
            }
        }
        return normalized.join('/');
    };

    const WikiLink = ({ href, children, ...props }: any) => {
        if (!href) return <span>{children}</span>;

        // Pure anchor (#section) — scroll to element
        if (href.startsWith('#')) {
            const anchor = href.slice(1);
            return (
                <a
                    href={href}
                    onClick={(e) => {
                        e.preventDefault();
                        const el = document.getElementById(anchor);
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="text-purple-600 hover:underline cursor-pointer"
                    {...props}
                >
                    {children}
                </a>
            );
        }

        // External link
        if (href.startsWith('http://') || href.startsWith('https://')) {
            return (
                <a href={href} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline" {...props}>
                    {children}
                </a>
            );
        }

        // Split off any anchor from the path (e.g. "other.md#section")
        const [pathPart, anchorPart] = href.split('#');
        const resolved = resolveLink(pathPart);

        if (resolved) {
            return (
                <a
                    href="#"
                    onClick={(e) => {
                        e.preventDefault();
                        setSelectedPath(resolved);
                        // Auto-expand parent folder if needed
                        const folder = resolved.split('/')[0];
                        if (folder) setExpandedFolders(prev => new Set([...prev, folder]));
                        // Scroll to anchor after content loads
                        if (anchorPart) {
                            setTimeout(() => {
                                const el = document.getElementById(anchorPart);
                                if (el) el.scrollIntoView({ behavior: 'smooth' });
                            }, 600);
                        }
                    }}
                    className="text-purple-600 hover:text-purple-800 hover:underline cursor-pointer font-medium"
                    {...props}
                >
                    {children}
                </a>
            );
        }

        return <a href={href} className="text-purple-600 hover:underline" {...props}>{children}</a>;
    };

    return (
        <div className="flex h-[calc(100vh-8rem)] gap-6 overflow-hidden">
            {/* Sidebar Navigation */}
            <div className="w-80 flex flex-col gap-4 border-r pr-6 shrink-0 h-full overflow-hidden">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search docs..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <ScrollArea className="flex-1 min-h-0 -mr-6 pr-6">
                    <div className="space-y-1">
                        {loading ? (
                            <div className="flex items-center justify-center p-8">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600" />
                            </div>
                        ) : (
                            renderTree(tree)
                        )}
                    </div>
                </ScrollArea>

                <div className="p-4 bg-muted/30 rounded-lg border border-dashed text-micro text-muted-foreground flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <BookOpen className="h-3 w-3" />
                        <span className="font-semibold uppercase tracking-wider text-[10px]">Platform Wiki v1.0</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        <span>Live sync from docs/</span>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 h-full flex flex-col min-w-0 overflow-hidden">
                {/* Content Header */}
                <div className="flex items-center justify-between mb-3 shrink-0">
                    <h2 className="text-heading-2 font-semibold text-slate-700 capitalize truncate">
                        {getPageTitle()}
                    </h2>
                    {selectedPath && !contentLoading && (
                        <div className="flex items-center gap-2 shrink-0">
                            {editMode ? (
                                <>
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-micro font-medium rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50"
                                    >
                                        <Save className="h-3.5 w-3.5" />
                                        {saving ? 'Saving…' : 'Save'}
                                    </button>
                                    <button
                                        onClick={handleCancelEdit}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-micro font-medium rounded-md bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors shadow-sm"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                        Cancel
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={handleEditToggle}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-micro font-medium rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors shadow-sm"
                                        title="Edit this document"
                                    >
                                        <Pencil className="h-3.5 w-3.5" />
                                        Edit
                                    </button>
                                    <button
                                        onClick={handleExportPDF}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-micro font-medium rounded-md bg-purple-600 text-white hover:bg-purple-700 transition-colors shadow-sm"
                                        title="Export this page as PDF"
                                    >
                                        <Download className="h-3.5 w-3.5" />
                                        Export PDF
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
                <Card className="flex-1 flex flex-col bg-slate-50 shadow-sm border-slate-200 overflow-hidden">
                    <CardContent className="p-0 h-full">
                        {editMode ? (
                            <textarea
                                className="w-full h-full p-6 font-mono text-body bg-white resize-none focus:outline-none focus:ring-2 focus:ring-purple-400 rounded"
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                spellCheck={false}
                            />
                        ) : (
                        <ScrollArea className="h-full">
                            <div id="wiki-print-content" className="prose prose-slate max-w-4xl mx-auto p-8 lg:p-12 prose-headings:text-purple-900 prose-a:text-purple-600 prose-pre:bg-transparent prose-pre:p-0 prose-table:w-full">
                                {contentLoading ? (
                                    <div className="flex flex-col items-center justify-center h-64 gap-3">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                                        <p className="text-body text-slate-500">Loading documentation...</p>
                                    </div>
                                ) : (
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                            code: CodeBlock,
                                            a: WikiLink,
                                            table: ({ children }) => (
                                                <div className="overflow-x-auto my-6">
                                                    <table className="min-w-full border-collapse border border-slate-300 text-body">
                                                        {children}
                                                    </table>
                                                </div>
                                            ),
                                            thead: ({ children }) => (
                                                <thead className="bg-purple-50">{children}</thead>
                                            ),
                                            th: ({ children }) => (
                                                <th className="border border-slate-300 px-4 py-2 text-left font-semibold text-purple-800">{children}</th>
                                            ),
                                            td: ({ children }) => (
                                                <td className="border border-slate-300 px-4 py-2">{children}</td>
                                            ),
                                            tr: ({ children }) => (
                                                <tr className="even:bg-slate-50">{children}</tr>
                                            ),
                                        }}
                                    >
                                        {content}
                                    </ReactMarkdown>
                                )}
                            </div>
                        </ScrollArea>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
