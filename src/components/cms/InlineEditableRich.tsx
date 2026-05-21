import React, { useCallback, useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { Check, X } from 'lucide-react';
import { useInlineCms } from '../../contexts/InlineCmsContext';
import { MenuBar, createEditorExtensions } from '../ui/RichTextEditor';

interface Props {
  slug: string;
  field: string;
  lang: string;
  value: string;
  className?: string;
}

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

  const editor = useEditor(
    {
      extensions: createEditorExtensions(),
      content: isEditing ? displayHtml : '',
      editorProps: {
        attributes: {
          class: 'prose prose-sm dark:prose-invert max-w-none p-4 min-h-[150px] focus:outline-none',
        },
      },
    },
    [isEditing],
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

  // View mode — no edit UI at all
  if (!editMode) {
    return (
      <div
        className={className}
        dangerouslySetInnerHTML={{ __html: displayHtml }}
      />
    );
  }

  // Edit mode — active Tiptap editor with full toolbar
  if (isEditing) {
    return (
      <div className="w-full">
        <div className="border rounded-md bg-background">
          <MenuBar editor={editor} />
          <EditorContent editor={editor} />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 rounded-md bg-purple-600 px-3 py-1.5 text-body font-medium text-white transition-colors hover:bg-purple-700 disabled:opacity-60"
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
            className="flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-body font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-60"
          >
            <X className="h-3.5 w-3.5" />
            Cancel
          </button>
        </div>
        <style>{`@keyframes cms-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Edit mode — hoverable view (double-click to activate)
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
      {isHovered && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-6 right-0 z-10 whitespace-nowrap rounded bg-purple-700 px-2 py-0.5 text-micro text-white"
        >
          Double-click to edit
        </span>
      )}
      <div dangerouslySetInnerHTML={{ __html: displayHtml }} />
    </div>
  );
}
