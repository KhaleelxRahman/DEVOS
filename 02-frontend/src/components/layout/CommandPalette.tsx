import React, { useEffect, useState } from 'react';
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

export const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const filtered = commands.filter((command) => command.label.toLowerCase().includes(query.toLowerCase()));

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
              if (event.key === 'Enter' && filtered[activeIndex]) {
                navigate(filtered[activeIndex].path);
                onClose();
              }
            }}
            placeholder="Search commands..."
            aria-label="Search commands"
          />
          <kbd>ESC</kbd>
        </div>
        <div className="command-palette-list">
          {filtered.map(({ label, hint, icon: Icon, path }, index) => (
            <button key={label} className={`command-palette-item ${index === activeIndex ? 'selected' : ''}`} onClick={() => { navigate(path); onClose(); }}>
              <Icon size={16} />
              <span>{label}</span>
              <small>{hint}</small>
            </button>
          ))}
          {!filtered.length && <p className="command-palette-empty">No commands found.</p>}
        </div>
        <footer><span>Navigate with your keyboard</span><span><kbd>CTRL</kbd> <kbd>K</kbd> to toggle</span></footer>
      </section>
    </div>
  );
};
