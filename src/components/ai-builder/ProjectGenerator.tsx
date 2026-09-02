import React, { useState } from 'react';
import {
  Sparkles,
  Bot,
  Mic,
  MicOff,
  Cpu,
  FolderTree,
  ListTodo,
  FileCode2,
  Play,
  ArrowRight,
  Code2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { generatorApi, commandCenterApi } from '../../api';
import { Button, Badge, Spinner } from '../common';
import { useToast } from '../common/Toast';
import { useProject } from '../../hooks/useProject';
import { ProjectTemplates } from './ProjectTemplates';
import { PromptHistory } from './PromptHistory';
import { PlanningTimeline, TimelineStage } from './PlanningTimeline';
import { GenerationProgress } from './GenerationProgress';
import { TaskQueue } from './TaskQueue';
import { FullProjectPlan, TaskItem } from '../../types/generator';

interface ProjectGeneratorProps {
  onComplete?: () => void;
}

export const ProjectGenerator: React.FC<ProjectGeneratorProps> = ({ onComplete }) => {
  const [prompt, setPrompt] = useState('Build an Expense Tracker with monthly budgeting, charts, and CSV export');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('expense-tracker');
  const [techStack, setTechStack] = useState('React 18 + TypeScript + Vite + Express');
  const [isListening, setIsListening] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isScaffolding, setIsScaffolding] = useState(false);

  // Generation state
  const [progressPercent, setProgressPercent] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [plan, setPlan] = useState<FullProjectPlan | null>(null);
  const [activeTab, setActiveTab] = useState<'prd' | 'architecture' | 'tree' | 'tasks' | 'files'>('prd');

  const { toast } = useToast();
  const navigate = useNavigate();
  const { setActiveProject } = useProject();

  const stages: TimelineStage[] = [
    {
      id: 'st-prompt',
      label: 'Prompt Engine',
      description: 'Capture & Context',
      icon: <Sparkles size={13} />,
      status: isGenerating ? 'running' : plan ? 'completed' : 'pending',
    },
    {
      id: 'st-prd',
      label: 'PRD Synthesis',
      description: 'Scope & User Needs',
      icon: <FileCode2 size={13} />,
      status: progressPercent >= 30 ? 'completed' : isGenerating && progressPercent >= 10 ? 'running' : 'pending',
    },
    {
      id: 'st-arch',
      label: 'Architecture',
      description: 'System Topology',
      icon: <Cpu size={13} />,
      status: progressPercent >= 50 ? 'completed' : isGenerating && progressPercent >= 30 ? 'running' : 'pending',
    },
    {
      id: 'st-tree',
      label: 'Folder Tree',
      description: 'Repo Scaffolding',
      icon: <FolderTree size={13} />,
      status: progressPercent >= 70 ? 'completed' : isGenerating && progressPercent >= 50 ? 'running' : 'pending',
    },
    {
      id: 'st-tasks',
      label: 'Task Queue',
      description: 'Milestones & Epics',
      icon: <ListTodo size={13} />,
      status: progressPercent >= 85 ? 'completed' : isGenerating && progressPercent >= 70 ? 'running' : 'pending',
    },
    {
      id: 'st-files',
      label: 'Source Files',
      description: 'Typed Code Gen',
      icon: <Code2 size={13} />,
      status: plan ? 'completed' : isGenerating && progressPercent >= 85 ? 'running' : 'pending',
    },
  ];

  const handleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast('Speech Recognition not supported in this browser. Using simulation.', 'info');
      setPrompt('Build an AI-powered Developer Dashboard with real-time metrics and charts');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        toast('Listening... Speak your app idea clearly', 'info');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setPrompt(transcript);
        setIsListening(false);
        toast(`Captured voice prompt: "${transcript}"`, 'success');
      };

      recognition.onerror = () => {
        setIsListening(false);
        toast('Voice input timed out or microphone unavailable', 'warning');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch {
      setIsListening(false);
      setPrompt('Cloud-native SaaS platform with automated deployments');
    }
  };

  const handleSelectTemplate = (tmpl: any) => {
    setSelectedTemplateId(tmpl.id);
    setPrompt(tmpl.prompt);
    setTechStack(tmpl.techStack);
    toast(`Loaded template: ${tmpl.title}`, 'info');
  };

  const handleAutonomousGeneration = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setProgressPercent(10);
    setLogs(['[00:01] Autonomous AI Developer OS initializing...', `[00:02] Analyzing prompt: "${prompt}"`]);
    setCurrentStep('Synthesizing Product Requirement Document (PRD)...');
    setPlan(null);

    const projectName = prompt
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 24) || 'ai-app';

    try {
      // Step 1: PRD
      setProgressPercent(25);
      setLogs((prev) => [...prev, '[00:03] Compiling problem domain, personas, and MVP scope...']);
      const prdRes = await generatorApi.generatePRD({ prompt, project_name: projectName });
      const prdData = prdRes.data;
      setLogs((prev) => [...prev, `[00:04] ✓ PRD synthesized: "${prdData?.title || 'PRD'}"`]);

      // Step 2: Architecture
      setProgressPercent(45);
      setCurrentStep('Designing System Topology & Component Hierarchy...');
      setLogs((prev) => [...prev, '[00:05] Synthesizing component contracts and state patterns...']);
      const archRes = await generatorApi.generateArchitecture({ prompt, prd: prdData, tech_stack: techStack });
      const archData = archRes.data;
      setLogs((prev) => [...prev, `[00:06] ✓ Architecture generated with ${archData?.components?.length || 4} components`]);

      // Step 3: Folder Structure
      setProgressPercent(65);
      setCurrentStep('Generating clean repository file tree...');
      setLogs((prev) => [...prev, '[00:07] Structuring src/pages, src/components, src/services...']);
      const treeRes = await generatorApi.generateFolderTree({ prompt, architecture: archData });
      const treeData = treeRes.data;
      setLogs((prev) => [...prev, `[00:08] ✓ Folder tree planned (${treeData?.tree?.length || 10} paths)`]);

      // Step 4: Task Queue
      setProgressPercent(80);
      setCurrentStep('Constructing smart development task queue...');
      setLogs((prev) => [...prev, '[00:09] Building phased roadmap and verification tasks...']);
      const tasksRes = await generatorApi.generateTasks({ prompt, prd: prdData, architecture: archData });
      const tasksData = tasksRes.data;
      setLogs((prev) => [...prev, `[00:10] ✓ Smart task queue generated (${tasksData?.tasks?.length || 4} tasks)`]);

      // Step 5: Files Generation
      setProgressPercent(95);
      setCurrentStep('Synthesizing production TypeScript & React starter files...');
      setLogs((prev) => [...prev, '[00:11] Generating types.ts, api.ts, MainView.tsx, README.md...']);
      const filesRes = await generatorApi.generateFiles({ prompt, project_name: projectName });
      const filesData = filesRes.data;
      setLogs((prev) => [...prev, `[00:12] ✓ Generated ${filesData?.files?.length || 4} production source code files!`]);

      const fullPlan: FullProjectPlan = {
        project_name: projectName,
        description: prdData?.summary || `Autonomous build for ${prompt}`,
        tech_stack: [techStack, 'Tailwind CSS', 'Monaco IDE'],
        prd: prdData,
        architecture: archData,
        folder_structure: treeData?.tree || [],
        roadmap: tasksData?.roadmap || [],
        tasks: tasksData?.tasks || [],
        initial_files: filesData?.files || [],
      };

      setPlan(fullPlan);
      setProgressPercent(100);
      setCurrentStep('Autonomous workspace ready!');
      setLogs((prev) => [...prev, '[00:13] DEVOS Pipeline complete. Project ready to launch in Monaco Workspace!']);
      toast('Full autonomous project generated successfully!', 'success');

      // Save prompt to history
      try {
        const historyRaw = localStorage.getItem('devos_prompt_history');
        const historyList = historyRaw ? JSON.parse(historyRaw) : [];
        historyList.unshift({
          id: `ph_${Date.now()}`,
          prompt,
          timestamp: new Date().toISOString(),
          project_name: projectName,
          isFavorite: false,
        });
        localStorage.setItem('devos_prompt_history', JSON.stringify(historyList.slice(0, 20)));
      } catch {
        // ignore
      }
    } catch (err: any) {
      toast(err.message || 'Generation encountered an issue', 'error');
      setLogs((prev) => [...prev, `[ERROR] ${err.message || 'Generation failed'}`]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLaunchInWorkspace = async () => {
    if (!plan || isScaffolding) return;
    setIsScaffolding(true);

    try {
      const scaffoldPayload = {
        project_name: plan.project_name,
        description: plan.description,
        tech_stack: plan.tech_stack,
        prd: plan.prd,
        architecture: plan.architecture,
        folder_structure: plan.folder_structure,
        roadmap: plan.roadmap,
        tasks: plan.tasks,
        initial_files: plan.initial_files,
      };

      const res = await commandCenterApi.scaffold(scaffoldPayload);
      if (res.success && res.data) {
        setActiveProject(res.data.project);
        localStorage.setItem('devos_active_project_id', res.data.project.id);
        toast(`"${plan.project_name}" loaded into Monaco Workspace!`, 'success');
        if (onComplete) {
          onComplete();
        } else {
          navigate('/app/workspace');
        }
      }
    } catch (err: any) {
      toast(err.message || 'Failed to scaffold workspace', 'error');
    } finally {
      setIsScaffolding(false);
    }
  };

  const handleToggleTask = (taskId: string) => {
    if (!plan) return;
    const updatedTasks = plan.tasks.map((t) => {
      if (t.id === taskId) {
        const nextStatus: TaskItem['status'] =
          t.status === 'completed' ? 'pending' : t.status === 'pending' ? 'in_progress' : 'completed';
        return { ...t, status: nextStatus };
      }
      return t;
    });
    setPlan({ ...plan, tasks: updatedTasks });
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
        background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(9, 13, 22, 0.98) 100%)',
        border: '1px solid var(--color-border-strong)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-5)',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      {/* Header Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 0 16px rgba(59, 130, 246, 0.4)',
            }}
          >
            <Sparkles size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>
                Autonomous AI Developer Operating System
              </h2>
              <span
                style={{
                  fontSize: '10px',
                  padding: '2px 8px',
                  borderRadius: 12,
                  background: 'rgba(59, 130, 246, 0.15)',
                  color: 'var(--color-accent)',
                  fontWeight: 600,
                  fontFamily: 'var(--font-mono)',
                }}
              >
                v1.0.0 PRO
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '2px 0 0 0' }}>
              One prompt automatically synthesizes PRD &rarr; Architecture &rarr; Folder Tree &rarr; Tasks &rarr; Code &rarr; Workspace.
            </p>
          </div>
        </div>

        <Badge variant="accent" icon={<Bot size={12} />}>
          Gemini 3.7 Flash Engine
        </Badge>
      </div>

      {/* Main Prompt Bar */}
      <form onSubmit={handleAutonomousGeneration} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            className="input"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="What do you want to build? (e.g. Build an Expense Tracker with charts and budgeting)"
            style={{
              width: '100%',
              padding: '14px 120px 14px 16px',
              fontSize: '14px',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border-strong)',
              color: 'var(--color-text-primary)',
              fontFamily: 'inherit',
            }}
            disabled={isGenerating || isScaffolding}
          />

          <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 6 }}>
            <button
              type="button"
              onClick={handleVoiceInput}
              title="Voice Prompt Input"
              style={{
                background: isListening ? 'var(--color-error)' : 'var(--color-surface-elevated)',
                border: '1px solid var(--color-border)',
                color: isListening ? '#ffffff' : 'var(--color-text-secondary)',
                borderRadius: 'var(--radius-md)',
                padding: '7px 10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {isListening ? <MicOff size={14} /> : <Mic size={14} />}
            </button>

            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={!prompt.trim() || isGenerating || isScaffolding}
              leftIcon={isGenerating ? <Spinner size={14} /> : <Play size={14} />}
            >
              {isGenerating ? 'Synthesizing...' : 'Build App'}
            </Button>
          </div>
        </div>
      </form>

      {/* Templates & Prompt Memory */}
      {!plan && !isGenerating && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <ProjectTemplates
            onSelectTemplate={handleSelectTemplate}
            selectedTemplateId={selectedTemplateId}
          />
          <PromptHistory onSelectPrompt={(p) => setPrompt(p)} currentPrompt={prompt} />
        </div>
      )}

      {/* Execution Pipeline & Live Log Output */}
      {(isGenerating || plan) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <PlanningTimeline
            stages={stages}
            progressPercent={progressPercent}
          />

          <GenerationProgress
            logs={logs}
            currentStep={currentStep}
            filesGeneratedCount={plan?.initial_files?.length || (progressPercent > 80 ? 4 : 0)}
            isComplete={!!plan && progressPercent === 100}
          />
        </div>
      )}

      {/* Generated Project Inspector */}
      {plan && (
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-4)',
          }}
        >
          {/* Tabs Navigation */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--color-border)',
              paddingBottom: 'var(--space-3)',
              marginBottom: 'var(--space-3)',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', gap: 4, overflowX: 'auto' }}>
              <button
                onClick={() => setActiveTab('prd')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: activeTab === 'prd' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                  color: activeTab === 'prd' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                <FileCode2 size={13} />
                <span>PRD</span>
              </button>

              <button
                onClick={() => setActiveTab('architecture')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: activeTab === 'architecture' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                  color: activeTab === 'architecture' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                <Cpu size={13} />
                <span>Architecture</span>
              </button>

              <button
                onClick={() => setActiveTab('tree')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: activeTab === 'tree' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                  color: activeTab === 'tree' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                <FolderTree size={13} />
                <span>Folder Tree</span>
              </button>

              <button
                onClick={() => setActiveTab('tasks')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: activeTab === 'tasks' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                  color: activeTab === 'tasks' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                <ListTodo size={13} />
                <span>Tasks ({plan.tasks.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('files')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: activeTab === 'files' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                  color: activeTab === 'files' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                <Code2 size={13} />
                <span>Generated Code ({plan.initial_files.length})</span>
              </button>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={handleLaunchInWorkspace}
              disabled={isScaffolding}
              leftIcon={isScaffolding ? <Spinner size={13} /> : <ArrowRight size={13} />}
            >
              {isScaffolding ? 'Launching Workspace...' : 'Launch in Monaco Workspace'}
            </Button>
          </div>

          {/* PRD Tab Content */}
          {activeTab === 'prd' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--color-text-primary)' }}>
                  {plan.prd?.title || 'Product Requirement Document'}
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: 0 }}>
                  {plan.prd?.summary}
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-3)' }}>
                <div style={{ background: 'var(--color-surface-elevated)', padding: '10px 12px', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Core Problem
                  </span>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                    {plan.prd?.problem}
                  </p>
                </div>

                <div style={{ background: 'var(--color-surface-elevated)', padding: '10px 12px', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Target Users
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                    {(plan.prd?.target_users || []).map((u, i) => (
                      <span key={i} style={{ fontSize: '10px', background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', padding: '2px 6px', borderRadius: 4 }}>
                        {u}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Key Features & MVP Scope
                </span>
                <ul style={{ margin: '6px 0 0 0', paddingLeft: 16, fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                  {(plan.prd?.key_features || []).map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Architecture Tab Content */}
          {activeTab === 'architecture' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)' }}>
                <div style={{ background: 'var(--color-surface-elevated)', padding: '10px 12px', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Pattern</span>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)', marginTop: 2 }}>
                    {plan.architecture?.pattern || 'Clean Architecture'}
                  </div>
                </div>
                <div style={{ background: 'var(--color-surface-elevated)', padding: '10px 12px', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Frontend</span>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)', marginTop: 2 }}>
                    {plan.architecture?.frontend_stack}
                  </div>
                </div>
                <div style={{ background: 'var(--color-surface-elevated)', padding: '10px 12px', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Backend API</span>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)', marginTop: 2 }}>
                    {plan.architecture?.backend_stack}
                  </div>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Component Hierarchy & Responsibilities
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-2)', marginTop: 6 }}>
                  {(plan.architecture?.components || []).map((c, i) => (
                    <div key={i} style={{ padding: '8px 10px', background: 'var(--color-surface-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#93c5fd' }}>{c.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: 2 }}>{c.responsibility}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Folder Tree Tab */}
          {activeTab === 'tree' && (
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', background: '#090d16', padding: '12px', borderRadius: 'var(--radius-md)', color: '#cbd5e1', lineHeight: 1.6 }}>
                {(plan.folder_structure || []).map((path, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: '#64748b' }}>{path.endsWith('/') ? '📁' : '📄'}</span>
                    <span style={{ color: path.endsWith('/') ? '#93c5fd' : '#f1f5f9' }}>{path}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tasks Tab */}
          {activeTab === 'tasks' && (
            <TaskQueue
              tasks={plan.tasks}
              onToggleTask={handleToggleTask}
            />
          )}

          {/* Files Tab */}
          {activeTab === 'files' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {(plan.initial_files || []).map((f, idx) => (
                <div
                  key={idx}
                  style={{
                    background: '#090d16',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: '#0d1322', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <FileCode2 size={12} color="var(--color-accent)" />
                      <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#e2e8f0' }}>{f.path}</span>
                    </div>
                    <span style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
                      {f.language} &bull; {f.content.split('\n').length} lines
                    </span>
                  </div>
                  <pre
                    style={{
                      margin: 0,
                      padding: '10px',
                      fontSize: '11px',
                      fontFamily: 'var(--font-mono)',
                      color: '#cbd5e1',
                      maxHeight: 180,
                      overflowY: 'auto',
                      background: 'transparent',
                    }}
                  >
                    {f.content}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
