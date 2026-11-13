import React, { useState, useRef } from 'react';
import { RotateCcw, Copy, Check, Eye, EyeOff, Code, CheckCircle2 } from 'lucide-react';
import { apiRequest } from '../../services/api';

interface EditorPaneProps {
  code: string;
  onChange: (newCode: string) => void;
  onReset: () => void;
  problemId: number;
  saveStatus?: 'saved' | 'saving' | 'dirty' | 'error';
}

export const EditorPane: React.FC<EditorPaneProps> = ({
  code,
  onChange,
  onReset,
  problemId,
  saveStatus = 'saved',
}) => {
  const [showFullCode, setShowFullCode] = useState(false);
  const [fullCodeText, setFullCodeText] = useState('');
  const [isGeneratingFullCode, setIsGeneratingFullCode] = useState(false);
  const [copiedFullCode, setCopiedFullCode] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleShowFullCodeToggle = async () => {
    if (!showFullCode) {
      setIsGeneratingFullCode(true);
      try {
        const res = await apiRequest<{ fullCode: string }>(`/problems/${problemId}/full-code`, {
          method: 'POST',
          body: JSON.stringify({ code }),
        });
        setFullCodeText(res.fullCode);
        setShowFullCode(true);
      } catch {
        alert('Failed to generate full harness code.');
      } finally {
        setIsGeneratingFullCode(false);
      }
    } else {
      setShowFullCode(false);
    }
  };

  const handleCopyFullCode = () => {
    navigator.clipboard.writeText(fullCodeText);
    setCopiedFullCode(true);
    setTimeout(() => setCopiedFullCode(false), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;

      const newCode = code.substring(0, start) + '    ' + code.substring(end);
      onChange(newCode);

      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 4;
      }, 0);
    }
  };

  const lines = (showFullCode ? fullCodeText : code).split('\n');

  return (
    <div className="h-full flex flex-col bg-canvas overflow-hidden transition-colors">
      {/* Editor Header Toolbar */}
      <div className="h-10 bg-surface px-3 flex items-center justify-between gap-3 select-none shrink-0 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-elevated text-xs font-mono text-text-primary border border-border-subtle">
            <Code className="w-3.5 h-3.5 text-primary" />
            <span>C++ 17 (g++ -O2)</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleShowFullCodeToggle}
            disabled={isGeneratingFullCode}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-colors border ${
              showFullCode
                ? 'bg-primary-subtle text-primary border-primary/40'
                : 'bg-surface-elevated text-text-muted hover:text-text-primary border-border-subtle'
            }`}
            title="Inspect complete compilable code harness"
          >
            {showFullCode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{showFullCode ? 'Hide Full Code' : 'Harness View'}</span>
          </button>

          {showFullCode && (
            <button
              type="button"
              onClick={handleCopyFullCode}
              className="px-2.5 py-1 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-colors bg-surface-elevated text-text-muted hover:text-text-primary border border-border-subtle"
              title="Copy complete standalone C++ file"
            >
              {copiedFullCode ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedFullCode ? 'Copied' : 'Copy'}</span>
            </button>
          )}

          {!showFullCode && (
            <button
              type="button"
              onClick={onReset}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary bg-surface-elevated hover:bg-surface-high transition-colors border border-border-subtle"
              title="Reset code to default stub"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Editor Main Canvas with Line Numbers */}
      <div className="flex-1 relative flex overflow-hidden font-mono text-[13px] bg-canvas">
        {/* Line Numbers Column */}
        <div className="w-12 select-none py-3 text-right pr-3 bg-surface-subtle border-r border-border-subtle text-text-muted font-mono text-xs leading-6 shrink-0">
          {lines.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        {/* Text Editing Area */}
        <div className="flex-1 relative overflow-auto">
          {showFullCode ? (
            <pre className="p-3 text-text-primary font-mono text-[13px] leading-6 whitespace-pre selection:bg-primary/20 select-text">
              {fullCodeText}
            </pre>
          ) : (
            <textarea
              ref={textareaRef}
              value={code}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              autoCapitalize="off"
              autoComplete="off"
              className="w-full h-full p-3 bg-transparent text-text-primary font-mono text-[13px] leading-6 resize-none focus:outline-none selection:bg-primary/20"
            />
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="h-7 bg-surface px-3 flex items-center justify-between text-xs font-mono text-text-muted border-t border-border-subtle select-none">
        <div
          className={`flex items-center gap-1.5 ${
            saveStatus === 'error'
              ? 'text-danger'
              : saveStatus === 'saving' || saveStatus === 'dirty'
              ? 'text-warning'
              : 'text-success'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>
            {saveStatus === 'saving'
              ? 'Saving draft...'
              : saveStatus === 'dirty'
              ? 'Unsaved changes...'
              : saveStatus === 'error'
              ? 'Autosave retry pending'
              : 'Draft saved to database'}
          </span>
        </div>
        <div>
          <span>Ln {lines.length}</span>
        </div>
      </div>
    </div>
  );
};
