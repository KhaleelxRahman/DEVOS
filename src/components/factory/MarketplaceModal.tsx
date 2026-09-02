import React, { useState, useEffect } from 'react';
import {
  X,
  Store,
  Star,
  Code2,
  Search,
  Layers,
  Sparkles,
} from 'lucide-react';
import { appApi } from '../../api';
import { Button, Badge } from '../common';
import { useToast } from '../common/Toast';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../../hooks/useProject';

interface MarketplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAppPrompt?: (prompt: string, techStack: string) => void;
}

export const MarketplaceModal: React.FC<MarketplaceModalProps> = ({
  isOpen,
  onClose,
  onSelectAppPrompt,
}) => {
  const [apps, setApps] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { setActiveProject } = useProject();

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    appApi
      .getMarketplaceApps()
      .then((res) => {
        if (res.success && res.data?.apps) {
          setApps(res.data.apps);
        }
      })
      .catch(() => {
        toast('Failed to load marketplace apps', 'error');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isOpen, toast]);

  if (!isOpen) return null;

  const filteredApps = apps.filter((app) => {
    const matchesSearch =
      app.name.toLowerCase().includes(search.toLowerCase()) ||
      app.description.toLowerCase().includes(search.toLowerCase()) ||
      app.techStack.toLowerCase().includes(search.toLowerCase());
    const matchesCat =
      selectedCategory === 'all' ||
      (selectedCategory === 'custom' ? app.isCustom : !app.isCustom);
    return matchesSearch && matchesCat;
  });

  const handleOpenAppInWorkspace = (app: any) => {
    if (app.id) {
      setActiveProject({
        id: app.id,
        user_id: 'default',
        name: app.name,
        description: app.description,
        technologies: (app.techStack || '').split(' + '),
        repository_url: 'https://github.com/devos/' + app.id,
        default_branch: 'main',
        created_at: app.lastUpdated || new Date().toISOString(),
        updated_at: app.lastUpdated || new Date().toISOString(),
      });
      localStorage.setItem('devos_active_project_id', app.id);
      toast(`Switched active workspace to ${app.name}`, 'success');
      onClose();
      navigate('/app/workspace');
    }
  };


  const handleEditWithAI = (app: any) => {
    if (onSelectAppPrompt) {
      onSelectAppPrompt(`Rebuild and extend ${app.name}: ${app.description}`, app.techStack);
      onClose();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '1000px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden',
          color: '#f8fafc',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            background: '#1e293b',
            borderBottom: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
              }}
            >
              <Store size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>AI App Marketplace</h3>
                <Badge variant="accent">{apps.length} Verified Apps</Badge>
              </div>
              <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>
                Curated ready-to-run templates &amp; user-generated projects
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 6,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Search & Filters */}
        <div
          style={{
            padding: '12px 20px',
            background: '#0f172a',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#1e293b', padding: '6px 12px', borderRadius: 8, flex: 1, minWidth: 240, border: '1px solid #334155' }}>
            <Search size={14} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search apps by name, stack, keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#f8fafc',
                fontSize: '12px',
                outline: 'none',
                width: '100%',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { id: 'all', label: 'All Apps' },
              { id: 'curated', label: 'Curated Archetypes' },
              { id: 'custom', label: 'My Generated Apps' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: 'none',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: selectedCategory === cat.id ? '#3b82f6' : '#1e293b',
                  color: selectedCategory === cat.id ? '#ffffff' : '#94a3b8',
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Apps Grid */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {isLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
              Loading marketplace inventory...
            </div>
          ) : filteredApps.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
              No applications matched your search.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
              {filteredApps.map((app) => (
                <div
                  key={app.id}
                  style={{
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: 12,
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            background: 'rgba(59, 130, 246, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#60a5fa',
                          }}
                        >
                          <Layers size={15} />
                        </div>
                        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                          {app.name}
                        </h4>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '11px', color: '#f59e0b', fontWeight: 700 }}>
                        <Star size={12} fill="#f59e0b" />
                        <span>{app.stars}</span>
                      </div>
                    </div>

                    <p style={{ margin: 0, fontSize: '12px', color: '#cbd5e1', lineHeight: 1.4, minHeight: 34 }}>
                      {app.description}
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid #334155', paddingTop: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px' }}>
                      <span style={{ color: '#94a3b8' }}>Stack: {app.techStack}</span>
                      <span
                        style={{
                          color: app.deployStatus === 'deployed' ? '#10b981' : '#f59e0b',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                        }}
                      >
                        ● {app.deployStatus}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => handleOpenAppInWorkspace(app)}
                        style={{
                          flex: 1,
                          background: '#3b82f6',
                          color: '#ffffff',
                          border: 'none',
                          padding: '6px 10px',
                          borderRadius: 6,
                          fontSize: '11px',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4,
                          cursor: 'pointer',
                        }}
                      >
                        <Code2 size={12} /> Open in IDE
                      </button>

                      <button
                        onClick={() => handleEditWithAI(app)}
                        style={{
                          background: '#0f172a',
                          color: '#38bdf8',
                          border: '1px solid #334155',
                          padding: '6px 10px',
                          borderRadius: 6,
                          fontSize: '11px',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          cursor: 'pointer',
                        }}
                      >
                        <Sparkles size={12} /> Edit
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            background: '#1e293b',
            borderTop: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
            Apps are fully functional with live repository source trees and real compiler verification
          </span>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
