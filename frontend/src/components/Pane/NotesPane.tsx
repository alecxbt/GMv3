import { useEffect, useState, useRef } from 'react';
import type { Pane } from '../../../shared/src/types';

interface NotesPaneProps {
  pane: Pane;
}

export function NotesPane({ pane }: NotesPaneProps) {
  const [content, setContent] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load saved notes from localStorage
    const saved = localStorage.getItem(`notes-${pane.id}`);
    if (saved) {
      setContent(saved);
      if (editorRef.current) {
        editorRef.current.innerHTML = saved;
      }
    }
  }, [pane.id]);

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      setContent(html);
      // Auto-save to localStorage
      localStorage.setItem(`notes-${pane.id}`, html);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Rich text shortcuts
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b') {
        e.preventDefault();
        document.execCommand('bold', false);
      } else if (e.key === 'i') {
        e.preventDefault();
        document.execCommand('italic', false);
      } else if (e.key === 'u') {
        e.preventDefault();
        document.execCommand('underline', false);
      }
    }
  };

  return (
    <div className="notes-pane">
      <div
        ref={editorRef}
        contentEditable
        className="notes-editor"
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        suppressContentEditableWarning
        dangerouslySetInnerHTML={{ __html: content }}
      />
      <div className="notes-toolbar">
        <button
          className="notes-toolbar-btn"
          onClick={() => document.execCommand('bold', false)}
          title="Bold (Ctrl+B)"
        >
          <strong>B</strong>
        </button>
        <button
          className="notes-toolbar-btn"
          onClick={() => document.execCommand('italic', false)}
          title="Italic (Ctrl+I)"
        >
          <em>I</em>
        </button>
        <button
          className="notes-toolbar-btn"
          onClick={() => document.execCommand('underline', false)}
          title="Underline (Ctrl+U)"
        >
          <u>U</u>
        </button>
        <button
          className="notes-toolbar-btn"
          onClick={() => {
            const url = prompt('Enter URL:');
            if (url) {
              document.execCommand('createLink', false, url);
            }
          }}
          title="Insert Link"
        >
          🔗
        </button>
      </div>
    </div>
  );
}

