import React, { useEffect, useState } from 'react';
import { Command, FolderPlus, LayoutDashboard, Settings, Sparkles, Terminal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

const commands = [
  { label: 'Open dashboard', hint: 'Navigate', icon: LayoutDashboard, path: '/app/dashboard' },
  { label: 'Create project', hint: 'Navigate', icon: FolderPlus, path: '/app/projects' },
  { label: 'Open workspace', hint: 'Navigate', icon: Terminal, path: '/app/workspace' },
  { label: 'AI command center', hint: 'Navigate', icon: Sparkles, path: '/app/workspace#ai-command-center' },
  { label: 'Open settings', hint: 'Navigate', icon: Settings, path: '/app/settings' },
];

export const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const filtered = commands.filter((command) => command.label.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    if (!open) return;
    setQuery('');
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="command-palette-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="command-palette" role="dialog" aria-modal="true" aria-label="Command palette" onMouseDown={(event) => event.stopPropagation()}>
        <div className="command-palette-input">
          <Command size={17} />
          <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search commands..." aria-label="Search commands" />
          <kbd>ESC</kbd>
        </div>
        <div className="command-palette-list">
          {filtered.map(({ label, hint, icon: Icon, path }) => (
            <button key={label} className="command-palette-item" onClick={() => { navigate(path); onClose(); }}>
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
