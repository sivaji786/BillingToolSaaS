import React, { useCallback, useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Link as LinkIcon,
  Check,
  X,
} from 'lucide-react';
import { useInlineCms } from '../../contexts/InlineCmsContext';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  slug: string;
  field: string;
  lang: string;
  value: string;
  className?: string;
}

// ---------------------------------------------------------------------------
// Compact toolbar for the inline rich editor
// ---------------------------------------------------------------------------

function RichToolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null;

  const toolbarBtn = (
    label: string,
    isActive: boolean,
    onClick: () => void,
    icon: React.ReactNode,
  ) => (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={[
        'rounded p-1 text-gray-600 transition-colors hover:bg-purple-100 hover:text-purple-700',
        isActive ? 'bg-purple-100 text-purple-700' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {icon}
    </button>
  );

  const setLink = () => {
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('URL', prev ?? '');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 rounded-t-md border border-b-0 border-purple-300 bg-purple-50 px-2 py-1">
      {toolbarBtn('Bold', editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), <Bold className="h-3.5 w-3.5" />)}
      {toolbarBtn('Italic', editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), <Italic className="h-3.5 w-3.5" />)}
      {toolbarBtn('Underline', editor.isActive('underline'), () => editor.chain().focus().toggleUnderline().run(), <UnderlineIcon className="h-3.5 w-3.5" />)}
      <div className="mx-1 h-4 w-px bg-purple-300" aria-hidden="true" />
      {toolbarBtn('Bullet list', editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run(), <List className="h-3.5 w-3.5" />)}
      {toolbarBtn('Numbered list', editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run(), <ListOrdered className="h-3.5 w-3.5" />)}
      <div className="mx-1 h-4 w-px bg-purple-300" aria-hidden="true" />
      {toolbarBtn('Link', editor.isActive('link'), setLink, <LinkIcon className="h-3.5 w-3.5" />)}
    </div>
  );
}

// ---------------------------------------------------------------------------
// InlineEditableRich
// ---------------------------------------------------------------------------

export function InlineEditableRich({ slug, field, lang, value, className }: Props) {
  const { editMode, patchField } = useInlineCms();

  const [displayHtml, setDisplayHtml] = useState(value);
  const [isEditing, setIsEditing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Sync when the prop changes externally (language switch)
  useEffect(() => {
    if (!isEditing) {
      setDisplayHtml(value);
    }
  }, [value, isEditing]);

  // ---------------------------------------------------------------------------
  // Tiptap editor — only created while editing
  // ---------------------------------------------------------------------------
  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({ underline: false }),
        Underline,
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        Image.configure({ inline: true, allowBase64: true }),
        Link.configure({
          openOnClick: false,
          HTMLAttributes: { class: 'text-purple-600 underline cursor-pointer' },
        }),
      ],
      content: isEditing ? displayHtml : '',
      editorProps: {
        attributes: {
          class:
            'prose prose-sm dark:prose-invert max-w-none p-3 min-h-[120px] focus:outline-none',
        },
      },
    },
    [isEditing], // re-initialise when edit mode toggles
  );

  // Seed editor content when it first mounts
  useEffect(() => {
    if (isEditing && editor && !editor.isDestroyed) {
      editor.commands.setContent(displayHtml, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, editor]);

  const handleDoubleClick = useCallback(() => {
    if (!editMode) return;
    setIsEditing(true);
  }, [editMode]);

  const handleSave = useCallback(async () => {
    if (!editor) return;
    const html = editor.getHTML();
    setIsSaving(true);
    try {
      await patchField(slug, lang, field, html);
      setDisplayHtml(html);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  }, [editor, field, lang, patchField, slug]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
  }, []);

  // ---------------------------------------------------------------------------
  // View mode
  // ---------------------------------------------------------------------------

  if (!editMode) {
    return (
      <div
        className={className}
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: displayHtml }}
      />
    );
  }

  // ---------------------------------------------------------------------------
  // Edit mode — active Tiptap editor
  // ---------------------------------------------------------------------------

  if (isEditing) {
    return (
      <div className="w-full">
        <RichToolbar editor={editor} />
        <div
          className="w-full rounded-b-md border border-purple-300 bg-white"
          style={{ minHeight: '120px' }}
        >
          <EditorContent editor={editor} />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 rounded-md bg-purple-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:opacity-60"
          >
            {isSaving ? (
              <>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  style={{ animation: 'cms-spin 0.8s linear infinite' }}
                  aria-hidden="true"
                >
                  <circle cx="7" cy="7" r="5.5" stroke="white" strokeWidth="2" strokeDasharray="20 14" />
                </svg>
                Saving…
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" />
                Save
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSaving}
            className="flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-60"
          >
            <X className="h-3.5 w-3.5" />
            Cancel
          </button>
        </div>
        <style>{`@keyframes cms-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Edit mode — hoverable view
  // ---------------------------------------------------------------------------

  return (
    <div
      className={[
        className,
        'relative cursor-text transition-all',
        isHovered ? 'outline-dashed outline-2 outline-purple-400/50' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ borderRadius: isHovered ? '4px' : undefined }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDoubleClick={handleDoubleClick}
    >
      {/* Tooltip hint */}
      {isHovered && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-6 right-0 z-10 whitespace-nowrap rounded bg-purple-700 px-2 py-0.5 text-xs text-white"
        >
          Double-click to edit
        </span>
      )}
      {/* eslint-disable-next-line react/no-danger */}
      <div dangerouslySetInnerHTML={{ __html: displayHtml }} />
    </div>
  );
}
