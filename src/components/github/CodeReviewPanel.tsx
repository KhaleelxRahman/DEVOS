import React, { useState } from 'react';
import {
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Check,
} from 'lucide-react';
import { gitApi } from '../../api';
import { useToast } from '../common/Toast';
import { Spinner } from '../common/Spinner';
import { AICodeReviewResult, GitStatus } from '../../types/git';

interface CodeReviewPanelProps {
  projectId: string;
  status: GitStatus | null;
}

export const CodeReviewPanel: React.FC<CodeReviewPanelProps> = ({ projectId, status }) => {
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewResult, setReviewResult] = useState<AICodeReviewResult | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedSuggestion, setExpandedSuggestion] = useState<number | null>(null);
  const { toast } = useToast();

  const handleRunReview = async () => {
    setIsReviewing(true);
    try {
      const res = await gitApi.reviewCode(projectId, {
        staged_files: status?.staged || [],
      });
      if (res.success && res.data) {
        setReviewResult(res.data);
        toast(`Code review completed: Score ${res.data.ready_to_push_score}/100`, 'success');
      }
    } catch (err: any) {
      toast(err.message || 'Code review failed', 'error');
    } finally {
      setIsReviewing(false);
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk?.toLowerCase()) {
      case 'low':
        return '#10b981';
      case 'medium':
        return '#f59e0b';
      case 'high':
        return '#ef4444';
      default:
        return '#38bdf8';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'security':
        return '#ef4444';
      case 'performance':
        return '#f59e0b';
      case 'typescript':
        return '#38bdf8';
      case 'quality':
        return '#a855f7';
      default:
        return '#94a3b8';
    }
  };

  const filteredSuggestions = (reviewResult?.suggestions || []).filter((s) =>
    selectedCategory === 'all' ? true : s.category?.toLowerCase() === selectedCategory
  );

  return (
    <div
      id="ai-code-review-panel"
      style={{
        background: 'rgba(15, 23, 42, 0.65)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {/* Header & Trigger */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ShieldCheck size={14} color="#8b5cf6" />
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            AI Pre-Push Code Review
          </span>
        </div>

        <button
          id="git-run-code-review-btn"
          onClick={handleRunReview}
          disabled={isReviewing}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(56, 189, 248, 0.25))',
            border: '1px solid rgba(139, 92, 246, 0.4)',
            borderRadius: 4,
            padding: '3px 8px',
            fontSize: '11px',
            fontWeight: 600,
            color: '#c084fc',
            cursor: isReviewing ? 'wait' : 'pointer',
          }}
        >
          {isReviewing ? <Spinner size={11} /> : <Sparkles size={11} />}
          <span>{isReviewing ? 'Analyzing Diffs...' : 'Run Review'}</span>
        </button>
      </div>

      {reviewResult ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Score & Risk Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: 6,
              padding: '8px 10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '9px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                  Readiness Score
                </span>
                <span
                  style={{
                    fontSize: '18px',
                    fontWeight: 700,
                    color: reviewResult.ready_to_push_score >= 80 ? '#10b981' : reviewResult.ready_to_push_score >= 60 ? '#f59e0b' : '#ef4444',
                  }}
                >
                  {reviewResult.ready_to_push_score}/100
                </span>
              </div>

              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '3px 8px',
                  borderRadius: 4,
                  background: `rgba(0,0,0,0.4)`,
                  border: `1px solid ${getRiskColor(reviewResult.risk_level)}`,
                  color: getRiskColor(reviewResult.risk_level),
                  fontSize: '11px',
                  fontWeight: 600,
                }}
              >
                {reviewResult.risk_level?.toLowerCase() === 'low' ? (
                  <ShieldCheck size={12} />
                ) : (
                  <ShieldAlert size={12} />
                )}
                <span>{reviewResult.risk_level?.toUpperCase()} RISK</span>
              </div>
            </div>

            <div style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 600 }}>
              {reviewResult.ready_to_push_score >= 70 ? 'Ready to Push' : 'Action Suggested'}
            </div>
          </div>

          {/* Executive Summary */}
          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
            {reviewResult.summary}
          </div>

          {/* Category Filter Pills */}
          <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 2 }}>
            {['all', 'security', 'performance', 'typescript', 'quality'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  background: selectedCategory === cat ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                  border: selectedCategory === cat ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid transparent',
                  borderRadius: 4,
                  padding: '2px 6px',
                  fontSize: '10px',
                  color: selectedCategory === cat ? '#c084fc' : 'var(--color-text-muted)',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Suggestions List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 180, overflowY: 'auto' }}>
            {filteredSuggestions.map((sug, idx) => {
              const isExpanded = expandedSuggestion === idx;
              return (
                <div
                  key={sug.id || idx}
                  style={{
                    background: 'rgba(0, 0, 0, 0.25)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: 4,
                    padding: '6px 8px',
                    fontSize: '11px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  <div
                    onClick={() => setExpandedSuggestion(isExpanded ? null : idx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          fontSize: '9px',
                          fontWeight: 700,
                          padding: '1px 4px',
                          borderRadius: 3,
                          background: `${getCategoryColor(sug.category)}20`,
                          color: getCategoryColor(sug.category),
                          textTransform: 'uppercase',
                        }}
                      >
                        {sug.category}
                      </span>
                      <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {sug.title}
                      </span>
                    </div>

                    <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                      {sug.file ? sug.file.split('/').pop() : ''}
                    </span>
                  </div>

                  {isExpanded && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                      <div style={{ color: 'var(--color-text-secondary)', fontSize: '11px' }}>
                        {sug.description}
                      </div>

                      {sug.suggested_fix && (
                        <div
                          style={{
                            background: 'rgba(0, 0, 0, 0.5)',
                            padding: '4px 6px',
                            borderRadius: 4,
                            fontFamily: 'monospace',
                            fontSize: '10px',
                            color: '#34d399',
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {sug.suggested_fix}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {filteredSuggestions.length === 0 && (
              <div style={{ color: 'var(--color-text-muted)', fontSize: '11px', textAlign: 'center', padding: '6px' }}>
                No suggestions in this category.
              </div>
            )}
          </div>

          {/* Passed Checks */}
          {reviewResult.passed_checks && reviewResult.passed_checks.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4 }}>
              <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 600 }}>Passed Checks:</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {reviewResult.passed_checks.map((chk, idx) => (
                  <span
                    key={idx}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3,
                      fontSize: '9px',
                      color: '#a7f3d0',
                      background: 'rgba(16, 185, 129, 0.1)',
                      padding: '1px 5px',
                      borderRadius: 3,
                    }}
                  >
                    <Check size={10} /> {chk}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          style={{
            padding: '12px',
            textAlign: 'center',
            fontSize: '11px',
            color: 'var(--color-text-muted)',
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: 6,
          }}
        >
          Run AI Code Review before pushing to detect vulnerabilities, dead code, type gaps, and performance bottlenecks.
        </div>
      )}
    </div>
  );
};
