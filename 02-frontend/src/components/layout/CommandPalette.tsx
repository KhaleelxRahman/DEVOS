import React, { useEffect, useMemo, useState } from 'react';
import { Command, FolderPlus, LayoutDashboard, Settings, Sparkles, Terminal, Github, ListTodo, MessageSquare, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

const commands = [
  { label: 'Open dashboard', hint: 'Pages', icon: LayoutDashboard, path: '/app/dashboard' },
  { label: 'Create project', hint: 'Projects', icon: FolderPlus, path: '/app/projects' },
  { label: 'Search projects', hint: 'Projects', icon: Search, path: '/app/projects' },
  { label: 'Open workspace', hint: 'Pages', icon: Terminal, path: '/app/workspace' },
  { label: 'AI command center', hint: 'AI', icon: Sparkles, path: '/app/workspace#ai-command-center' },
  { label: 'Open conversations', hint: 'AI', icon: MessageSquare, path: '/app/workspace#ai-command-center' },
  { label: 'Open planner', hint: 'AI', icon: ListTodo, path: '/app/workspace#ai-command-center' },
  { label: 'Open GitHub', hint: 'GitHub', icon: Github, path: '/app/github' },
  { label: 'Open settings', hint: 'Settings', icon: Settings, path: '/app/settings' },
];

type Command = (typeof commands)[number];

const fuzzyScore = (command: Command, query: string) => {
  if (!query.trim()) return 0;
  const haystack = `${command.label} ${command.hint}`.toLowerCase();
  const needle = query.toLowerCase().replace(/\s+/g, '');
  let cursor = 0;
  let score = 0;
  for (const character of needle) {
    const match = haystack.indexOf(character, cursor);
    if (match === -1) return -1;
    score += match === cursor ? 3 : 1;
    cursor = match + 1;
  }
  if (command.label.toLowerCase().startsWith(query.toLowerCase())) score += 10;
  return score;
};

export const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [recent, setRecent] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('devos_recent_commands') || '[]'); }
    catch { return []; }
  });
  const filtered = useMemo(() => commands
    .map((command) => ({ command, score: fuzzyScore(command, query) }))
    .filter(({ score }) => !query.trim() || score >= 0)
    .sort((left, right) => right.score - left.score)
    .map(({ command }) => command), [query]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIndex(0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  if (!open) return null;

  const execute = (command: Command) => {
    setRecent((previous) => {
      const next = [command.label, ...previous.filter((label) => label !== command.label)].slice(0, 8);
      localStorage.setItem('devos_recent_commands', JSON.stringify(next));
      return next;
    });
    navigate(command.path);
    onClose();
  };
  const highlight = (label: string) => {
    if (!query.trim()) return label;
    const needle = query.toLowerCase().replace(/\s+/g, '');
    let cursor = 0;
    return label.split('').map((character, index) => {
      const match = needle.indexOf(character.toLowerCase(), cursor);
      if (match === -1) return <React.Fragment key={index}>{character}</React.Fragment>;
      cursor = match + 1;
      return <mark key={index}>{character}</mark>;
    });
  };

  return (
    <div className="command-palette-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="command-palette" role="dialog" aria-modal="true" aria-label="Command palette" onMouseDown={(event) => event.stopPropagation()}>
        <div className="command-palette-input">
          <Command size={17} />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setActiveIndex((index) => filtered.length ? (index + 1) % filtered.length : 0);
              }
              if (event.key === 'ArrowUp') {
                event.preventDefault();
                setActiveIndex((index) => filtered.length ? (index - 1 + filtered.length) % filtered.length : 0);
              }
              if (event.key === 'Home') { event.preventDefault(); setActiveIndex(0); }
              if (event.key === 'End') { event.preventDefault(); setActiveIndex(Math.max(filtered.length - 1, 0)); }
              if (event.key === 'Tab' && filtered.length) { event.preventDefault(); setActiveIndex((index) => (index + 1) % filtered.length); }
              if (event.key === 'Enter' && filtered[activeIndex]) {
                execute(filtered[activeIndex]);
              }
            }}
            placeholder="Search commands..."
            aria-label="Search commands"
          />
          <kbd>ESC</kbd>
        </div>
        <div className="command-palette-list">
          {filtered.map(({ label, hint, icon: Icon }, index) => (
            <button key={label} className={`command-palette-item ${index === activeIndex ? 'selected' : ''}`} onClick={() => {
              const command = commands.find((item) => item.label === label);
              if (command) execute(command);
            }}>
              <Icon size={16} />
              <span>{highlight(label)}</span>
              <small>{hint}</small>
            </button>
          ))}
          {!query && recent.length > 0 && <div className="command-palette-recent" aria-label="Recent commands">
            <span>Recent</span>
            {recent.map((label) => <small key={label}>{label}</small>)}
          </div>}
          {!filtered.length && <p className="command-palette-empty">No commands found.</p>}
        </div>
        <footer><span>Navigate with your keyboard</span><span><kbd>CTRL</kbd> <kbd>K</kbd> to toggle</span></footer>
      </section>
    </div>
  );
};
