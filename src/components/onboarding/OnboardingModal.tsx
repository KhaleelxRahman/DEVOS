import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../hooks/useProject';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../common/Toast';
import {
  Sparkles,
  Github,
  CheckCircle2,
  Code2,
  Layers,
  Cpu,
  Terminal,
  Cloud,
  ArrowRight,
  ArrowLeft,
  Check,
  Zap,
} from 'lucide-react';

const INTEREST_OPTIONS = [
  { id: 'fullstack', label: 'Full Stack Web Apps', icon: <Layers size={16} />, desc: 'React, TypeScript, Express, Tailwind' },
  { id: 'ai_systems', label: 'AI Systems & Gemini Agents', icon: <Cpu size={16} />, desc: 'Prompt synthesis, RAG, tool calling' },
  { id: 'microservices', label: 'Microservices & REST APIs', icon: <Terminal size={16} />, desc: 'Fast endpoints, OpenAPI, Jest tests' },
  { id: 'devops', label: 'DevOps & Edge Deployments', icon: <Cloud size={16} />, desc: 'Vercel, Netlify, Cloud Run edge pipelines' },
];

export const OnboardingModal: React.FC = () => {
  const { user, showOnboarding, closeOnboarding, completeOnboarding } = useAuth();
  const { refreshProjects } = useProject();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState<number>(1);
  const [selectedInterests, setSelectedInterests] = useState<string[]>(['fullstack', 'ai_systems']);
  const [githubUsername, setGithubUsername] = useState<string>('');
  const [githubConnected, setGithubConnected] = useState<boolean>(false);
  const [isFinishing, setIsFinishing] = useState<boolean>(false);

  if (!showOnboarding) return null;

  const toggleInterest = (id: string) => {
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleConnectGithub = () => {
    if (!githubUsername.trim()) {
      toast('Please enter your GitHub handle', 'warning');
      return;
    }
    setGithubConnected(true);
    toast(`Connected GitHub account @${githubUsername.trim()}`, 'success');
  };

  const handleFinish = async (targetAction: 'dashboard' | 'factory' | 'workspace' = 'dashboard') => {
    setIsFinishing(true);
    try {
      await completeOnboarding(
        selectedInterests,
        githubConnected ? githubUsername.trim() : undefined
      );
      await refreshProjects();
      toast('Welcome to DEVOS! Your private workspace is ready.', 'success');
      closeOnboarding();

      if (targetAction === 'factory' || targetAction === 'workspace') {
        navigate('/app/workspace');
      } else {
        navigate('/app/dashboard');
      }
    } catch {
      toast('Failed to save onboarding preferences', 'error');
    } finally {
      setIsFinishing(false);
    }
  };

  return (
    <Modal
      isOpen={showOnboarding}
      onClose={() => {}}
      title={`Welcome to DEVOS, ${user?.name || 'Developer'}!`}
      subtitle="Let's personalize your cloud development operating system in 60 seconds."
      size="lg"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        {/* Progress Stepper */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px' }}>
          {[
            { num: 1, label: 'Welcome' },
            { num: 2, label: 'Interests' },
            { num: 3, label: 'GitHub' },
            { num: 4, label: 'Get Started' },
          ].map((s, idx) => {
            const isPassed = step > s.num;
            const isCurrent = step === s.num;
            return (
              <React.Fragment key={s.num}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: isPassed
                        ? '#10b981'
                        : isCurrent
                        ? 'var(--color-accent)'
                        : 'var(--color-surface-elevated)',
                      color: isPassed || isCurrent ? '#ffffff' : 'var(--color-text-muted)',
                      fontSize: '12px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid var(--color-border)',
                      transition: 'all 200ms ease',
                    }}
                  >
                    {isPassed ? <Check size={14} /> : s.num}
                  </div>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: isCurrent ? 700 : 500,
                      color: isCurrent ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                      display: 'inline-block',
                    }}
                  >
                    {s.label}
                  </span>
                </div>
                {idx < 3 && (
                  <div
                    style={{
                      flex: 1,
                      height: 2,
                      background: step > idx + 1 ? 'var(--color-accent)' : 'var(--color-border)',
                      margin: '0 8px',
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Step 1: Welcome Overview */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', padding: '12px 0' }}>
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.15) 100%)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: 'var(--radius-lg)',
                padding: '20px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  margin: '0 auto 12px auto',
                  boxShadow: '0 8px 24px rgba(59, 130, 246, 0.3)',
                }}
              >
                <Sparkles size={28} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 6px 0', color: 'var(--color-text-primary)' }}>
                Your Private AI-Native IDE &amp; App Factory
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>
                DEVOS gives you isolated Monaco editing, a sandboxed Linux-like terminal, Gemini 3.7 Pro intelligence,
                and one-click edge deployment pipelines.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)' }}>
              <div style={{ background: 'var(--color-surface)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', textAlign: 'center' }}>
                <Code2 size={20} color="var(--color-accent)" style={{ margin: '0 auto 6px auto' }} />
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>Isolated Workspaces</div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: 2 }}>Private files &amp; terminals</div>
              </div>
              <div style={{ background: 'var(--color-surface)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', textAlign: 'center' }}>
                <Zap size={20} color="#f59e0b" style={{ margin: '0 auto 6px auto' }} />
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>AI App Factory</div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: 2 }}>Autonomous code synthesis</div>
              </div>
              <div style={{ background: 'var(--color-surface)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', textAlign: 'center' }}>
                <Cloud size={20} color="#10b981" style={{ margin: '0 auto 6px auto' }} />
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>Zero-Config Edge</div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: 2 }}>Vercel &amp; Cloud Run</div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Choose Interests */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', padding: '8px 0' }}>
            <div>
              <h4 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--color-text-primary)' }}>
                What kind of applications do you want to build?
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: 0 }}>
                Select all that apply to tailor the AI code generators and template library.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-3)' }}>
              {INTEREST_OPTIONS.map((item) => {
                const isSelected = selectedInterests.includes(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleInterest(item.id)}
                    style={{
                      padding: '14px',
                      borderRadius: 'var(--radius-lg)',
                      background: isSelected ? 'rgba(59, 130, 246, 0.08)' : 'var(--color-surface)',
                      border: isSelected ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                      transition: 'all 150ms ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: isSelected ? 'var(--color-accent)' : 'var(--color-text-primary)' }}>
                        {item.icon}
                        <span style={{ fontSize: '13px', fontWeight: 700 }}>{item.label}</span>
                      </div>
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          background: isSelected ? 'var(--color-accent)' : 'transparent',
                          border: isSelected ? 'none' : '1px solid var(--color-border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                        }}
                      >
                        {isSelected && <Check size={12} />}
                      </div>
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', margin: 0 }}>
                      {item.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: Connect GitHub */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', padding: '10px 0' }}>
            <div>
              <h4 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--color-text-primary)' }}>
                Connect your GitHub Account (Optional)
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: 0 }}>
                Sync private repositories, create automated pull requests, and trigger CI/CD pipelines.
              </p>
            </div>

            <div
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: '#24292e',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                  }}
                >
                  <Github size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    GitHub Account Integration
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                    {githubConnected ? `Connected as @${githubUsername}` : 'Isolated OAuth token storage'}
                  </div>
                </div>
              </div>

              {!githubConnected ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    placeholder="Enter your GitHub username"
                    value={githubUsername}
                    onChange={(e) => setGithubUsername(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-bg)',
                      color: 'var(--color-text-primary)',
                      fontSize: 'var(--font-size-sm)',
                    }}
                  />
                  <Button variant="primary" size="sm" onClick={handleConnectGithub} leftIcon={<Github size={14} />}>
                    Connect
                  </Button>
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    color: '#10b981',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>GitHub account connected successfully!</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Ready to Start */}
        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', padding: '10px 0' }}>
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px auto',
                }}
              >
                <CheckCircle2 size={28} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 6px 0', color: 'var(--color-text-primary)' }}>
                Your DEVOS Environment is Ready!
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0 }}>
                You have a completely fresh, isolated dashboard. How would you like to start?
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-3)' }}>
              <div
                onClick={() => handleFinish('factory')}
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-accent)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <Sparkles size={22} color="var(--color-accent)" style={{ margin: '0 auto' }} />
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  Launch AI App Factory
                </div>
                <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: 0 }}>
                  Describe an application prompt to auto-scaffold files &amp; live preview.
                </p>
              </div>

              <div
                onClick={() => handleFinish('dashboard')}
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <Layers size={22} color="var(--color-text-secondary)" style={{ margin: '0 auto' }} />
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  Explore Fresh Dashboard
                </div>
                <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: 0 }}>
                  View the empty clean slate and create your first custom project.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer Navigation Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
          {step > 1 ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setStep((s) => s - 1)}
              leftIcon={<ArrowLeft size={14} />}
            >
              Back
            </Button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setStep((s) => s + 1)}
              rightIcon={<ArrowRight size={14} />}
            >
              Continue
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              loading={isFinishing}
              onClick={() => handleFinish('dashboard')}
              rightIcon={<Check size={14} />}
            >
              Complete Setup &amp; Enter DEVOS
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
