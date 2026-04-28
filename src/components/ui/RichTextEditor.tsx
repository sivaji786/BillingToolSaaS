
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import Highlight from '@tiptap/extension-highlight';
import { Button } from './button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "./select";
import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    List,
    ListOrdered,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify,
    RotateCcw,
    ImagePlus,
    Link as LinkIcon,
    Undo,
    Redo,
    Strikethrough,
    Code,
    Terminal,
    Quote,
    Subscript as SubscriptIcon,
    Superscript as SuperscriptIcon,
    Highlighter,
    Type
} from 'lucide-react';
import { useEffect, useRef } from 'react';

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

const MenuBar = ({ editor }: { editor: any }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!editor) {
        return null;
    }

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Check if file is an image
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        // Check file size (limit to 2MB)
        if (file.size > 2 * 1024 * 1024) {
            alert('Image size should be less than 2MB');
            return;
        }

        // Convert to base64 and insert
        const reader = new FileReader();
        reader.onload = (e) => {
            const base64 = e.target?.result as string;
            editor.chain().focus().setImage({ src: base64 }).run();
        };
        reader.readAsDataURL(file);

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const setLink = () => {
        const previousUrl = editor.getAttributes('link').href;
        const url = window.prompt('URL', previousUrl);

        // cancelled
        if (url === null) {
            return;
        }

        // empty
        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }

        // update link
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    };

    return (
        <div className="border-b bg-muted/40 p-1 flex flex-wrap gap-0.5 rounded-t-md items-center">
            {/* History */}
            <div className="flex gap-0.5 px-1">
                <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} type="button" title="Undo">
                    <Undo className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} type="button" title="Redo">
                    <Redo className="h-4 w-4" />
                </Button>
            </div>

            <div className="w-px h-6 bg-border mx-0.5" />

            {/* Headings */}
            <div className="px-1 min-w-[120px]">
                <Select
                    value={
                        editor.isActive('heading', { level: 1 }) ? 'h1' :
                        editor.isActive('heading', { level: 2 }) ? 'h2' :
                        editor.isActive('heading', { level: 3 }) ? 'h3' : 'p'
                    }
                    onValueChange={(val) => {
                        if (val === 'p') editor.chain().focus().setParagraph().run();
                        else if (val === 'h1') editor.chain().focus().toggleHeading({ level: 1 }).run();
                        else if (val === 'h2') editor.chain().focus().toggleHeading({ level: 2 }).run();
                        else if (val === 'h3') editor.chain().focus().toggleHeading({ level: 3 }).run();
                    }}
                >
                    <SelectTrigger size="sm" className="h-8 border-none bg-transparent shadow-none hover:bg-muted">
                        <SelectValue placeholder="Text Style" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="p">Paragraph</SelectItem>
                        <SelectItem value="h1">Heading 1</SelectItem>
                        <SelectItem value="h2">Heading 2</SelectItem>
                        <SelectItem value="h3">Heading 3</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="w-px h-6 bg-border mx-0.5" />

            {/* Basic Formatting */}
            <div className="flex flex-wrap gap-0.5 px-1">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    disabled={!editor.can().chain().focus().toggleBold().run()}
                    className={editor.isActive('bold') ? 'bg-muted' : ''}
                    type="button"
                    title="Bold"
                >
                    <Bold className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    disabled={!editor.can().chain().focus().toggleItalic().run()}
                    className={editor.isActive('italic') ? 'bg-muted' : ''}
                    type="button"
                    title="Italic"
                >
                    <Italic className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    className={editor.isActive('strike') ? 'bg-muted' : ''}
                    type="button"
                    title="Strikethrough"
                >
                    <Strikethrough className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleCode().run()}
                    className={editor.isActive('code') ? 'bg-muted' : ''}
                    type="button"
                    title="Inline Code"
                >
                    <Code className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    className={editor.isActive('underline') ? 'bg-muted' : ''}
                    type="button"
                    title="Underline"
                >
                    <UnderlineIcon className="h-4 w-4" />
                </Button>
            </div>

            <div className="w-px h-6 bg-border mx-0.5" />

            {/* Colors & Highlight */}
            <div className="flex gap-0.5 px-1">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                        const color = window.prompt('Color (hex or name)', editor.getAttributes('textStyle').color || '#000000');
                        if (color) editor.chain().focus().setColor(color).run();
                    }}
                    type="button"
                    title="Text Color"
                >
                    <Type className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleHighlight().run()}
                    className={editor.isActive('highlight') ? 'bg-muted' : ''}
                    type="button"
                    title="Highlight"
                >
                    <Highlighter className="h-4 w-4" />
                </Button>
            </div>

            <div className="w-px h-6 bg-border mx-0.5" />

            {/* Link */}
            <div className="px-1">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={setLink}
                    className={editor.isActive('link') ? 'bg-muted' : ''}
                    type="button"
                    title="Add Link"
                >
                    <LinkIcon className="h-4 w-4" />
                </Button>
            </div>

            <div className="w-px h-6 bg-border mx-0.5" />

            {/* Sub/Super script */}
            <div className="flex gap-0.5 px-1">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleSuperscript().run()}
                    className={editor.isActive('superscript') ? 'bg-muted' : ''}
                    type="button"
                    title="Superscript"
                >
                    <SuperscriptIcon className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleSubscript().run()}
                    className={editor.isActive('subscript') ? 'bg-muted' : ''}
                    type="button"
                    title="Subscript"
                >
                    <SubscriptIcon className="h-4 w-4" />
                </Button>
            </div>

            <div className="w-px h-6 bg-border mx-0.5" />

            {/* Alignment */}
            <div className="flex flex-wrap gap-0.5 px-1">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().setTextAlign('left').run()}
                    className={editor.isActive({ textAlign: 'left' }) ? 'bg-muted' : ''}
                    type="button"
                    title="Align Left"
                >
                    <AlignLeft className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().setTextAlign('center').run()}
                    className={editor.isActive({ textAlign: 'center' }) ? 'bg-muted' : ''}
                    type="button"
                    title="Align Center"
                >
                    <AlignCenter className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().setTextAlign('right').run()}
                    className={editor.isActive({ textAlign: 'right' }) ? 'bg-muted' : ''}
                    type="button"
                    title="Align Right"
                >
                    <AlignRight className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                    className={editor.isActive({ textAlign: 'justify' }) ? 'bg-muted' : ''}
                    type="button"
                    title="Justify"
                >
                    <AlignJustify className="h-4 w-4" />
                </Button>
            </div>

            <div className="w-px h-6 bg-border mx-0.5" />

            {/* Lists & Blocks */}
            <div className="flex flex-wrap gap-0.5 px-1">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={editor.isActive('bulletList') ? 'bg-muted' : ''}
                    type="button"
                    title="Bullet List"
                >
                    <List className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={editor.isActive('orderedList') ? 'bg-muted' : ''}
                    type="button"
                    title="Ordered List"
                >
                    <ListOrdered className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    className={editor.isActive('blockquote') ? 'bg-muted' : ''}
                    type="button"
                    title="Blockquote"
                >
                    <Quote className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                    className={editor.isActive('codeBlock') ? 'bg-muted' : ''}
                    type="button"
                    title="Code Block"
                >
                    <Terminal className="h-4 w-4" />
                </Button>
            </div>

            <div className="w-px h-6 bg-border mx-0.5" />

            {/* Image */}
            <div className="px-1">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    type="button"
                    title="Upload Image"
                >
                    <ImagePlus className="h-4 w-4" />
                </Button>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                />
            </div>

            <div className="grow" />

            {/* Reset / Clear */}
            <div className="px-1">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().unsetAllMarks().run()}
                    type="button"
                    title="Clear Formatting"
                >
                    <RotateCcw className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
};

export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                underline: false, // Disable underline in StarterKit to avoid duplicate
            }),
            Underline,
            TextStyle,
            Color,
            Subscript,
            Superscript,
            Highlight.configure({ multicolor: true }),
            Image.configure({
                inline: true,
                allowBase64: true,
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-purple-600 underline cursor-pointer',
                },
            }),
        ],
        content: value,
        editorProps: {
            attributes: {
                class: 'prose prose-sm dark:prose-invert max-w-none p-4 min-h-[150px] focus:outline-none',
            },
        },
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
    });

    // Update content if value changes externally (e.g. initial load or page switch)
    useEffect(() => {
        if (!editor || value === undefined) return;

        const currentHtml = editor.getHTML();
        if (value !== currentHtml) {
            // Use a more robust check to avoid unnecessary updates and cursor jumps
            // If the editor is not focused, it's safer to update
            if (!editor.isFocused || (value.length > 0 && currentHtml === '<p></p>')) {
                editor.commands.setContent(value, false);
            }
        }
    }, [value, editor]);

    return (
        <div className={`border rounded-md bg-background ${className}`}>
            <MenuBar editor={editor} />
            <EditorContent editor={editor} />
        </div>
    );
}
