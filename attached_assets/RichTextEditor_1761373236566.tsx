import { useRef, useEffect } from 'react';
import { List, ListOrdered } from 'lucide-react';
import { Button } from './ui/button';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const handleBulletList = () => {
    execCommand('insertUnorderedList');
  };

  const handleNumberedList = () => {
    execCommand('insertOrderedList');
  };

  return (
    <div className={className}>
      <div className="border border-border rounded-lg overflow-hidden">
        {/* Toolbar */}
        <div className="flex gap-1 p-2 bg-muted/30 border-b border-border">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleBulletList}
            className="h-8 w-8 p-0"
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleNumberedList}
            className="h-8 w-8 p-0"
            title="Numbered List"
          >
            <ListOrdered className="w-4 h-4" />
          </Button>
        </div>

        {/* Editor */}
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          className="min-h-[120px] p-3 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 bg-background prose-lists"
          data-placeholder={placeholder}
          style={{
            whiteSpace: 'pre-wrap',
            color: 'var(--foreground)',
          }}
        />
      </div>

      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
        .prose-lists ul,
        .prose-lists ol {
          margin-left: 1.5rem;
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
          padding-left: 0.5rem;
        }
        .prose-lists ul {
          list-style-type: disc;
          list-style-position: outside;
        }
        .prose-lists ol {
          list-style-type: decimal;
          list-style-position: outside;
        }
        .prose-lists li {
          margin-bottom: 0.25rem;
          display: list-item;
        }
      `}</style>
    </div>
  );
}
