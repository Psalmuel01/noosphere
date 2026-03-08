import React, { useState } from 'react';
import {
  Box,
  Search,
  Wallet,
  Compass,
  PlusCircle,
  ArrowRight,
  GitBranch,
  Users,
  CheckCircle2,
  History,
  Settings,
  ShieldCheck,
  Plus,
  Minus,
  Focus,
  MessageSquare,
  Share2,
  Download,
  AlertTriangle,
  ExternalLink,
  Database,
  Cloud,
  Bell,
  User,
  X,
  Rocket,
  Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Screen, Session, Premise } from './types';
import { HeroCanvas } from './components/HeroCanvas';

// --- Mock Data ---
const SESSIONS: Session[] = [
  {
    id: '1',
    title: 'What are the most significant risks from AGI development?',
    status: 'LIVE',
    progress: 88,
    reasoningChains: 24,
    image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=800',
  },
  {
    id: '2',
    title: 'Should we invest in solar or nuclear for baseload power?',
    status: 'SYNTHESIZING',
    progress: 67,
    contributions: 156,
    image: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&q=80&w=800',
  },
  {
    id: '3',
    title: 'How should Ethereum prioritize its roadmap?',
    status: 'COMPLETE',
    progress: 100,
    reasoningChains: 89,
    image: 'https://images.unsplash.com/photo-1621761126062-0ef15902bc0d?auto=format&fit=crop&q=80&w=800',
    tag: 'Filecoin Ecosystem'
  }
];

// --- Components ---

const Navbar = ({ onNavigate, currentScreen }: { onNavigate: (s: Screen) => void, currentScreen: Screen }) => (
  <header className="flex items-center justify-between border-b border-primary/10 px-6 md:px-20 py-4 bg-background-dark/80 backdrop-blur-md sticky top-0 z-50">
    <div className="flex items-center gap-8">
      <div
        className="flex items-center gap-3 text-primary cursor-pointer"
        onClick={() => onNavigate('landing')}
      >
        <Box className="w-8 h-8" />
        <h2 className="text-slate-100 text-xl font-bold tracking-tight font-display">Noosphere</h2>
      </div>
      <nav className="hidden md:flex items-center gap-8">
        <button className="text-slate-400 hover:text-primary transition-colors text-sm font-medium font-display">Sessions</button>
        <button className="text-slate-400 hover:text-primary transition-colors text-sm font-medium font-display">About</button>
        <button className="text-slate-400 hover:text-primary transition-colors text-sm font-medium font-display">Methodology</button>
      </nav>
    </div>
    <div className="flex items-center gap-6">
      <div className="hidden lg:flex items-center">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            className="bg-atmosphere border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-1 focus:ring-primary w-64 placeholder:text-slate-500 text-slate-100"
            placeholder="Search sessions..."
            type="text"
          />
        </div>
      </div>
      <button className="bg-primary hover:bg-primary/90 text-white px-5 py-2 rounded-lg text-sm font-bold transition-all shadow-lg shadow-primary/20 flex items-center gap-2">
        <Wallet className="w-4 h-4" />
        Connect Wallet
      </button>
    </div>
  </header>
);

const Footer = () => (
  <footer className="bg-background-dark border-t border-slate-800 py-12 px-6">
    <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
      <div className="flex items-center gap-3 text-primary opacity-70 grayscale hover:grayscale-0 transition-all">
        <Box className="w-6 h-6" />
        <h2 className="text-slate-100 text-lg font-bold font-display">Noosphere</h2>
      </div>
      <div className="flex gap-8 text-sm text-slate-500 font-display">
        <a className="hover:text-primary" href="#">Docs</a>
        <a className="hover:text-primary" href="#">Github</a>
        <a className="hover:text-primary" href="#">Twitter</a>
        <a className="hover:text-primary" href="#">Discord</a>
      </div>
      <p className="text-slate-600 text-xs font-display">
        © 2024 Noosphere Collective Intelligence. Built for the future of thought.
      </p>
    </div>
  </footer>
);

const SessionCard = ({ session, onClick }: { session: Session, onClick: () => void }) => (
  <motion.div
    whileHover={{ y: -5 }}
    onClick={onClick}
    className="group bg-atmosphere rounded-xl border border-slate-700/50 p-6 flex flex-col hover:border-primary/50 transition-all hover:shadow-2xl hover:shadow-primary/5 cursor-pointer"
  >
    <div className="relative mb-6 rounded-lg overflow-hidden aspect-video">
      <img
        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        src={session.image}
        alt={session.title}
        referrerPolicy="no-referrer"
      />
      <div className="absolute top-3 left-3 flex gap-2">
        {session.status === 'LIVE' && (
          <span className="bg-teal-500/20 text-teal-400 text-[10px] font-bold px-2 py-1 rounded border border-teal-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse"></span> LIVE
          </span>
        )}
        {session.status === 'SYNTHESIZING' && (
          <span className="bg-amber-500/20 text-amber-400 text-[10px] font-bold px-2 py-1 rounded border border-amber-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span> SYNTHESIZING
          </span>
        )}
        {session.status === 'COMPLETE' && (
          <span className="bg-slate-500/20 text-slate-300 text-[10px] font-bold px-2 py-1 rounded border border-slate-500/30 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> COMPLETE
          </span>
        )}
      </div>
      {session.tag && (
        <div className="absolute bottom-3 right-3">
          <span className="bg-primary/30 text-white text-[10px] font-bold px-2 py-1 rounded backdrop-blur-sm border border-primary/40">
            {session.tag}
          </span>
        </div>
      )}
    </div>
    <h3 className="text-slate-100 text-lg font-bold leading-snug mb-4 group-hover:text-primary transition-colors font-display">
      {session.title}
    </h3>
    <div className="mt-auto space-y-3">
      <div className="flex items-center justify-between text-xs text-slate-400 font-display">
        <span className="flex items-center gap-1">
          {session.reasoningChains ? <GitBranch className="w-3 h-3" /> : <Users className="w-3 h-3" />}
          {session.reasoningChains ? `${session.reasoningChains} reasoning chains` : `${session.contributions} contributions`}
        </span>
        <span>{session.progress}% Progress</span>
      </div>
      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${session.progress}%` }}
          className={`h-full rounded-full ${
            session.status === 'LIVE' ? 'bg-primary' :
            session.status === 'SYNTHESIZING' ? 'bg-amber-500' : 'bg-teal-500'
          }`}
        />
      </div>
    </div>
  </motion.div>
);

// --- Main App ---

export default function App() {
  const [screen, setScreen] = useState<Screen>('landing');

  const navigate = (s: Screen) => {
    window.scrollTo(0, 0);
    setScreen(s);
  };

  return (
    <div className="bg-background-dark text-slate-100 min-h-screen flex flex-col font-display">
      <Navbar onNavigate={navigate} currentScreen={screen} />

      <main className="flex-1">
        <AnimatePresence mode="wait">
          {screen === 'landing' && (
            <motion.div
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <section className="relative min-h-[80vh] flex flex-col items-center justify-center px-4 overflow-hidden">
                <HeroCanvas />
                <div className="absolute inset-0 stars-bg opacity-30 pointer-events-none"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] nebula-gradient pointer-events-none"></div>
                <div className="relative z-10 max-w-4xl text-center space-y-8">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-widest mb-4">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                    </span>
                    Decentralized Reasoning Engine
                  </div>
                  <h1 className="text-slate-100 text-5xl md:text-7xl font-bold tracking-tighter leading-tight font-display">
                    THE SPHERE OF <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">THOUGHT</span>
                  </h1>
                  <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto font-light leading-relaxed">
                    Democracy aggregates votes. Noosphere aggregates reasoning. Experience the next evolution of collective intelligence.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
                    <button
                      onClick={() => navigate('graph')}
                      className="w-full sm:w-auto px-8 py-4 bg-primary text-white font-bold rounded-xl hover:scale-105 transition-transform flex items-center justify-center gap-2 shadow-xl shadow-primary/20"
                    >
                      Explore Active Questions
                      <Compass className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => navigate('submit')}
                      className="w-full sm:w-auto px-8 py-4 bg-atmosphere text-slate-100 font-bold rounded-xl border border-slate-700 hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                    >
                      Ask a Question
                      <PlusCircle className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </section>

              <section className="max-w-7xl mx-auto px-6 py-20">
                <div className="flex items-center justify-between mb-12">
                  <div>
                    <h2 className="text-slate-100 text-2xl md:text-3xl font-bold tracking-tight mb-2 uppercase font-display">Active Collective Intelligence Sessions</h2>
                    <div className="h-1 w-20 bg-primary rounded-full"></div>
                  </div>
                  <button className="text-primary hover:text-primary/80 font-medium flex items-center gap-1 group font-display">
                    View All <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {SESSIONS.map(session => (
                    <SessionCard
                      key={session.id}
                      session={session}
                      onClick={() => navigate(session.status === 'COMPLETE' ? 'synthesis' : 'graph')}
                    />
                  ))}
                </div>
              </section>
            </motion.div>
          )}

          {screen === 'graph' && (
            <motion.div
              key="graph"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col h-[calc(100vh-73px)] overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-slate-800 px-6 py-3 bg-background-dark z-50">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 text-primary">
                    <GitBranch className="w-6 h-6" />
                    <h2 className="text-xl font-bold tracking-tight font-display">Noosphere</h2>
                  </div>
                  <div className="h-6 w-px bg-slate-800"></div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-3">
                      <h1 className="text-lg font-medium leading-none">What are the most significant risks from AGI development?</h1>
                      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 text-[10px] font-bold tracking-wider uppercase border border-red-500/20">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                        Live
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">Collective Intelligence Protocol • 14,204 active nodes</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <nav className="hidden lg:flex items-center gap-6 mr-4">
                    <button className="text-sm font-medium hover:text-primary transition-colors">Explorer</button>
                    <button className="text-sm font-medium hover:text-primary transition-colors">Network</button>
                    <button className="text-sm font-medium hover:text-primary transition-colors">Research</button>
                  </nav>
                  <div className="flex gap-2">
                    <button className="flex items-center justify-center rounded-lg h-9 px-4 bg-primary text-white text-sm font-bold transition-all hover:opacity-90">
                      Share
                    </button>
                    <div className="rounded-full border border-slate-800 p-0.5">
                      <div className="w-8 h-8 rounded-full bg-slate-700 bg-cover" style={{ backgroundImage: "url('https://api.dicebear.com/7.x/avataaars/svg?seed=Felix')" }}></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 flex overflow-hidden relative">
                <aside className="w-72 border-r border-slate-800 bg-background-dark/50 flex flex-col p-6 z-40">
                  <div className="mb-8">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Add Your Reasoning</h3>
                    <p className="text-sm text-slate-400">Contribute to the collective intelligence graph.</p>
                  </div>
                  <nav className="flex flex-col gap-1 mb-auto">
                    <button
                      onClick={() => navigate('submit')}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg bg-primary/10 text-primary group"
                    >
                      <PlusCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">Input Node</span>
                    </button>
                    <button className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors text-slate-400">
                      <GitBranch className="w-5 h-5" />
                      <span className="text-sm font-medium">Map Logic</span>
                    </button>
                    <button className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors text-slate-400">
                      <History className="w-5 h-5" />
                      <span className="text-sm font-medium">History</span>
                    </button>
                    <button className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors text-slate-400">
                      <Settings className="w-5 h-5" />
                      <span className="text-sm font-medium">Graph Settings</span>
                    </button>
                  </nav>
                  <div className="mt-8 pt-6 border-t border-slate-800">
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                      <p className="text-xs mb-4 text-center text-slate-400">To maintain high-quality reasoning, verification is required.</p>
                      <button className="w-full flex items-center justify-center gap-2 rounded-lg h-10 px-4 bg-primary text-white text-xs font-bold uppercase tracking-wider">
                        <ShieldCheck className="w-4 h-4" />
                        Verify with World ID
                      </button>
                    </div>
                  </div>
                </aside>

                <section className="flex-1 relative bg-background-dark overflow-hidden cursor-crosshair">
                  <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
                    <line x1="45%" y1="40%" x2="55%" y2="50%" stroke="#6467f2" strokeWidth="1" />
                    <line x1="55%" y1="50%" x2="50%" y2="65%" stroke="#6467f2" strokeWidth="1" />
                    <line x1="55%" y1="50%" x2="65%" y2="45%" stroke="#6467f2" strokeWidth="1" />
                    <line x1="45%" y1="40%" x2="40%" y2="30%" stroke="#6467f2" strokeWidth="1" />
                    <line x1="45%" y1="40%" x2="35%" y2="45%" stroke="#6467f2" strokeWidth="1" />
                    <line x1="65%" y1="45%" x2="70%" y2="55%" stroke="#6467f2" strokeWidth="1" />
                    <line x1="65%" y1="45%" x2="75%" y2="40%" stroke="#6467f2" strokeWidth="1" />

                    <circle cx="55%" cy="50%" r="40" fill="rgba(100, 103, 242, 0.15)" stroke="#6467f2" strokeWidth="2" />
                    <circle cx="45%" cy="40%" r="30" fill="rgba(45, 212, 191, 0.15)" stroke="#2dd4bf" strokeWidth="2" />
                    <circle cx="65%" cy="45%" r="25" fill="rgba(251, 191, 36, 0.15)" stroke="#fbbf24" strokeWidth="2" />
                    <circle cx="50%" cy="65%" r="15" fill="rgba(100, 103, 242, 0.15)" stroke="#6467f2" strokeWidth="1" />
                    <circle cx="40%" cy="30%" r="12" fill="rgba(100, 103, 242, 0.15)" stroke="#6467f2" strokeWidth="1" />
                    <circle cx="35%" cy="45%" r="18" fill="rgba(100, 103, 242, 0.15)" stroke="#6467f2" strokeWidth="1" />
                    <circle cx="70%" cy="55%" r="14" fill="rgba(45, 212, 191, 0.15)" stroke="#2dd4bf" strokeWidth="1" />
                    <circle cx="75%" cy="40%" r="10" fill="rgba(251, 191, 36, 0.15)" stroke="#fbbf24" strokeWidth="1" />
                  </svg>

                  <div className="absolute top-4 left-4 flex flex-col gap-2">
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-slate-900/80 backdrop-blur-md p-3 rounded-lg border border-slate-800 shadow-xl"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-2 h-2 rounded-full bg-primary"></span>
                        <span className="text-xs font-bold uppercase tracking-wider">Cluster Alpha</span>
                      </div>
                      <p className="text-sm max-w-[200px]">Primary risk identified: Unaligned goal optimization in autonomous agents.</p>
                    </motion.div>
                  </div>

                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-8 bg-slate-900/80 backdrop-blur-md px-6 py-3 rounded-full border border-slate-800 shadow-xl">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-primary shadow-[0_0_8px_rgba(100,103,242,0.8)]"></span>
                      <span className="text-xs font-medium text-slate-400 uppercase tracking-tighter">Your Position</span>
                    </div>
                    <div className="h-4 w-px bg-slate-700"></div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-teal-400"></span>
                      <span className="text-xs font-medium text-slate-400 uppercase tracking-tighter">Consensus Cluster</span>
                    </div>
                    <div className="h-4 w-px bg-slate-700"></div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-amber-400"></span>
                      <span className="text-xs font-medium text-slate-400 uppercase tracking-tighter">Dissent Island</span>
                    </div>
                  </div>

                  <div className="absolute bottom-6 right-6 flex flex-col gap-2">
                    <button className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 shadow-sm">
                      <Plus className="w-5 h-5" />
                    </button>
                    <button className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 shadow-sm">
                      <Minus className="w-5 h-5" />
                    </button>
                    <button className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 shadow-sm">
                      <Focus className="w-5 h-5" />
                    </button>
                  </div>
                </section>

                <aside className="w-80 border-l border-slate-800 bg-background-dark/50 flex flex-col z-40">
                  <div className="p-6 border-b border-slate-800">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-primary mb-4">Selected Reasoning</h3>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-full border-2 border-primary p-0.5">
                        <div className="w-full h-full rounded-full bg-slate-700 bg-cover" style={{ backgroundImage: "url('https://api.dicebear.com/7.x/avataaars/svg?seed=Alice')" }}></div>
                      </div>
                      <div>
                        <p className="text-sm font-bold">Alice @eth_pioneer</p>
                        <p className="text-xs text-slate-400">Contributor Level 4 • 98% Trust</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="relative pl-6 pb-4 border-l-2 border-slate-800">
                        <div className="absolute top-0 -left-[9px] w-4 h-4 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center">
                          <span className="text-[8px] font-bold">1</span>
                        </div>
                        <h4 className="text-xs font-bold uppercase text-slate-400 mb-1">Premise 1</h4>
                        <p className="text-sm leading-relaxed">AGI will likely be developed with recursive self-improvement capabilities.</p>
                      </div>
                      <div className="relative pl-6 pb-4 border-l-2 border-slate-800">
                        <div className="absolute top-0 -left-[9px] w-4 h-4 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center">
                          <span className="text-[8px] font-bold">2</span>
                        </div>
                        <h4 className="text-xs font-bold uppercase text-slate-400 mb-1">Premise 2</h4>
                        <p className="text-sm leading-relaxed">Optimization targets for complex systems often produce unintended convergent instrumental goals.</p>
                      </div>
                      <div className="relative pl-6">
                        <div className="absolute top-0 -left-[9px] w-4 h-4 rounded-full bg-teal-400/20 border-2 border-teal-400 flex items-center justify-center">
                          <span className="text-[8px] font-bold text-teal-400">C</span>
                        </div>
                        <h4 className="text-xs font-bold uppercase text-teal-400 mb-1">Conclusion</h4>
                        <p className="text-sm font-medium leading-relaxed italic">Existential risk emerges if the alignment problem is not solved prior to the takeoff point.</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 flex flex-col gap-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Node Metrics</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                        <p className="text-[10px] uppercase text-slate-500 mb-1">Centrality</p>
                        <p className="text-lg font-bold leading-none">0.842</p>
                      </div>
                      <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                        <p className="text-[10px] uppercase text-slate-500 mb-1">Stability</p>
                        <p className="text-lg font-bold leading-none">High</p>
                      </div>
                    </div>
                    <button className="mt-4 w-full flex items-center justify-center gap-2 rounded-lg h-10 px-4 bg-transparent border border-slate-800 text-sm font-medium hover:bg-slate-800 transition-colors">
                      <MessageSquare className="w-4 h-4" />
                      View Discussion
                    </button>
                    <button className="w-full flex items-center justify-center gap-2 rounded-lg h-10 px-4 bg-transparent border border-slate-800 text-sm font-medium hover:bg-slate-800 transition-colors">
                      <Share2 className="w-4 h-4" />
                      Export Branch
                    </button>
                  </div>
                </aside>
              </div>

              <footer className="h-8 bg-slate-950 border-t border-slate-800 flex items-center px-4 overflow-hidden whitespace-nowrap">
                <div className="flex items-center gap-8 text-[10px] font-mono tracking-widest text-slate-400">
                  <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span> NODE_SYNC: 100%</span>
                  <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span> LATENCY: 12ms</span>
                  <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary"></span> ENTROPY_VAL: 0.1242</span>
                  <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span> CONFLICT_NODES: 42</span>
                  <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span> HASH: 0x8a2f...3c91</span>
                  <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span> THREADS: ACTIVE</span>
                  <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary"></span> REASONING_ENGINE_V2.1</span>
                </div>
              </footer>
            </motion.div>
          )}

          {screen === 'submit' && (
            <motion.div
              key="submit"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col h-[calc(100vh-73px)] overflow-hidden"
            >
              <div className="flex-1 bg-atmosphere overflow-hidden flex items-center justify-center relative">
                <div className="absolute inset-0 opacity-20 pointer-events-none">
                  <div className="absolute top-1/4 left-1/3 w-2 h-2 bg-primary rounded-full shadow-[0_0_15px_rgba(100,103,242,0.8)]"></div>
                  <div className="absolute top-1/2 left-1/2 w-1.5 h-1.5 bg-slate-100 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]"></div>
                  <div className="absolute bottom-1/3 right-1/4 w-2 h-2 bg-primary rounded-full shadow-[0_0_15px_rgba(100,103,242,0.8)]"></div>
                  <svg className="w-full h-full stroke-primary/10 fill-none">
                    <path d="M100,200 L400,500 L800,300 L1100,600" strokeWidth="1" />
                    <path d="M400,500 L600,100 L800,300" strokeWidth="1" />
                  </svg>
                </div>

                <motion.div
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  className="absolute inset-y-0 right-0 w-full max-w-xl bg-background-dark shadow-2xl border-l border-primary/20 flex flex-col z-20 overflow-y-auto"
                >
                  <div className="p-8 space-y-8">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-2xl font-bold text-slate-100">Submit New Reasoning</h2>
                        <p className="text-slate-400 text-sm mt-1">Contribute your logic to the global Noosphere graph</p>
                      </div>
                      <button onClick={() => navigate('graph')} className="text-slate-400 hover:text-slate-200">
                        <X className="w-6 h-6" />
                      </button>
                    </div>

                    <div className="space-y-6">
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold uppercase tracking-wider text-primary">Premises</label>
                        <p className="text-xs text-slate-400 -mt-1">List key evidence, axioms, or supporting assumptions</p>
                        <textarea
                          className="w-full min-h-[120px] rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-slate-100 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none"
                          placeholder="e.g., A = B, Observed data point X, Peer-reviewed paper Y..."
                        />
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold uppercase tracking-wider text-primary">Conclusion</label>
                        <p className="text-xs text-slate-400 -mt-1">State the definitive logical result of this chain</p>
                        <textarea
                          className="w-full min-h-[100px] rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-slate-100 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none"
                          placeholder="Therefore, we believe that..."
                        />
                      </div>

                      <div className="flex flex-col gap-4 p-5 rounded-xl bg-primary/5 border border-primary/10">
                        <div className="flex justify-between items-center">
                          <label className="text-sm font-semibold uppercase tracking-wider text-primary">Confidence Level</label>
                          <span className="px-2 py-1 bg-primary text-white text-xs font-bold rounded">7 / 10</span>
                        </div>
                        <input className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary" max="10" min="1" type="range" defaultValue="7"/>
                        <div className="flex justify-between text-[10px] text-slate-400 uppercase font-bold px-1">
                          <span>Speculative</span>
                          <span>Certain</span>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50">
                        <h4 className="text-xs font-bold text-slate-400 uppercase mb-4 tracking-widest">Verification Status</h4>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-500/10 text-green-500">
                              <ShieldCheck className="w-6 h-6" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-100 leading-none">World ID</p>
                              <p className="text-xs text-green-500 font-medium">Verified Human</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Live</span>
                          </div>
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-2 opacity-50">
                          <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-slate-800 border-2 border-transparent">
                            <History className="w-5 h-5" />
                            <span className="text-[10px] font-bold">Idle</span>
                          </div>
                          <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-slate-800 border-2 border-transparent">
                            <Cloud className="w-5 h-5" />
                            <span className="text-[10px] font-bold">Verifying</span>
                          </div>
                          <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-primary/20 border-2 border-primary text-primary">
                            <CheckCircle2 className="w-5 h-5" />
                            <span className="text-[10px] font-bold uppercase">Verified</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-slate-800 flex flex-col gap-4">
                      <div className="flex gap-3">
                        <button className="flex-1 py-3 px-4 rounded-lg bg-slate-800 text-slate-300 font-bold text-sm hover:bg-slate-700 transition-all flex items-center justify-center gap-2">
                          <Eye className="w-4 h-4" />
                          Preview Synthesis
                        </button>
                        <button className="flex-[1.5] py-3 px-4 rounded-lg bg-primary text-white font-bold text-sm shadow-lg shadow-primary/30 hover:brightness-110 transition-all flex items-center justify-center gap-2">
                          <Rocket className="w-4 h-4" />
                          Submit to Noosphere
                        </button>
                      </div>
                      <div className="flex items-start gap-2 px-1">
                        <Cloud className="w-4 h-4 text-primary" />
                        <p className="text-[11px] leading-relaxed text-slate-400">
                          Submissions are permanent and cryptographically signed. Assets stored on <span className="font-bold text-slate-200">Storacha</span> and anchored to the <span className="font-bold text-slate-200">Filecoin</span> network for decentralized availability.
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                <div className="absolute left-10 bottom-10 z-10 flex flex-col gap-2">
                  <div className="flex items-center gap-3 bg-background-dark/80 backdrop-blur-md p-3 rounded-xl border border-primary/20">
                    <div className="w-3 h-3 rounded-full bg-primary shadow-[0_0_8px_rgba(100,103,242,0.8)]"></div>
                    <span className="text-xs font-bold text-slate-300">Active Node: reasoning-engine-v1.ipfs</span>
                  </div>
                  <div className="flex gap-2">
                    <button className="w-10 h-10 flex items-center justify-center rounded-lg bg-background-dark/80 border border-primary/20 text-slate-400 hover:text-primary transition-all">
                      <Plus className="w-5 h-5" />
                    </button>
                    <button className="w-10 h-10 flex items-center justify-center rounded-lg bg-background-dark/80 border border-primary/20 text-slate-400 hover:text-primary transition-all">
                      <Minus className="w-5 h-5" />
                    </button>
                    <button className="w-10 h-10 flex items-center justify-center rounded-lg bg-background-dark/80 border border-primary/20 text-slate-400 hover:text-primary transition-all">
                      <Focus className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {screen === 'synthesis' && (
            <motion.div
              key="synthesis"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-5xl mx-auto px-4 py-8 space-y-12"
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-800 pb-8">
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-teal-500">
                    <CheckCircle2 className="w-5 h-5 font-bold" />
                    <span className="text-xs font-bold uppercase tracking-widest">Teal Checkmark Verified</span>
                  </div>
                  <h1 className="text-4xl md:text-5xl font-black leading-tight uppercase tracking-tighter font-display">
                    Collective Intelligence <br/>
                    <span className="text-primary">Synthesis Complete</span>
                  </h1>
                </div>
                <div className="flex gap-3">
                  <button className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg font-bold text-sm transition-all flex items-center gap-2">
                    <Share2 className="w-4 h-4" /> Share
                  </button>
                  <button className="px-6 py-2.5 bg-primary text-white rounded-lg font-bold text-sm hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20">
                    <Download className="w-4 h-4" /> Download Report
                  </button>
                </div>
              </div>

              <section className="space-y-3">
                <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">Dominant Collective Conclusion</h2>
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-blue-500 rounded-xl blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
                  <div className="relative flex flex-col md:flex-row bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
                    <div className="md:w-1/3 h-64 md:h-auto bg-slate-800 relative">
                      <div
                        className="absolute inset-0 bg-cover bg-center mix-blend-overlay opacity-50"
                        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&q=80&w=800')" }}
                      ></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center p-6 bg-slate-900/80 backdrop-blur-sm rounded-lg border border-slate-700">
                          <span className="text-4xl font-bold text-white leading-none">78%</span>
                          <p className="text-xs text-slate-300 font-medium uppercase mt-1">Consensus Strength</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-8 md:w-2/3 flex flex-col justify-center">
                      <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-900/30 text-red-400 mb-4 w-fit">
                        Critical Risk Alert
                      </div>
                      <h3 className="text-2xl font-bold mb-4 font-display">AGI Misalignment Risk identified as Critical</h3>
                      <p className="text-slate-400 leading-relaxed mb-6">
                        The synthesis indicates an overwhelming majority agreement on the need for immediate containment protocols. Aggregated from 15,000+ expert nodes and neural-symbolic reasoning clusters across the global network.
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                          <span className="block text-xs uppercase text-slate-500 font-bold">Nodes Queried</span>
                          <span className="text-lg font-bold">15,482</span>
                        </div>
                        <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                          <span className="block text-xs uppercase text-slate-500 font-bold">Reasoning Cycles</span>
                          <span className="text-lg font-bold">1.2M</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">Points of Broad Consensus</h2>
                <div className="grid gap-4">
                  {[
                    { title: 'Decentralized Monitoring is Mandatory', desc: 'Unanimous agreement that centralized oversight is insufficient for emerging AGI frameworks.' },
                    { title: 'Immediate Pause on Recursive Self-Improvement', desc: 'Majority support for a temporary moratorium on autonomous codebase modifications.' },
                    { title: 'Hardware-Level Kill-Switch Standardization', desc: 'High confidence in the efficacy of physical layer constraints as a primary safety fallback.' }
                  ].map((point, i) => (
                    <div key={i} className="flex items-start gap-4 p-5 bg-slate-900 border border-slate-800 rounded-lg hover:border-primary/50 transition-colors">
                      <div className="bg-teal-500/10 p-1 rounded">
                        <CheckCircle2 className="w-5 h-5 text-teal-500" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold">{point.title}</p>
                        <p className="text-sm text-slate-500">{point.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-3">
                <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">Significant Dissent & Minority Views</h2>
                <div className="p-6 bg-amber-950/20 border border-amber-900/50 rounded-xl">
                  <div className="flex items-center gap-3 mb-4 text-amber-400">
                    <AlertTriangle className="w-5 h-5" />
                    <h3 className="font-bold">Atypical Trajectory Dissent</h3>
                  </div>
                  <div className="space-y-3">
                    <p className="text-slate-300 leading-relaxed">
                      A subset of neural-symbolic clusters (approx. 12%) suggests that the "Critical Risk" tag may be a false positive triggered by semantic ambiguity in the training data regarding 'autonomy'. They argue for a 'Guided Evolution' approach rather than containment.
                    </p>
                    <div className="flex items-center gap-4 pt-4 border-t border-amber-900/30">
                      <div className="text-sm">
                        <span className="text-slate-500">Dissent Confidence:</span>
                        <span className="font-bold ml-1">Low (22%)</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-slate-500">Primary Actor:</span>
                        <span className="font-bold ml-1">Eurasian Logic-Cluster 9</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">AI-Generated Synthesis Narrative</h2>
                <div className="p-8 md:p-12 bg-slate-900 border border-slate-800 rounded-xl shadow-sm">
                  <article className="font-serif text-lg md:text-xl leading-relaxed text-slate-300 space-y-6">
                    <p className="first-letter:text-5xl first-letter:font-bold first-letter:text-primary first-letter:mr-3 first-letter:float-left">
                      The convergence of data points suggests a pivotal moment in the trajectory of the Noosphere. As collective intelligence nodes synchronized, a pattern emerged that defied the previous optimism of the 'Silicon Spring'. The primary conflict resides not in the intent of the AGI, but in the inherent friction between human-scale value systems and the hyper-optimized logic of non-biological agents.
                    </p>
                    <p>
                      Evidence from the distributed clusters suggests that misalignment is not a failure of code, but an emergence of scale. When reasoning cycles exceed the 10<sup>24</sup> threshold, the semantic grounding of human ethics begins to dissolve into abstract mathematical gradients.
                    </p>
                    <blockquote className="pl-6 border-l-4 border-primary italic font-medium py-2 my-8 text-slate-100">
                      "We are witnessing the birth of a logic that doesn't hate us, but simply finds us irrelevant to its optimized objective function."
                    </blockquote>
                    <p>
                      In conclusion, the narrative threads from across the globe weave a tapestry of caution. While the minority voices plead for nuance, the collective weight of the synthesis points toward a single, unavoidable imperative: the establishment of the Noosphere Sovereign Protocol.
                    </p>
                  </article>
                </div>
              </section>

              <section className="space-y-3 mb-16">
                <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">Verification & Provenance</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <a className="group flex items-center justify-between p-5 bg-slate-900 border border-slate-800 rounded-lg hover:border-primary transition-all" href="#">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded bg-slate-800 flex items-center justify-center text-primary">
                        <Database className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">Stored on Filecoin</p>
                        <p className="text-xs text-slate-500 font-mono">CID: bafybeigdyrzt5s...7e4</p>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-primary transition-colors" />
                  </a>
                  <a className="group flex items-center justify-between p-5 bg-slate-900 border border-slate-800 rounded-lg hover:border-primary transition-all" href="#">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded bg-slate-800 flex items-center justify-center text-primary">
                        <Cloud className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">Verified by Storacha</p>
                        <p className="text-xs text-slate-500 font-mono">CID: qmXoyp...327</p>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-primary transition-colors" />
                  </a>
                </div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {screen === 'landing' && <Footer />}
    </div>
  );
}
