import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Code2,
  Terminal,
  Github,
  Cloud,
  Zap,
  Shield,
  Sparkles,
  GitBranch,
  TerminalSquare,
  CheckCircle2,
  Cpu,
  Rocket,
  Lock,
  Users,
  Layers,
  ArrowUpRight,
  Play,
  Check,
  Bot,
  Command,
  ChevronRight,
  Globe,
  Database,
  Sliders,
} from 'lucide-react';
import { Button } from '../../components/common';
import { useAuth } from '../../context/AuthContext';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeDemoTab, setActiveDemoTab] = useState<'editor' | 'terminal' | 'ai'>('editor');
  const [demoPrompt, setDemoPrompt] = useState('Build a Todo App using React + Express + PostgreSQL');

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: 'easeOut' as const },
    },
  };

  const handleLaunchPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (user) {
      navigate('/app/dashboard');
    } else {
      navigate(`/signup?prompt=${encodeURIComponent(demoPrompt)}`);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#020617] text-slate-100 overflow-x-hidden font-sans selection:bg-blue-500/30 selection:text-blue-200">
      
      {/* Aurora Ambient Background Layers */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.25, 0.35, 0.25],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute -top-[20vw] left-1/2 -translate-x-1/2 w-[100vw] h-[60vh] bg-gradient-to-b from-blue-600/20 via-indigo-600/10 to-transparent blur-[120px] rounded-full"
        />
        <motion.div
          animate={{
            x: [0, 40, 0],
            y: [0, -30, 0],
            opacity: [0.15, 0.25, 0.15],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute top-[15%] -left-[10%] w-[500px] h-[500px] bg-blue-500/15 rounded-full blur-[140px]"
        />
        <motion.div
          animate={{
            x: [0, -50, 0],
            y: [0, 40, 0],
            opacity: [0.12, 0.22, 0.12],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute top-[35%] -right-[10%] w-[600px] h-[600px] bg-purple-600/12 rounded-full blur-[160px]"
        />
        <div className="absolute top-[65%] left-[20%] w-[450px] h-[450px] bg-cyan-500/10 rounded-full blur-[130px]" />
        
        {/* Subtle Background Grid Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      {/* Floating Glass Navbar Capsule */}
      <motion.header
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-5 left-1/2 -translate-x-1/2 w-[92%] max-w-7xl h-16 bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-full z-50 flex items-center justify-between px-6 shadow-2xl shadow-black/50"
      >
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/')}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 flex items-center justify-center text-white font-black shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform duration-300">
            D
          </div>
          <span className="text-xl font-extrabold tracking-tight text-white group-hover:text-blue-400 transition-colors">
            DEVOS
          </span>
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-full hidden sm:inline-block">
            v1.0 Pro
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
          <a href="#features" className="hover:text-white transition-colors">Capabilities</a>
          <a href="#workflow" className="hover:text-white transition-colors">Workflow</a>
          <a href="#showcase" className="hover:text-white transition-colors">Showcase</a>
          <Link to="/docs" className="hover:text-white transition-colors">Documentation</Link>
          <Link to="/faq" className="hover:text-white transition-colors">FAQ</Link>
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <Button
              variant="primary"
              size="sm"
              className="px-6 h-10 rounded-full bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/30 font-semibold"
              onClick={() => navigate('/app/dashboard')}
            >
              Dashboard
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="px-4 h-10 text-slate-300 hover:text-white hover:bg-white/5 rounded-full"
                onClick={() => navigate('/login')}
              >
                Sign In
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="px-5 h-10 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-600/30 font-semibold"
                onClick={() => navigate('/signup')}
              >
                Launch Workspace
              </Button>
            </>
          )}
        </div>
      </motion.header>

      {/* Hero Section */}
      <section className="relative pt-36 pb-20 px-4 max-w-7xl mx-auto flex flex-col items-center z-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full bg-slate-900/40 backdrop-blur-3xl border border-white/10 rounded-3xl p-8 sm:p-14 lg:p-16 flex flex-col items-center text-center shadow-[0_30px_100px_rgba(37,99,235,0.18)] relative overflow-hidden"
        >
          {/* Inner Glow Mesh */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* VisionOS Pill Badge */}
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-full text-blue-400 text-xs font-semibold mb-8 shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
            <span>Autonomous Cloud Engineering & AI Workspace</span>
          </motion.div>

          {/* Hero Headline */}
          <motion.h1 variants={itemVariants} className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.08] max-w-4xl mb-6">
            Build Software at the{' '}
            <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-400 bg-clip-text text-transparent">
              Speed of Thought.
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p variants={itemVariants} className="text-base sm:text-lg lg:text-xl text-slate-300 max-w-2xl mb-10 leading-relaxed font-normal">
            DEVOS combines production-grade cloud environments, repository-aware AI intelligence, native GitHub integration, and a real-time Monaco IDE into one unified operating system.
          </motion.p>

          {/* Quick Prompt Command Bar */}
          <motion.form
            variants={itemVariants}
            onSubmit={handleLaunchPrompt}
            className="w-full max-w-2xl bg-slate-950/80 border border-blue-500/30 rounded-2xl p-2.5 flex items-center gap-3 shadow-2xl shadow-blue-900/20 mb-10 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all"
          >
            <div className="pl-3 text-blue-400">
              <Command className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={demoPrompt}
              onChange={(e) => setDemoPrompt(e.target.value)}
              placeholder="What would you like to build? (e.g. Build a Hospital Management System)"
              className="flex-1 bg-transparent border-none text-white text-sm sm:text-base focus:outline-none placeholder-slate-500 font-medium"
            />
            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="px-5 h-11 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center gap-2 shadow-lg shadow-blue-600/30 shrink-0"
            >
              <span>Build Now</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </motion.form>

          {/* CTA Buttons & Action Links */}
          <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-center gap-4 mb-14">
            <Button
              variant="primary"
              size="lg"
              className="px-8 h-12 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold shadow-xl shadow-blue-600/30 flex items-center gap-2"
              onClick={() => navigate(user ? '/app/dashboard' : '/signup')}
            >
              <span>Open Free Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="px-6 h-12 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-white font-medium"
              onClick={() => navigate('/docs')}
            >
              Explore Architecture
            </Button>
          </motion.div>

          {/* Floating Metric Capsules */}
          <motion.div variants={itemVariants} className="w-full grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl">
            <MetricCapsule number="99.99%" label="Cloud Uptime" icon={<Cloud className="w-4 h-4 text-blue-400" />} />
            <MetricCapsule number="10x" label="Faster Dev Velocity" icon={<Zap className="w-4 h-4 text-amber-400" />} />
            <MetricCapsule number="Gemini 3.7" label="Repo AI Brain" icon={<Sparkles className="w-4 h-4 text-purple-400" />} />
            <MetricCapsule number="Instant" label="Container Boot" icon={<Rocket className="w-4 h-4 text-emerald-400" />} />
          </motion.div>
        </motion.div>
      </section>

      {/* Showcase Section with Interactive Window */}
      <section id="showcase" className="relative py-20 px-4 max-w-7xl mx-auto z-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-xs font-semibold uppercase tracking-widest mb-3">
            <Layers className="w-3.5 h-3.5" /> Workspace Preview
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold text-white tracking-tight">
            Designed for Focus and High Velocity
          </h2>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="w-full bg-slate-900/70 border border-white/10 rounded-3xl p-6 backdrop-blur-2xl shadow-2xl shadow-black/80"
        >
          {/* Window Title Bar */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="ml-3 text-xs font-mono text-slate-400">devos-workspace/server.ts</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveDemoTab('editor')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  activeDemoTab === 'editor' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Code Editor
              </button>
              <button
                onClick={() => setActiveDemoTab('terminal')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  activeDemoTab === 'terminal' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Terminal
              </button>
              <button
                onClick={() => setActiveDemoTab('ai')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  activeDemoTab === 'ai' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                AI Pipeline
              </button>
            </div>
          </div>

          {/* Interactive Workspace Body */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[380px]">
            {/* Left File Tree Preview */}
            <div className="lg:col-span-3 bg-slate-950/60 rounded-2xl p-4 border border-white/5 text-xs font-mono text-slate-300 space-y-2">
              <div className="text-slate-500 font-semibold uppercase tracking-wider mb-3">Project Files</div>
              <div className="flex items-center gap-2 text-blue-400 bg-blue-500/10 px-2.5 py-1.5 rounded-lg border border-blue-500/20">
                <Code2 className="w-3.5 h-3.5" />
                <span>server.ts</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg">
                <Code2 className="w-3.5 h-3.5 text-amber-400" />
                <span>App.tsx</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg">
                <Database className="w-3.5 h-3.5 text-purple-400" />
                <span>schema.prisma</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg">
                <TerminalSquare className="w-3.5 h-3.5 text-emerald-400" />
                <span>terminal.log</span>
              </div>
            </div>

            {/* Main Editor / Terminal Display */}
            <div className="lg:col-span-6 bg-slate-950/80 rounded-2xl p-5 border border-white/5 font-mono text-xs sm:text-sm leading-relaxed overflow-x-auto text-slate-300">
              {activeDemoTab === 'editor' && (
                <div>
                  <div className="text-slate-500">// DEVOS Cloud Express Server Entrypoint</div>
                  <div><span className="text-blue-400">import</span> express <span className="text-blue-400">from</span> <span className="text-emerald-300">'express'</span>;</div>
                  <div><span className="text-blue-400">import</span> &#123; GoogleGenAI &#125; <span className="text-blue-400">from</span> <span className="text-emerald-300">'@google/genai'</span>;</div>
                  <br />
                  <div><span className="text-blue-400">const</span> app = <span className="text-amber-300">express</span>();</div>
                  <div><span className="text-blue-400">const</span> ai = <span className="text-blue-400">new</span> <span className="text-purple-300">GoogleGenAI</span>();</div>
                  <br />
                  <div>app.<span className="text-amber-300">get</span>(<span className="text-emerald-300">'/api/v1/health'</span>, (req, res) =&gt; &#123;</div>
                  <div>&nbsp;&nbsp;res.<span className="text-amber-300">json</span>(&#123; status: <span className="text-emerald-300">'operational'</span>, port: 3000 &#125;);</div>
                  <div>&#125;);</div>
                </div>
              )}
              {activeDemoTab === 'terminal' && (
                <div className="space-y-1">
                  <div className="text-emerald-400">$ npm run build</div>
                  <div className="text-slate-400">&gt; vite build &amp;&amp; esbuild server.ts --bundle --platform=node</div>
                  <div className="text-blue-400">✓ 42 modules transformed</div>
                  <div className="text-emerald-400">✓ dist/server.cjs compiled cleanly (0 errors)</div>
                  <div className="text-slate-400">$ node dist/server.cjs</div>
                  <div className="text-cyan-400">[DEVOS Engine] Server running on http://0.0.0.0:3000</div>
                </div>
              )}
              {activeDemoTab === 'ai' && (
                <div className="space-y-3">
                  <div className="text-purple-400 font-semibold">[Gemini 3.7 Repository Brain]</div>
                  <div className="text-slate-300">Indexed 18 project files, 14 REST endpoints, and PostgreSQL schema.</div>
                  <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-200">
                    "I can automatically write unit tests and generate OpenAPI specs for your backend endpoints. Shall I proceed?"
                  </div>
                </div>
              )}
            </div>

            {/* Right Status Panel */}
            <div className="lg:col-span-3 bg-slate-950/60 rounded-2xl p-4 border border-white/5 flex flex-col justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">AI Engine Status</div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-300 p-2 bg-white/5 rounded-xl">
                    <span>Repository Indexing</span>
                    <span className="text-emerald-400 font-semibold">100%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-300 p-2 bg-white/5 rounded-xl">
                    <span>Container Health</span>
                    <span className="text-emerald-400 font-semibold">Passing</span>
                  </div>
                </div>
              </div>
              <Button
                variant="primary"
                size="sm"
                className="w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs mt-4"
                onClick={() => navigate('/app/workspace')}
              >
                Launch Live Editor
              </Button>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Feature Capabilities Grid */}
      <section id="features" className="relative py-20 px-4 max-w-7xl mx-auto z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-xs font-semibold uppercase tracking-widest mb-3">
            <Zap className="w-3.5 h-3.5" /> Capabilities
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold text-white tracking-tight">
            Built for High-Performance Software Engineering
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard
            icon={<Code2 className="w-6 h-6 text-blue-400" />}
            title="Monaco IDE Studio"
            desc="Production-grade editing with IntelliSense, multi-file navigation, syntax highlighting, and advanced devtools."
          />
          <FeatureCard
            icon={<Sparkles className="w-6 h-6 text-purple-400" />}
            title="AI Pair Programmer"
            desc="Repository-aware intelligence that indexes your codebase to generate code, refactor modules, and fix bugs."
          />
          <FeatureCard
            icon={<Github className="w-6 h-6 text-white" />}
            title="GitHub Native"
            desc="Seamless OAuth repository linking, branch management, commit synchronization, and pull request workflows."
          />
          <FeatureCard
            icon={<TerminalSquare className="w-6 h-6 text-emerald-400" />}
            title="Secure Terminal"
            desc="Dedicated Linux containers with live xterm.js execution, persistent history, and robust environment isolation."
          />
          <FeatureCard
            icon={<Rocket className="w-6 h-6 text-amber-400" />}
            title="One-Click Deploy"
            desc="Publish your application to Cloud Run, Vercel, Netlify, or GitHub Pages with automated health verification."
          />
          <FeatureCard
            icon={<Shield className="w-6 h-6 text-red-400" />}
            title="Enterprise Security"
            desc="Encrypted JWT sessions, role-based access control (RBAC), and automated key scanning built into the core."
          />
        </div>
      </section>

      {/* Workflow Steps Section */}
      <section id="workflow" className="relative py-20 px-4 max-w-7xl mx-auto z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-xs font-semibold uppercase tracking-widest mb-3">
            <GitBranch className="w-3.5 h-3.5" /> Workflow
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold text-white tracking-tight">
            From Concept to Production in Seconds
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <WorkflowStep number="01" title="Prompt Intent" desc="Describe your application stack or connect a GitHub repository." />
          <WorkflowStep number="02" title="AI Indexes Code" desc="Gemini AI analyzes dependencies and generates optimal architecture." />
          <WorkflowStep number="03" title="Edit with Monaco" desc="Write code with live syntax completion and multi-file project structure." />
          <WorkflowStep number="04" title="Run Terminal" desc="Execute shell commands and verify runtime outputs in real time." />
          <WorkflowStep number="05" title="Deploy Live" desc="Publish to cloud infrastructure with automated health verification." />
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 px-4 max-w-7xl mx-auto z-10">
        <div className="w-full bg-gradient-to-br from-blue-900/40 via-indigo-900/30 to-purple-900/40 border border-blue-500/30 rounded-3xl p-10 sm:p-16 text-center backdrop-blur-2xl shadow-2xl shadow-blue-950/50">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
            Your Next Development Environment Starts Here.
          </h2>
          <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto mb-8">
            Experience the future of cloud software engineering today. No setup fees, instant containerized boot.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button
              variant="primary"
              size="lg"
              className="px-8 h-12 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-xl shadow-blue-600/30"
              onClick={() => navigate('/signup')}
            >
              Launch DEVOS Workspace
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="px-6 h-12 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-white font-medium"
              onClick={() => navigate('/docs')}
            >
              View Documentation
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-slate-950/80 backdrop-blur-2xl py-12 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-8 mb-12">
          <div>
            <div className="flex items-center gap-3 text-xl font-bold text-white mb-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black">D</div>
              <span>DEVOS</span>
            </div>
            <p className="text-slate-400 text-sm max-w-sm leading-relaxed">
              The enterprise cloud development operating system for modern software engineering teams.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-sm">
            <div>
              <div className="font-semibold text-white mb-3">Product</div>
              <ul className="space-y-2 text-slate-400">
                <li><Link to="/app/dashboard" className="hover:text-white transition-colors">Dashboard</Link></li>
                <li><Link to="/docs" className="hover:text-white transition-colors">Docs</Link></li>
                <li><Link to="/about" className="hover:text-white transition-colors">About</Link></li>
              </ul>
            </div>
            <div>
              <div className="font-semibold text-white mb-3">Support</div>
              <ul className="space-y-2 text-slate-400">
                <li><Link to="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                <li><Link to="/faq" className="hover:text-white transition-colors">FAQ</Link></li>
              </ul>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <div className="font-semibold text-white mb-3">Lead Architect</div>
              <ul className="space-y-1 text-slate-400 text-xs">
                <li className="text-slate-200 font-semibold">Md. Khaleel Ur Rahman</li>
                <li><a href="mailto:mdkhaleelurrahman51@gmail.com" className="hover:text-blue-400 transition-colors">mdkhaleelurrahman51@gmail.com</a></li>
                <li><a href="tel:7842835936" className="hover:text-blue-400 transition-colors">7842835936</a></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-6 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <span>© 2026 DEVOS. All rights reserved.</span>
          <div className="flex gap-6">
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Security Compliance</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

const MetricCapsule = ({ number, label, icon }: { number: string; label: string; icon: React.ReactNode }) => (
  <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 backdrop-blur-md flex flex-col items-center text-center">
    <div className="flex items-center gap-1.5 mb-1">
      {icon}
      <span className="text-2xl font-extrabold text-white tracking-tight">{number}</span>
    </div>
    <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">{label}</span>
  </div>
);

const FeatureCard = ({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) => (
  <motion.div
    whileHover={{ y: -5, borderColor: 'rgba(59, 130, 246, 0.4)' }}
    className="bg-slate-900/50 border border-white/10 rounded-2xl p-6 backdrop-blur-xl flex flex-col gap-3 transition-colors shadow-xl"
  >
    <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
      {icon}
    </div>
    <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>
    <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
  </motion.div>
);

const WorkflowStep = ({ number, title, desc }: { number: string; title: string; desc: string }) => (
  <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-5 backdrop-blur-lg flex flex-col gap-2">
    <div className="text-2xl font-black font-mono text-blue-400">{number}</div>
    <div className="text-base font-bold text-white">{title}</div>
    <div className="text-xs text-slate-400 leading-relaxed">{desc}</div>
  </div>
);
