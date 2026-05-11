import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';
import { useInlineCms } from '../../contexts/InlineCmsContext';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  slug: string;
  field: string;
  lang: string;
  value: string;
  multiline?: boolean;
  className?: string;
  as?: keyof React.JSX.IntrinsicElements;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type SaveState = 'idle' | 'saving' | 'saved';

// ---------------------------------------------------------------------------
// InlineEditableText
// ---------------------------------------------------------------------------

export function InlineEditableText({
  slug,
  field,
  lang,
  value,
  multiline = false,
  className,
  as: Tag = 'span',
}: Props) {
  const { editMode, patchField, isSavingField } = useInlineCms();

  // Local displayed value — kept in sync with the `value` prop (e.g. lang switch)
  const [displayValue, setDisplayValue] = useState(value);
  // Value at the moment the user started editing — used for revert on Escape
  const [editingValue, setEditingValue] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');

  const editableRef = useRef<HTMLSpanElement | HTMLTextAreaElement | null>(null);
  const savedFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveKey = `${slug}:${field}`;

  // Sync display value when the prop changes externally (language switch, etc.)
  useEffect(() => {
    if (!isEditing) {
      setDisplayValue(value);
    }
  }, [value, isEditing]);

  // Reflect isSavingField in local saveState
  useEffect(() => {
    if (isSavingField(saveKey)) {
      setSaveState('saving');
    }
  }, [isSavingField, saveKey]);

  // Enter editing
  const handleDoubleClick = useCallback(() => {
    if (!editMode) return;
    setEditingValue(displayValue);
    setIsEditing(true);
  }, [editMode, displayValue]);

  // Focus the contenteditable after entering edit mode
  useEffect(() => {
    if (isEditing && editableRef.current) {
      const el = editableRef.current as HTMLElement;
      el.focus();
      // Place caret at end
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [isEditing]);

  // Commit save
  const commitSave = useCallback(
    async (newText: string) => {
      if (newText === displayValue) {
        // No change — just close
        setIsEditing(false);
        setEditingValue(null);
        return;
      }

      setDisplayValue(newText);
      setIsEditing(false);
      setEditingValue(null);
      setSaveState('saving');

      try {
        await patchField(slug, lang, field, newText);
        setSaveState('saved');
        if (savedFlashTimer.current) clearTimeout(savedFlashTimer.current);
        savedFlashTimer.current = setTimeout(() => setSaveState('idle'), 1500);
      } catch {
        // patchField already toasts; revert display value
        setDisplayValue(displayValue);
        setSaveState('idle');
      }
    },
    [displayValue, field, lang, patchField, slug],
  );

  // Revert
  const revert = useCallback(() => {
    setIsEditing(false);
    setEditingValue(null);
    setDisplayValue(displayValue);
  }, [displayValue]);

  // Cleanup flash timer on unmount
  useEffect(
    () => () => {
      if (savedFlashTimer.current) clearTimeout(savedFlashTimer.current);
    },
    [],
  );

  // ---------------------------------------------------------------------------
  // Render: view mode
  // ---------------------------------------------------------------------------

  if (!editMode) {
    const ViewTag = Tag as React.ElementType;
    return <ViewTag className={className}>{displayValue}</ViewTag>;
  }

  // ---------------------------------------------------------------------------
  // Render: edit mode — active inline editor
  // ---------------------------------------------------------------------------

  if (isEditing) {
    const sharedEditProps = {
      ref: editableRef as React.Ref<HTMLSpanElement>,
      suppressContentEditableWarning: true,
      contentEditable: true as const,
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          revert();
        }
        if (e.key === 'Enter' && !multiline) {
          e.preventDefault();
          const el = editableRef.current as HTMLElement;
          commitSave(el?.innerText ?? '');
        }
      },
      onBlur: (e: React.FocusEvent) => {
        const el = e.currentTarget as HTMLElement;
        commitSave(el.innerText ?? '');
      },
      style: {
        outline: '2px dashed #a855f7',
        borderRadius: '4px',
        minWidth: '2em',
        display: 'inline-block',
        whiteSpace: multiline ? ('pre-wrap' as const) : ('nowrap' as const),
        cursor: 'text',
      },
      className,
    };

    return (
      <span style={{ position: 'relative', display: 'inline' }}>
        <span {...sharedEditProps}>{editingValue}</span>
        {/* Saving indicator */}
        {saveState === 'saving' && (
          <span
            aria-label="Saving"
            style={{
              display: 'inline-block',
              marginLeft: '4px',
              verticalAlign: 'middle',
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              style={{ animation: 'cms-spin 0.8s linear infinite' }}
              aria-hidden="true"
            >
              <circle cx="7" cy="7" r="5.5" stroke="#f59e0b" strokeWidth="2" strokeDasharray="20 14" />
            </svg>
            <style>{`@keyframes cms-spin { to { transform: rotate(360deg); } }`}</style>
          </span>
        )}
      </span>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: edit mode — hoverable view
  // ---------------------------------------------------------------------------

  const HoverTag = Tag as React.ElementType;

  return (
    <span style={{ position: 'relative', display: 'inline' }}>
      <HoverTag
        className={[
          className,
          isHovered
            ? 'outline-dashed outline-2 outline-purple-400/50'
            : '',
        ]
          .filter(Boolean)
          .join(' ')}
        style={{
          borderRadius: isHovered ? '4px' : undefined,
          cursor: isHovered ? 'text' : undefined,
          position: 'relative',
          display: 'inline',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onDoubleClick={handleDoubleClick}
        title={isHovered ? 'Double-click to edit' : undefined}
      >
        {displayValue}
        {/* Tiny hint tooltip on hover */}
        {isHovered && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: '-1.1em',
              right: 0,
              fontSize: '10px',
              background: '#7c3aed',
              color: '#fff',
              borderRadius: '3px',
              padding: '1px 4px',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              zIndex: 10,
            }}
          >
            ✎
          </span>
        )}
      </HoverTag>

      {/* Post-save green checkmark flash */}
      {saveState === 'saved' && (
        <span
          aria-label="Saved"
          style={{
            display: 'inline-block',
            marginLeft: '4px',
            verticalAlign: 'middle',
            color: '#16a34a',
          }}
        >
          ✓
        </span>
      )}

      {/* Saving spinner (for saves that finish without re-entering edit mode) */}
      {saveState === 'saving' && (
        <span
          aria-label="Saving"
          style={{
            display: 'inline-block',
            marginLeft: '4px',
            verticalAlign: 'middle',
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            style={{ animation: 'cms-spin 0.8s linear infinite' }}
            aria-hidden="true"
          >
            <circle cx="7" cy="7" r="5.5" stroke="#f59e0b" strokeWidth="2" strokeDasharray="20 14" />
          </svg>
          <style>{`@keyframes cms-spin { to { transform: rotate(360deg); } }`}</style>
        </span>
      )}
    </span>
  );
}
