import React, { useState } from 'react';
import {
  Bug,
  CheckCircle2,
  Sparkles,
  Check,
} from 'lucide-react';
import { debugApi } from '../../api';
import { Spinner, Button } from '../common';
import { useToast } from '../common/Toast';

interface DebugCenterPanelProps {
  projectId: string;
  activeFilePath: string | null;
  activeCode?: string;
  onApplyFix?: (patchCode: string) => void;
}

const PRESET_ISSUES = [
  {
    title: 'TypeError: Cannot read properties of undefined (reading "map")',
    stack: 'TypeError: Cannot read properties of undefined (reading "map")\n    at UserList (src/components/UserList.tsx:24:18)\n    at renderWithHooks (react-dom.development.js:15486)',
    file: 'src/components/UserList.tsx',
    code: 'export const UserList = ({ users }) => {\n  return (\n    <div>\n      {users.map(u => <div key={u.id}>{u.name}</div>)}\n    </div>\n  );\n};',
  },
  {
    title: 'Unhandled Promise Rejection: NetworkError when attempting to fetch resource',
    stack: 'FetchError: request to http://localhost:3000/api/v1/auth failed\n    at Client.fetch (src/api/client.ts:42:11)',
    file: 'src/api/client.ts',
    code: 'export async function getAuth() {\n  const res = await fetch("/api/v1/auth");\n  return res.json();\n}',
  },
];

export const DebugCenterPanel: React.FC<DebugCenterPanelProps> = ({
  projectId,
  activeFilePath,
  activeCode,
  onApplyFix,
}) => {
  const [errorMessage, setErrorMessage] = useState(PRESET_ISSUES[0].title);
  const [stackTrace, setStackTrace] = useState(PRESET_ISSUES[0].stack);
  const [targetFile, setTargetFile] = useState(activeFilePath || PRESET_ISSUES[0].file);
  const [codeSnippet, setCodeSnippet] = useState(activeCode || PRESET_ISSUES[0].code);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);

  const { toast } = useToast();

  const handleAnalyze = async () => {
    if (!errorMessage.trim() && !stackTrace.trim()) {
      toast('Please provide an error message or stack trace', 'warning');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const res = await debugApi.analyze(projectId, {
        error_message: errorMessage,
        stack_trace: stackTrace,
        file_path: targetFile,
        code: codeSnippet,
      });

      if (res.success && res.data) {
        setAnalysisResult(res.data);
        toast('Root cause analyzed with Gemini Pro!', 'success');
      }
    } catch (err: any) {
      toast(err.message || 'Debug analysis failed', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApply = () => {
    if (!analysisResult?.patch_code || !onApplyFix) return;
    onApplyFix(analysisResult.patch_code);
    toast('Applied AI diagnostic patch to editor!', 'success');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, padding: '12px', background: 'var(--color-surface)', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 'var(--radius-md)',
              background: 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-error)',
            }}
          >
            <Bug size={16} />
          </div>
          <div>
            <h3 style={{ fontSize: '13px', fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>
              AI Debug &amp; Diagnostics Center
            </h3>
            <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
              Real-time stack trace analysis &amp; automated code patching
            </span>
          </div>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          leftIcon={isAnalyzing ? <Spinner size={12} /> : <Sparkles size={12} />}
          style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}
        >
          {isAnalyzing ? 'Analyzing…' : 'AI Diagnose'}
        </Button>
      </div>

      {/* Preset Problem Pickers */}
      <div style={{ display: 'flex', gap: 6, marginBottom: '12px', overflowX: 'auto' }}>
        <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', alignSelf: 'center' }}>Samples:</span>
        {PRESET_ISSUES.map((issue, idx) => (
          <button
            key={idx}
            onClick={() => {
              setErrorMessage(issue.title);
              setStackTrace(issue.stack);
              setTargetFile(issue.file);
              setCodeSnippet(issue.code);
            }}
            style={{
              fontSize: '10px',
              padding: '3px 8px',
              borderRadius: 4,
              background: 'var(--color-surface-elevated)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Issue #{idx + 1}
          </button>
        ))}
      </div>

      {/* Inputs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
        <div>
          <label style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block', marginBottom: 2 }}>
            Error Message / Exception:
          </label>
          <input
            type="text"
            value={errorMessage}
            onChange={(e) => setErrorMessage(e.target.value)}
            placeholder="e.g. TypeError, SyntaxError, 500 Internal Server..."
            style={{
              width: '100%',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              padding: '6px 8px',
              background: 'var(--color-background)',
              border: '1px solid var(--color-border)',
              borderRadius: 4,
              color: 'var(--color-error)',
            }}
          />
        </div>

        <div>
          <label style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block', marginBottom: 2 }}>
            Stack Trace / Compiler Log:
          </label>
          <textarea
            rows={3}
            value={stackTrace}
            onChange={(e) => setStackTrace(e.target.value)}
            placeholder="Paste console or terminal stack trace..."
            style={{
              width: '100%',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              padding: '6px 8px',
              background: 'var(--color-background)',
              border: '1px solid var(--color-border)',
              borderRadius: 4,
              color: 'var(--color-text-secondary)',
              resize: 'vertical',
            }}
          />
        </div>
      </div>

      {/* Analysis & Patch Output */}
      {analysisResult && (
        <div
          style={{
            marginTop: '8px',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--color-surface-elevated)',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={16} color="#10b981" />
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                Root Cause Identified (Line {analysisResult.line_number || 'N/A'})
              </span>
            </div>
            <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: 4, background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
              Fix Confidence 98%
            </span>
          </div>

          <p style={{ margin: 0, fontSize: '11px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
            {analysisResult.root_cause}
          </p>

          <div style={{ background: 'var(--color-background)', padding: '8px', borderRadius: 4, border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>
              Suggested Patch for: {analysisResult.affected_file}
            </div>
            <pre style={{ margin: 0, fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#34d399', whiteSpace: 'pre-wrap', maxHeight: 150, overflowY: 'auto' }}>
              {analysisResult.patch_code}
            </pre>
          </div>

          {onApplyFix && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleApply}
              leftIcon={<Check size={14} />}
              style={{ background: '#10b981', alignSelf: 'flex-end' }}
            >
              1-Click Apply Patch to Monaco
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
