import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { useEffect } from 'react'
import './RichTextEditor.css'

function RichTextEditor({ content, onChange }) {
    const editor = useEditor({
        extensions: [StarterKit.configure({ underline: false }), Underline], content: content,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML())
        },
    })

    // Externe Inhaltsänderung (z.B. KI-Import) übernehmen, OHNE neu zu mounten.
    // Nur bei echtem Unterschied → kein Cursor-Sprung/Loop beim Tippen.
    useEffect(() => {
        if (editor && (content || '') !== editor.getHTML()) {
            editor.commands.setContent(content || '', false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [content, editor])

    if (!editor) return null

    return (
        <div className="rich-editor">
            <div className="toolbar">
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={editor.isActive('bold') ? 'active' : ''}
                >
                    <b>B</b>
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={editor.isActive('italic') ? 'active' : ''}
                >
                    <i>I</i>
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    className={editor.isActive('underline') ? 'active' : ''}
                >
                    <u>U</u>
                </button>
                <div className="toolbar-divider" />
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={editor.isActive('orderedList') ? 'active' : ''}
                >
                    1.
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={editor.isActive('bulletList') ? 'active' : ''}
                >
                    •
                </button>
            </div>
            <EditorContent editor={editor} />
        </div>
    )
}

export default RichTextEditor