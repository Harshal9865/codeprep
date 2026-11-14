import React, { useState, useRef } from 'react';
import { RotateCcw, Copy, Check, Eye, EyeOff, Code, CheckCircle2, AlignLeft, Sparkles } from 'lucide-react';
import { apiRequest } from '../../services/api';
import { HighlightedCode, HighlightedCodeEditor } from '../ui/CodeHighlight';
import { formatCode } from '../../utils/codeFormatter';

interface EditorPaneProps {
  code: string;
  onChange: (newCode: string) => void;
  onReset: () => void;
  problemId: number;
  saveStatus?: 'saved' | 'saving' | 'dirty' | 'error';
  onRunShortcut?: () => void;
  onSubmitShortcut?: () => void;
}

export const EditorPane: React.FC<EditorPaneProps> = ({
  code,
  onChange,
  onReset,
  problemId,
  saveStatus = 'saved',
  onRunShortcut,
  onSubmitShortcut,
}) => {
  const [showFullCode, setShowFullCode] = useState(false);
  const [fullCodeText, setFullCodeText] = useState('');
  const [isGeneratingFullCode, setIsGeneratingFullCode] = useState(false);
  const [copiedFullCode, setCopiedFullCode] = useState(false);
  const [justFormatted, setJustFormatted] = useState(false);
  const [autoFormat, setAutoFormat] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('codeprep_auto_format');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const triggerFormattedToast = () => {
    setJustFormatted(true);
    window.setTimeout(() => setJustFormatted(false), 1500);
  };

  const handleFormatCode = () => {
    if (showFullCode) return;
    const formatted = formatCode(code, 'cpp');
    if (formatted !== code) {
      onChange(formatted);
    }
    triggerFormattedToast();
  };

  const handleToggleAutoFormat = () => {
    setAutoFormat((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('codeprep_auto_format', String(next));
      } catch {
        // Ignore storage quota errors
      }
      return next;
    });
  };

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
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        onSubmitShortcut?.();
      } else {
        onRunShortcut?.();
      }
    }
  };

  const lines = (showFullCode ? fullCodeText : code).split('\n');

  return (
    <div className="h-full flex flex-col bg-canvas overflow-hidden transition-colors">
      {/* Editor Header Toolbar */}
      <div className="h-10 bg-surface/95 px-3 flex items-center justify-between gap-3 select-none shrink-0 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-surface-elevated/80 text-xs font-mono text-text-primary border border-border-subtle">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <Code className="w-3.5 h-3.5 text-primary" />
            <span>C++17 • g++</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {!showFullCode && (
            <>
              <button
                type="button"
                onClick={handleToggleAutoFormat}
                className={`px-2 py-1 rounded-lg text-[11px] font-mono flex items-center gap-1 transition-colors border ${
                  autoFormat
                    ? 'bg-success-subtle text-success border-success/35'
                    : 'bg-surface-elevated text-text-muted hover:text-text-primary border-border-subtle'
                }`}
                title="Automatically fix spacing, indentation & pasted code formatting"
              >
                <Sparkles className="w-3 h-3" />
                <span className="hidden sm:inline">Auto-Format {autoFormat ? 'ON' : 'OFF'}</span>
              </button>

              <button
                type="button"
                onClick={handleFormatCode}
                className="px-2.5 py-1 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-colors bg-surface-elevated text-text-muted hover:text-text-primary border border-border-subtle"
                title="Format code spacing & indentation (Shift+Alt+F)"
              >
                {justFormatted ? (
                  <Check className="w-3.5 h-3.5 text-success" />
                ) : (
                  <AlignLeft className="w-3.5 h-3.5 text-primary" />
                )}
                <span>{justFormatted ? 'Formatted' : 'Format'}</span>
              </button>
            </>
          )}

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
        {showFullCode ? (
          <div className="flex-1 flex overflow-auto">
            <div className="w-12 select-none py-3 text-right pr-3 bg-surface-subtle border-r border-border-subtle text-text-muted font-mono text-xs leading-6 shrink-0">
              {fullCodeText.split('\n').map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
            <HighlightedCode
              code={fullCodeText}
              language="cpp"
              className="p-3 text-[13px] leading-6 flex-1"
            />
          </div>
        ) : (
          <HighlightedCodeEditor
            value={code}
            onChange={onChange}
            onKeyDown={handleKeyDown}
            language="cpp"
            textareaRef={textareaRef}
            showLineNumbers
            paddingClass="p-3"
            autoFormat={autoFormat}
            onFormatted={triggerFormattedToast}
          />
        )}
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
        <div className="flex items-center gap-3">
          <span className="hidden lg:inline text-[11px] text-text-muted/80">
            Ctrl+Space Complete • Shift+Alt+F Format • Ctrl+Enter Run
          </span>
          <span>Ln {lines.length}</span>
        </div>
      </div>
    </div>
  );
};
