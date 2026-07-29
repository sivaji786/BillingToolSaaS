import { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { adminWikiService } from '../../../services/adminApi';
import type { MockupItem } from '../../../services/adminApi';
import { getMockupUrl } from '../../../utils/mockupUrl';
import { Card, CardContent } from '../../ui/card';
import { ScrollArea } from '../../ui/scroll-area';
import { SplitPaneGroup, SplitPane, SplitPaneHandle, type ImperativePanelHandle } from '../../ui/split-pane';
import { Input } from '../../ui/input';
import { Search, ChevronRight, ChevronDown, FileText, Folder, FolderPlus, BookOpen, Clock, Download, Pencil, X, Save, FilePlus, Bold, Italic, List, ListOrdered, Code, Link2, Table, Minus, Quote, HelpCircle, Upload, Trash2, ExternalLink, LayoutTemplate } from 'lucide-react';
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


function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function MockupsPanel() {
    const [tree, setTree] = useState<MockupItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [previewFile, setPreviewFile] = useState<MockupItem | null>(null);
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
    const [renamingPath, setRenamingPath] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');
    const [newFolderParent, setNewFolderParent] = useState<string | null>(null);
    const [newFolderName, setNewFolderName] = useState('');
    const [uploadTarget, setUploadTarget] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const renameInputRef = useRef<HTMLInputElement>(null);
    const treePanelRef = useRef<ImperativePanelHandle>(null);

    const loadTree = useCallback(async () => {
        setLoading(true);
        try {
            setTree(await adminWikiService.listMockups());
        } catch {
            toast.error('Failed to load mockups');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadTree(); }, [loadTree]);

    useEffect(() => {
        if (renamingPath) renameInputRef.current?.focus();
    }, [renamingPath]);

    const triggerUpload = (folderPath: string) => {
        setUploadTarget(folderPath);
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        if (!file.name.toLowerCase().endsWith('.html')) {
            toast.error('Only .html files are allowed');
            return;
        }
        setUploading(true);
        try {
            await adminWikiService.uploadMockup(file, uploadTarget);
            if (uploadTarget) setExpandedFolders(prev => new Set([...prev, uploadTarget]));
            await loadTree();
            toast.success(`"${file.name}" uploaded`);
        } catch {
            toast.error('Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (item: MockupItem) => {
        const label = item.type === 'directory'
            ? `folder "${item.name}" and all its contents`
            : `"${item.name}"`;
        if (!confirm(`Delete ${label}?`)) return;
        try {
            await adminWikiService.deleteMockup(item.path);
            if (previewFile && (previewFile.path === item.path || previewFile.path.startsWith(item.path + '/'))) {
                setPreviewFile(null);
            }
            await loadTree();
            toast.success('Deleted');
        } catch {
            toast.error('Delete failed');
        }
    };

    const startRename = (item: MockupItem) => {
        setRenamingPath(item.path);
        setRenameValue(item.name);
        setNewFolderParent(null);
    };

    const commitRename = async (item: MockupItem) => {
        const trimmed = renameValue.trim();
        setRenamingPath(null);
        if (!trimmed || trimmed === item.name) return;
        const finalName = item.type === 'file' && !trimmed.toLowerCase().endsWith('.html')
            ? trimmed + '.html'
            : trimmed;
        try {
            await adminWikiService.renameMockup(item.path, finalName);
            if (previewFile?.path === item.path) setPreviewFile(null);
            await loadTree();
            toast.success('Renamed');
        } catch {
            toast.error('Rename failed');
        }
    };

    const handleCreateFolder = async (parentPath: string) => {
        const name = newFolderName.trim();
        setNewFolderParent(null);
        setNewFolderName('');
        if (!name) return;
        const fullPath = parentPath ? `${parentPath}/${name}` : name;
        try {
            await adminWikiService.createMockupFolder(fullPath);
            setExpandedFolders(prev => new Set([...prev, ...(parentPath ? [parentPath] : []), fullPath]));
            await loadTree();
            toast.success(`Folder "${name}" created`);
        } catch {
            toast.error('Failed to create folder');
        }
    };

    const toggleFolder = (path: string) => {
        setExpandedFolders(prev => {
            const next = new Set(prev);
            next.has(path) ? next.delete(path) : next.add(path);
            return next;
        });
    };

    const renderTree = (items: MockupItem[], depth = 0): React.ReactNode => items.map(item => {
        const isExpanded = expandedFolders.has(item.path);
        const isSelected = previewFile?.path === item.path;
        const isRenaming = renamingPath === item.path;
        const pl = depth * 16 + 8;

        if (item.type === 'directory') {
            return (
                <div key={item.path}>
                    <div
                        className="group flex items-center gap-1.5 pr-3 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                        style={{ paddingLeft: pl }}
                        onClick={() => !isRenaming && toggleFolder(item.path)}
                    >
                        {isExpanded
                            ? <ChevronDown className="h-3.5 w-3.5 text-[#2a8fbd] shrink-0" />
                            : <ChevronRight className="h-3.5 w-3.5 text-[#2a8fbd] shrink-0" />}
                        <Folder className="h-4 w-4 text-[#2a8fbd] shrink-0" />
                        {isRenaming ? (
                            <input
                                ref={renameInputRef}
                                value={renameValue}
                                onChange={e => setRenameValue(e.target.value)}
                                onKeyDown={e => {
                                    e.stopPropagation();
                                    if (e.key === 'Enter') commitRename(item);
                                    if (e.key === 'Escape') setRenamingPath(null);
                                }}
                                onClick={e => e.stopPropagation()}
                                className="flex-1 min-w-0 text-body bg-white border border-[rgba(30,58,95,0.20)] rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-[rgba(30,58,95,0.25)]"
                            />
                        ) : (
                            <span className="flex-1 min-w-0 text-body font-medium text-slate-700 truncate select-none">
                                {item.name}
                            </span>
                        )}
                        {!isRenaming && (
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={e => e.stopPropagation()}>
                                <button title="New subfolder" onClick={() => { setNewFolderParent(item.path); setNewFolderName(''); setRenamingPath(null); }}
                                    className="p-0.5 rounded hover:bg-[#f0f6ff] text-slate-400 hover:text-[#f08a3c]">
                                    <FolderPlus className="h-3.5 w-3.5" />
                                </button>
                                <button title="Upload HTML here" onClick={() => triggerUpload(item.path)} disabled={uploading}
                                    className="p-0.5 rounded hover:bg-blue-100 text-slate-400 hover:text-blue-600 disabled:opacity-40">
                                    <Upload className="h-3.5 w-3.5" />
                                </button>
                                <button title="Rename folder" onClick={() => startRename(item)}
                                    className="p-0.5 rounded hover:bg-amber-100 text-slate-400 hover:text-amber-600">
                                    <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button title="Delete folder" onClick={() => handleDelete(item)}
                                    className="p-0.5 rounded hover:bg-red-100 text-slate-400 hover:text-red-600">
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Inline new-subfolder input */}
                    {newFolderParent === item.path && (
                        <div className="flex items-center gap-1.5 pr-3 py-1" style={{ paddingLeft: pl + 24 }} onClick={e => e.stopPropagation()}>
                            <Folder className="h-3.5 w-3.5 text-[#3d5a80] shrink-0" />
                            <input
                                autoFocus
                                value={newFolderName}
                                onChange={e => setNewFolderName(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') handleCreateFolder(item.path);
                                    if (e.key === 'Escape') { setNewFolderParent(null); setNewFolderName(''); }
                                }}
                                placeholder="Folder name…"
                                className="flex-1 min-w-0 text-body bg-white border border-[rgba(30,58,95,0.20)] rounded px-2 py-0.5 outline-none focus:ring-1 focus:ring-[rgba(30,58,95,0.25)]"
                            />
                            <button onClick={() => handleCreateFolder(item.path)} disabled={!newFolderName.trim()}
                                className="text-micro px-2 py-0.5 rounded bg-[#f08a3c] text-white hover:bg-[#e07530] disabled:opacity-50 whitespace-nowrap">
                                Add
                            </button>
                            <button onClick={() => { setNewFolderParent(null); setNewFolderName(''); }}
                                className="p-0.5 rounded hover:bg-slate-200 text-slate-500">
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    )}

                    {isExpanded && (
                        item.children && item.children.length > 0
                            ? <div>{renderTree(item.children, depth + 1)}</div>
                            : <p className="text-micro text-slate-500 italic py-1" style={{ paddingLeft: pl + 28 }}>Empty</p>
                    )}
                </div>
            );
        }

        // File row
        return (
            <div
                key={item.path}
                className={cn(
                    'group flex items-center gap-2 pr-3 py-1.5 rounded-lg cursor-pointer transition-all',
                    isSelected ? 'bg-[#f0f6ff] border border-[rgba(30,58,95,0.15)]' : 'hover:bg-slate-50 border border-transparent'
                )}
                style={{ paddingLeft: pl }}
                onClick={() => !isRenaming && setPreviewFile(item)}
            >
                <FileText className={cn('h-4 w-4 shrink-0', isSelected ? 'text-[#2a8fbd]' : 'text-slate-400')} />
                {isRenaming ? (
                    <input
                        ref={renameInputRef}
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        onKeyDown={e => {
                            e.stopPropagation();
                            if (e.key === 'Enter') commitRename(item);
                            if (e.key === 'Escape') setRenamingPath(null);
                        }}
                        onClick={e => e.stopPropagation()}
                        className="flex-1 min-w-0 text-body bg-white border border-[rgba(30,58,95,0.20)] rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-[rgba(30,58,95,0.25)]"
                    />
                ) : (
                    <div className="flex-1 min-w-0">
                        <p className={cn('text-body truncate font-medium', isSelected ? 'text-[#1e3a5f]' : 'text-slate-700')}>
                            {item.name}
                        </p>
                        {item.size !== undefined && (
                            <p className="text-micro text-slate-500">{formatBytes(item.size)}</p>
                        )}
                    </div>
                )}
                {!isRenaming && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={e => e.stopPropagation()}>
                        <button title="Open in new tab" onClick={() => window.open(getMockupUrl(item.path), '_blank')}
                            className="p-0.5 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700">
                            <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                        <button title="Rename" onClick={() => startRename(item)}
                            className="p-0.5 rounded hover:bg-amber-100 text-slate-400 hover:text-amber-600">
                            <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button title="Delete" onClick={() => handleDelete(item)}
                            className="p-0.5 rounded hover:bg-red-100 text-slate-400 hover:text-red-600">
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    </div>
                )}
            </div>
        );
    });

    return (
        <SplitPaneGroup storageKey="sa-wiki-mockups-layout" direction="horizontal" className="flex-1 min-h-0 overflow-hidden">
            {/* Left panel — tree */}
            <SplitPane ref={treePanelRef} defaultSize={28} minSize={16} collapsible collapsedSize={4}>
            <div className="flex flex-col gap-3 h-full pr-3">
                {/* Toolbar */}
                <div className="flex items-center gap-2 shrink-0 pr-3">
                    <span className="flex-1 text-body font-medium text-slate-700">HTML Mockups</span>
                    <button
                        onClick={() => { setNewFolderParent(''); setNewFolderName(''); setRenamingPath(null); }}
                        title="New folder"
                        className="flex items-center gap-1 px-2.5 py-1.5 text-micro font-medium rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                        <FolderPlus className="h-3.5 w-3.5" />
                        Folder
                    </button>
                    <button
                        onClick={() => triggerUpload('')}
                        disabled={uploading}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-micro font-medium rounded-md bg-[#f08a3c] text-white hover:bg-[#e07530] disabled:opacity-50 transition-colors"
                    >
                        <Upload className="h-3.5 w-3.5" />
                        {uploading ? '…' : 'Upload'}
                    </button>
                    <input ref={fileInputRef} type="file" accept=".html,text/html" className="hidden" onChange={handleFileChange} />
                </div>

                {/* Root-level new folder input */}
                {newFolderParent === '' && (
                    <div className="flex items-center gap-2 px-2 py-1.5 mr-3 rounded-lg bg-[#f0f6ff] border border-[rgba(30,58,95,0.15)]">
                        <Folder className="h-3.5 w-3.5 text-[#3d5a80] shrink-0" />
                        <input
                            autoFocus
                            value={newFolderName}
                            onChange={e => setNewFolderName(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') handleCreateFolder('');
                                if (e.key === 'Escape') { setNewFolderParent(null); setNewFolderName(''); }
                            }}
                            placeholder="Folder name…"
                            className="flex-1 min-w-0 text-body bg-transparent outline-none placeholder:text-slate-400"
                        />
                        <button onClick={() => handleCreateFolder('')} disabled={!newFolderName.trim()}
                            className="text-micro px-2 py-0.5 rounded bg-[#f08a3c] text-white hover:bg-[#e07530] disabled:opacity-50 whitespace-nowrap">
                            Add
                        </button>
                        <button onClick={() => { setNewFolderParent(null); setNewFolderName(''); }}
                            className="p-0.5 rounded hover:bg-[#dbe8f7] text-slate-500">
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>
                )}

                <ScrollArea className="flex-1 min-h-0">
                    {loading ? (
                        <div className="flex items-center justify-center p-8">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#f08a3c]" />
                        </div>
                    ) : tree.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center px-4">
                            <LayoutTemplate className="h-10 w-10 text-slate-300" />
                            <p className="text-body text-slate-500">No mockups yet</p>
                            <p className="text-micro text-slate-500">Upload an HTML file or create a folder</p>
                        </div>
                    ) : (
                        <div className="space-y-0.5">{renderTree(tree)}</div>
                    )}
                </ScrollArea>
            </div>
            </SplitPane>

            <SplitPaneHandle targetPanelRef={treePanelRef} label="Mockups tree" />

            {/* Right panel — preview */}
            <SplitPane defaultSize={72} minSize={30}>
            <div className="h-full flex flex-col min-w-0 overflow-hidden pl-3">
                {previewFile ? (
                    <>
                        <div className="flex items-center justify-between mb-3 shrink-0">
                            <div className="min-w-0">
                                <h2 className="text-heading-2 font-medium text-slate-700 truncate">{previewFile.name}</h2>
                                {previewFile.path.includes('/') && (
                                    <p className="text-micro text-slate-500 truncate">{previewFile.path}</p>
                                )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-4">
                                <button
                                    onClick={() => window.open(getMockupUrl(previewFile.path), '_blank')}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-micro font-medium rounded-md bg-[#f08a3c] text-white hover:bg-[#e07530] transition-colors shadow-sm"
                                >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    New Tab
                                </button>
                                <button onClick={() => setPreviewFile(null)}
                                    className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                        <Card className="flex-1 overflow-hidden shadow-sm border-slate-200">
                            <CardContent className="p-0 h-full">
                                <iframe
                                    key={previewFile.path}
                                    src={getMockupUrl(previewFile.path)}
                                    className="w-full h-full border-0 rounded-lg"
                                    title={previewFile.name}
                                    sandbox="allow-scripts allow-same-origin"
                                />
                            </CardContent>
                        </Card>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
                        <div className="w-20 h-20 rounded-2xl bg-[#f0f6ff] border border-[rgba(30,58,95,0.10)] flex items-center justify-center">
                            <LayoutTemplate className="h-9 w-9 text-[#3d5a80]" />
                        </div>
                        <div>
                            <p className="text-heading-3 font-medium text-slate-600 mb-1">No mockup selected</p>
                            <p className="text-body text-slate-500">Select a file from the tree to preview it</p>
                        </div>
                    </div>
                )}
            </div>
            </SplitPane>
        </SplitPaneGroup>
    );
}

export function SAWiki() {
    const { language } = useLanguage();
    const [activeTab, setActiveTab] = useState<'docs' | 'mockups'>('docs');
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
    const [showNewDocForm, setShowNewDocForm] = useState(false);
    const [newDocName, setNewDocName] = useState('');
    const [newDocFolder, setNewDocFolder] = useState('');
    const [creating, setCreating] = useState(false);
    const [showCheatsheet, setShowCheatsheet] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const prevLanguage = useRef(language);
    const docsSidebarRef = useRef<ImperativePanelHandle>(null);

    const insertMarkdown = (prefix: string, suffix = '', placeholder = 'text') => {
        const el = textareaRef.current;
        if (!el) return;
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const selected = editContent.substring(start, end) || placeholder;
        const newContent = editContent.substring(0, start) + prefix + selected + suffix + editContent.substring(end);
        setEditContent(newContent);
        setTimeout(() => {
            el.focus();
            el.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
        }, 0);
    };

    const insertHeading = (level: number) => {
        const el = textareaRef.current;
        if (!el) return;
        const lineStart = editContent.lastIndexOf('\n', el.selectionStart - 1) + 1;
        const prefix = '#'.repeat(level) + ' ';
        setEditContent(editContent.substring(0, lineStart) + prefix + editContent.substring(lineStart));
        setTimeout(() => { el.focus(); el.setSelectionRange(lineStart + prefix.length, lineStart + prefix.length); }, 0);
    };

    const insertBlock = (template: string) => {
        const el = textareaRef.current;
        if (!el) return;
        const pos = el.selectionStart;
        const before = editContent.substring(0, pos);
        const after = editContent.substring(pos);
        const gap = before.length && !before.endsWith('\n') ? '\n' : '';
        setEditContent(before + gap + template + '\n' + after);
        setTimeout(() => { el.focus(); }, 0);
    };

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

    const handleCreateDocument = async () => {
        const name = newDocName.trim();
        if (!name) return;
        const slug = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_\-]/g, '');
        const path = newDocFolder.trim() ? `${newDocFolder.trim()}/${slug}` : slug;
        setCreating(true);
        try {
            const result = await adminWikiService.createDocument(path, language);
            await loadTree();
            setSelectedPath(result.path);
            const folder = result.path.split('/')[0];
            if (folder) setExpandedFolders(prev => new Set([...prev, folder]));
            setShowNewDocForm(false);
            setNewDocName('');
            setNewDocFolder('');
            toast.success(`Document "${name}" created`);
        } catch {
            toast.error('Failed to create document');
        } finally {
            setCreating(false);
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
                                className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded-md text-body font-medium text-slate-700 w-full text-left transition-colors"
                                style={{ paddingLeft: `${depth * 1.5 + 0.5}rem` }}
                            >
                                {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-[#2a8fbd]" /> : <ChevronRight className="h-3.5 w-3.5 text-[#2a8fbd]" />}
                                <Folder className="h-3.5 w-3.5 text-[#2a8fbd] shrink-0" />
                                <span className="truncate capitalize">{item.name.replace(/_/g, ' ')}</span>
                            </button>
                            {isExpanded && item.children && (
                                <div className="mt-0.5 mb-1">
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
                            "flex items-center gap-2 px-2 py-1 rounded-md text-body w-full text-left transition-all mb-0.5",
                            isSelected
                                ? "bg-[#f0f6ff] text-[#1e3a5f] font-medium border-l-2 border-[#f08a3c]"
                                : "hover:bg-accent text-slate-500"
                        )}
                        style={{ paddingLeft: `${depth * 1.5 + 1.5}rem` }}
                    >
                        <FileText className={cn("h-3.5 w-3.5 shrink-0", isSelected ? "text-[#2a8fbd]" : "text-slate-400")} />
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
                    className="text-[#2a8fbd] hover:underline cursor-pointer"
                    {...props}
                >
                    {children}
                </a>
            );
        }

        // External link
        if (href.startsWith('http://') || href.startsWith('https://')) {
            return (
                <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#2a8fbd] hover:underline" {...props}>
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
                    className="text-[#2a8fbd] hover:text-[#1e3a5f] hover:underline cursor-pointer font-medium"
                    {...props}
                >
                    {children}
                </a>
            );
        }

        return <a href={href} className="text-[#2a8fbd] hover:underline" {...props}>{children}</a>;
    };

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)] gap-4 overflow-hidden">
            {/* Tab bar */}
            <div className="flex items-center gap-1 border-b pb-0 shrink-0">
                <button
                    onClick={() => setActiveTab('docs')}
                    className={cn(
                        'flex items-center gap-2 px-4 py-2 text-body font-medium rounded-t-lg transition-colors border-b-2 -mb-px',
                        activeTab === 'docs'
                            ? 'border-[#f08a3c] text-[#1e3a5f] bg-[#f0f6ff]'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    )}
                >
                    <BookOpen className="h-4 w-4" />
                    Documentation
                </button>
                <button
                    onClick={() => setActiveTab('mockups')}
                    className={cn(
                        'flex items-center gap-2 px-4 py-2 text-body font-medium rounded-t-lg transition-colors border-b-2 -mb-px',
                        activeTab === 'mockups'
                            ? 'border-[#f08a3c] text-[#1e3a5f] bg-[#f0f6ff]'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    )}
                >
                    <LayoutTemplate className="h-4 w-4" />
                    Mockups
                </button>
            </div>

            {activeTab === 'mockups' && <MockupsPanel />}

            {activeTab === 'docs' && <SplitPaneGroup storageKey="sa-wiki-docs-layout" direction="horizontal" className="flex-1 overflow-hidden min-h-0">
            {/* Sidebar Navigation */}
            <SplitPane ref={docsSidebarRef} defaultSize={28} minSize={16} collapsible collapsedSize={4}>
            <div className="flex flex-col gap-4 pr-6 h-full overflow-hidden">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search docs..."
                            className="pl-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => { setShowNewDocForm(v => !v); setNewDocName(''); setNewDocFolder(''); }}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-micro font-medium rounded-md bg-[#f08a3c] text-white hover:bg-[#e07530] transition-colors shrink-0"
                        title="New document"
                    >
                        <FilePlus className="h-3.5 w-3.5" />
                        New
                    </button>
                </div>

                {showNewDocForm && (
                    <div className="flex flex-col gap-2 p-3 rounded-lg border border-[rgba(30,58,95,0.15)] bg-[#f0f6ff]">
                        <p className="text-micro font-medium text-[#1e3a5f] uppercase tracking-wide">New Document</p>
                        <Input
                            placeholder="Document name"
                            className="h-7 text-body"
                            value={newDocName}
                            onChange={(e) => setNewDocName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateDocument()}
                            autoFocus
                        />
                        <Input
                            placeholder="Folder (optional)"
                            className="h-7 text-body"
                            value={newDocFolder}
                            onChange={(e) => setNewDocFolder(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateDocument()}
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={handleCreateDocument}
                                disabled={creating || !newDocName.trim()}
                                className="flex-1 py-1 text-micro font-medium rounded-md bg-[#f08a3c] text-white hover:bg-[#e07530] disabled:opacity-50 transition-colors"
                            >
                                {creating ? 'Creating…' : 'Create'}
                            </button>
                            <button
                                onClick={() => setShowNewDocForm(false)}
                                className="px-3 py-1 text-micro font-medium rounded-md bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                <ScrollArea className="flex-1 min-h-0 -mr-6 pr-6">
                    <div className="space-y-1">
                        {loading ? (
                            <div className="flex items-center justify-center p-8">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#f08a3c]" />
                            </div>
                        ) : (
                            renderTree(tree)
                        )}
                    </div>
                </ScrollArea>

                <div className="p-4 bg-muted/30 rounded-lg border border-dashed text-micro text-muted-foreground flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <BookOpen className="h-3 w-3" />
                        <span className="font-medium uppercase tracking-wider text-body">Platform Wiki v1.0</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        <span>Live sync from docs/</span>
                    </div>
                </div>
            </div>
            </SplitPane>

            <SplitPaneHandle targetPanelRef={docsSidebarRef} label="Documentation tree" />

            {/* Content Area */}
            <SplitPane defaultSize={72} minSize={35}>
            <div className="h-full flex flex-col min-w-0 overflow-hidden pl-6">
                {/* Content Header */}
                <div className="flex items-center justify-between mb-3 shrink-0">
                    <h2 className="text-heading-2 font-medium text-slate-700 capitalize truncate">
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
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-micro font-medium rounded-md bg-[#f08a3c] text-white hover:bg-[#e07530] transition-colors shadow-sm"
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
                            <div className="flex flex-col h-full">
                                {/* Formatting toolbar */}
                                <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-slate-200 bg-slate-50 flex-wrap shrink-0">
                                    {[
                                        { icon: <Bold className="h-3.5 w-3.5" />, title: 'Bold', action: () => insertMarkdown('**', '**', 'bold text') },
                                        { icon: <Italic className="h-3.5 w-3.5" />, title: 'Italic', action: () => insertMarkdown('_', '_', 'italic text') },
                                    ].map(btn => (
                                        <button key={btn.title} title={btn.title} onClick={btn.action}
                                            className="p-1.5 rounded hover:bg-slate-200 text-slate-600 transition-colors">
                                            {btn.icon}
                                        </button>
                                    ))}
                                    <span className="w-px h-4 bg-slate-300 mx-1" />
                                    {[1, 2, 3].map(level => (
                                        <button key={level} title={`Heading ${level}`} onClick={() => insertHeading(level)}
                                            className="px-1.5 py-1 rounded hover:bg-slate-200 text-slate-600 text-micro font-medium transition-colors">
                                            H{level}
                                        </button>
                                    ))}
                                    <span className="w-px h-4 bg-slate-300 mx-1" />
                                    {[
                                        { icon: <List className="h-3.5 w-3.5" />, title: 'Bullet list', action: () => insertBlock('- Item 1\n- Item 2\n- Item 3') },
                                        { icon: <ListOrdered className="h-3.5 w-3.5" />, title: 'Numbered list', action: () => insertBlock('1. Item 1\n2. Item 2\n3. Item 3') },
                                        { icon: <Quote className="h-3.5 w-3.5" />, title: 'Blockquote', action: () => insertMarkdown('> ', '', 'quote text') },
                                    ].map(btn => (
                                        <button key={btn.title} title={btn.title} onClick={btn.action}
                                            className="p-1.5 rounded hover:bg-slate-200 text-slate-600 transition-colors">
                                            {btn.icon}
                                        </button>
                                    ))}
                                    <span className="w-px h-4 bg-slate-300 mx-1" />
                                    {[
                                        { icon: <Code className="h-3.5 w-3.5" />, title: 'Inline code', action: () => insertMarkdown('`', '`', 'code') },
                                        { icon: <Link2 className="h-3.5 w-3.5" />, title: 'Link', action: () => insertMarkdown('[', '](url)', 'link text') },
                                        { icon: <Table className="h-3.5 w-3.5" />, title: 'Table', action: () => insertBlock('| Column 1 | Column 2 | Column 3 |\n|---|---|---|\n| Cell | Cell | Cell |') },
                                        { icon: <Minus className="h-3.5 w-3.5" />, title: 'Horizontal rule', action: () => insertBlock('---') },
                                    ].map(btn => (
                                        <button key={btn.title} title={btn.title} onClick={btn.action}
                                            className="p-1.5 rounded hover:bg-slate-200 text-slate-600 transition-colors">
                                            {btn.icon}
                                        </button>
                                    ))}
                                    <span className="w-px h-4 bg-slate-300 mx-1" />
                                    <button title="Insert Mermaid diagram" onClick={() => insertBlock('```mermaid\nflowchart LR\n    A[Start] --> B[End]\n```')}
                                        className="px-1.5 py-1 rounded hover:bg-slate-200 text-slate-600 text-micro font-medium transition-colors">
                                        ◈ Diagram
                                    </button>
                                    <div className="ml-auto">
                                        <button title="Markdown cheatsheet" onClick={() => setShowCheatsheet(v => !v)}
                                            className={cn("flex items-center gap-1 px-2 py-1 rounded text-micro font-medium transition-colors",
                                                showCheatsheet ? "bg-[#f0f6ff] text-[#1e3a5f]" : "hover:bg-slate-200 text-slate-500")}>
                                            <HelpCircle className="h-3.5 w-3.5" />
                                            Guide
                                        </button>
                                    </div>
                                </div>

                                {/* Editor + optional cheatsheet */}
                                <div className="flex flex-1 min-h-0">
                                    <textarea
                                        ref={textareaRef}
                                        className="flex-1 p-5 font-mono text-body bg-white resize-none focus:outline-none"
                                        value={editContent}
                                        onChange={(e) => setEditContent(e.target.value)}
                                        spellCheck={false}
                                    />
                                    {showCheatsheet && (
                                        <div className="w-56 shrink-0 border-l border-slate-200 bg-slate-50 overflow-y-auto p-3 text-micro text-slate-600 space-y-3">
                                            <p className="text-micro font-medium text-[#1e3a5f] uppercase tracking-wide">Markdown Guide</p>
                                            {[
                                                { label: 'Headings', rows: ['# H1', '## H2', '### H3'] },
                                                { label: 'Emphasis', rows: ['**bold**', '_italic_', '~~strikethrough~~'] },
                                                { label: 'Lists', rows: ['- bullet item', '1. numbered item'] },
                                                { label: 'Links & Images', rows: ['[label](url)', '![alt](image-url)'] },
                                                { label: 'Code', rows: ['`inline code`', '```js\ncode block\n```'] },
                                                { label: 'Table', rows: ['| A | B |', '|---|---|', '| 1 | 2 |'] },
                                                { label: 'Blockquote', rows: ['> quoted text'] },
                                                { label: 'Divider', rows: ['---'] },
                                                { label: 'Mermaid diagram', rows: ['```mermaid', 'flowchart LR', '  A --> B', '```'] },
                                            ].map(section => (
                                                <div key={section.label}>
                                                    <p className="font-medium text-slate-700 mb-1">{section.label}</p>
                                                    <div className="bg-white rounded border border-slate-200 px-2 py-1.5 space-y-0.5">
                                                        {section.rows.map((row, i) => (
                                                            <p key={i} className="font-mono text-body text-slate-500 leading-snug">{row}</p>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                        <ScrollArea className="h-full">
                            <div id="wiki-print-content" className="max-w-4xl mx-auto p-8 lg:p-12">
                                {contentLoading ? (
                                    <div className="flex flex-col items-center justify-center h-64 gap-3">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f08a3c]"></div>
                                        <p className="text-body text-slate-500">Loading documentation...</p>
                                    </div>
                                ) : (
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                            code: CodeBlock,
                                            a: WikiLink,
                                            h1: ({ children }) => (
                                                <h1 className="text-display font-medium text-[#1e3a5f] mt-0 mb-4 pb-2 border-b border-[rgba(30,58,95,0.10)]">{children}</h1>
                                            ),
                                            h2: ({ children }) => (
                                                <h2 className="text-heading-1 font-medium text-[#1e3a5f] mt-8 mb-3 pb-1 border-b border-[rgba(30,58,95,0.06)]">{children}</h2>
                                            ),
                                            h3: ({ children }) => (
                                                <h3 className="text-heading-2 font-medium text-slate-700 mt-5 mb-2">{children}</h3>
                                            ),
                                            h4: ({ children }) => (
                                                <h4 className="text-heading-3 font-medium text-slate-700 mt-4 mb-1">{children}</h4>
                                            ),
                                            p: ({ children }) => (
                                                <p className="text-body text-slate-700 leading-relaxed mb-3">{children}</p>
                                            ),
                                            ul: ({ children }) => (
                                                <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>
                                            ),
                                            ol: ({ children }) => (
                                                <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>
                                            ),
                                            li: ({ children }) => (
                                                <li className="text-body text-slate-700">{children}</li>
                                            ),
                                            blockquote: ({ children }) => (
                                                <blockquote className="border-l-4 border-[rgba(30,58,95,0.20)] pl-4 my-4 text-body text-slate-500 italic">{children}</blockquote>
                                            ),
                                            hr: () => <hr className="my-6 border-slate-200" />,
                                            strong: ({ children }) => (
                                                <strong className="font-medium text-slate-800">{children}</strong>
                                            ),
                                            em: ({ children }) => (
                                                <em className="italic text-slate-600">{children}</em>
                                            ),
                                            table: ({ children }) => (
                                                <div className="overflow-x-auto my-6">
                                                    <table className="min-w-full border-collapse border border-slate-300 text-body">
                                                        {children}
                                                    </table>
                                                </div>
                                            ),
                                            thead: ({ children }) => (
                                                <thead className="bg-[#f0f6ff]">{children}</thead>
                                            ),
                                            th: ({ children }) => (
                                                <th className="border border-slate-300 px-4 py-2 text-left text-body font-medium text-[#1e3a5f]">{children}</th>
                                            ),
                                            td: ({ children }) => (
                                                <td className="border border-slate-300 px-4 py-2 text-body">{children}</td>
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
            </SplitPane>
        </SplitPaneGroup>}
        </div>
    );
}
