import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';
import type { CmsNavItem } from '../services/adminApi';

interface NavDropdownProps {
    item: CmsNavItem;
    onNavigate: (screen: string, slug?: string) => void;
    isMobile?: boolean;
}

function resolveHref(item: CmsNavItem): string | null {
    if (item.link_url && /^(https?:|mailto:|tel:|ftp:)/i.test(item.link_url)) {
        return item.link_url;
    }
    return null;
}

function NavItemLink({
    item,
    onNavigate,
    className,
}: {
    item: CmsNavItem;
    onNavigate: (screen: string, slug?: string) => void;
    className?: string;
}) {
    const href = resolveHref(item);

    if (href) {
        return (
            <a
                href={href}
                target={item.link_target ?? '_self'}
                rel={item.link_target === '_blank' ? 'noopener noreferrer' : undefined}
                className={className}
            >
                {item.nav_label || item.title}
            </a>
        );
    }

    return (
        <button
            type="button"
            onClick={() => onNavigate('cmsPage', item.slug)}
            className={className}
        >
            {item.nav_label || item.title}
        </button>
    );
}

// ─── Desktop dropdown ─────────────────────────────────────────────────────────

function DesktopDropdown({ item, onNavigate }: { item: CmsNavItem; onNavigate: (s: string, sl?: string) => void }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const hasChildren = item.children && item.children.length > 0;

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(o => !o); }
        if (e.key === 'Escape') setOpen(false);
    }

    if (!hasChildren) {
        return (
            <NavItemLink
                item={item}
                onNavigate={onNavigate}
                className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors px-1 py-0.5"
            />
        );
    }

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                aria-haspopup="true"
                aria-expanded={open}
                onMouseEnter={() => setOpen(true)}
                onMouseLeave={() => setOpen(false)}
                onFocus={() => setOpen(true)}
                onKeyDown={handleKeyDown}
                className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary transition-colors px-1 py-0.5"
            >
                {item.nav_label || item.title}
                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', open && 'rotate-180')} />
            </button>

            {open && (
                <div
                    role="menu"
                    onMouseEnter={() => setOpen(true)}
                    onMouseLeave={() => setOpen(false)}
                    className="absolute left-0 top-full mt-1 z-50 min-w-[180px] rounded-lg border bg-popover shadow-md py-1 animate-in fade-in-0 zoom-in-95"
                >
                    {item.children.map(child => (
                        <NavItemLink
                            key={child.id}
                            item={child}
                            onNavigate={(s, sl) => { onNavigate(s, sl); setOpen(false); }}
                            className="block w-full text-left px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Mobile accordion ─────────────────────────────────────────────────────────

function MobileAccordion({ item, onNavigate, onClose }: { item: CmsNavItem; onNavigate: (s: string, sl?: string) => void; onClose: () => void }) {
    const [open, setOpen] = useState(false);
    const hasChildren = item.children && item.children.length > 0;
    const linkClass = 'block w-full text-left px-4 py-3 text-sm font-medium hover:bg-accent transition-colors';

    if (!hasChildren) {
        return (
            <NavItemLink
                item={item}
                onNavigate={(s, sl) => { onNavigate(s, sl); onClose(); }}
                className={linkClass}
            />
        );
    }

    return (
        <div>
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className={cn(linkClass, 'flex items-center justify-between')}
            >
                {item.nav_label || item.title}
                <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
            </button>
            {open && (
                <div className="bg-muted/40 border-l-2 border-primary/20 ml-4">
                    {item.children.map(child => (
                        <NavItemLink
                            key={child.id}
                            item={child}
                            onNavigate={(s, sl) => { onNavigate(s, sl); onClose(); }}
                            className="block w-full text-left px-4 py-2.5 text-sm text-muted-foreground hover:text-primary transition-colors"
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export { DesktopDropdown, MobileAccordion };
export type { NavDropdownProps };
