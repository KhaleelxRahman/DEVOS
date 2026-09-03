import React, { useState, useRef } from 'react';
import { Sparkles, Sliders, Code2 } from 'lucide-react';
import { Button, Spinner } from '../common';
import { VoiceButton } from './VoiceButton';

interface PromptInputProps {
  prompt: string;
  onChangePrompt: (val: string) => void;
  techStack: string;
  onChangeTechStack: (val: string) => void;
  onSubmit: () => void;
  isPlanning: boolean;
}

export const PromptInput: React.FC<PromptInputProps> = ({
  prompt,
  onChangePrompt,
  techStack,
  onChangeTechStack,
  onSubmit,
  isPlanning,
}) => {
  const [showStackSelector, setShowStackSelector] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const availableStacks = [
    'React 18 + TypeScript + Vite + Express',
    'React 18 + TypeScript + Recharts + Tailwind',
    'React 18 + TypeScript + LocalStorage',
    'React 18 + TypeScript + Gemini 3.7 API',
    'React 18 + TypeScript + Express + PostgreSQL Schema',
    'FastAPI + React 18 + TypeScript',
    'Node.js + TypeScript + Express REST',
  ];

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (prompt.trim() && !isPlanning) {
        onSubmit();
      }
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-4">
      <div className="bg-[#0f141d]/90 border border-white/10 rounded-2xl p-4 sm:p-5 shadow-2xl backdrop-blur-2xl flex flex-col gap-3 relative transition-all focus-within:border-blue-500/50">
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          id="factory-prompt-textarea"
          value={prompt}
          onChange={(e) => onChangePrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe your project..."
          rows={4}
          disabled={isPlanning}
          className="w-full bg-transparent text-white placeholder-slate-500 text-base sm:text-lg leading-relaxed resize-none outline-none font-sans"
        />

        {/* Bottom toolbar inside input card */}
        <div className="flex items-center justify-between flex-wrap gap-3 pt-3 border-t border-white/5">
          {/* Tech stack selector & voice input */}
          <div className="flex items-center gap-2 relative">
            <button
              type="button"
              onClick={() => setShowStackSelector(!showStackSelector)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-slate-300 text-xs font-medium hover:text-white hover:border-white/20 transition-all"
            >
              <Code2 className="w-3.5 h-3.5 text-blue-400" />
              <span>{techStack}</span>
              <Sliders className="w-3 h-3 text-slate-400 ml-1" />
            </button>

            <VoiceButton onTranscript={(txt) => onChangePrompt(txt)} disabled={isPlanning} />

            {showStackSelector && (
              <div className="absolute top-10 left-0 bg-slate-900 border border-white/15 rounded-xl shadow-2xl z-50 p-2 w-72 flex flex-col gap-1">
                <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Target Tech Stack
                </div>
                {availableStacks.map((stk) => (
                  <button
                    key={stk}
                    type="button"
                    onClick={() => {
                      onChangeTechStack(stk);
                      setShowStackSelector(false);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs text-left transition-colors ${
                      techStack === stk ? 'bg-blue-600/20 text-blue-400 font-semibold' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {stk}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Action Button & Hint */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 hidden sm:inline">Press Enter to generate.</span>
            <Button
              id="factory-generate-plan-btn"
              variant="primary"
              size="md"
              onClick={onSubmit}
              disabled={!prompt.trim() || isPlanning}
              className="h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-500/20"
            >
              {isPlanning ? (
                <div className="flex items-center gap-2">
                  <Spinner size={14} />
                  <span>Planning...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-200" />
                  <span>Generate Project</span>
                </div>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
