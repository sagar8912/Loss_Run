import React from 'react';
import { LayoutDashboard, UploadCloud, Activity, Wand2, ShieldCheck, Layers, FileOutput } from 'lucide-react';

export function Sidebar() {
  const navItems = [
    { id: 'upload', icon: UploadCloud, label: 'Upload Files' },
    { id: 'agent-workflow', icon: Activity, label: 'Agent Workflow' },
    { id: 'transformation', icon: Wand2, label: 'Transformation' },
    { id: 'validation', icon: ShieldCheck, label: 'Validation' },
    { id: 'rollup', icon: Layers, label: 'Rollup Summary' },
    { id: 'final-output', icon: FileOutput, label: 'Final Output' },
  ];

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <aside className="sidebar">
      <div style={{ padding: '0 24px', marginBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            background: 'var(--accent-color)', 
            color: '#fff', 
            fontWeight: 800, 
            fontSize: '1.1rem', 
            padding: '4px 6px', 
            borderRadius: '4px',
            letterSpacing: '1px',
            lineHeight: 1
          }}>
            EXL
          </div>
          <h2 style={{ fontSize: '1.2rem', color: 'var(--text-main)', margin: 0, fontWeight: 600 }}>
            Loss Run AI
          </h2>
        </div>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 12px' }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                color: 'var(--text-muted)',
                borderRadius: '8px',
                width: '100%',
                textAlign: 'left',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--text-muted)';
              }}
            >
              <Icon size={18} />
              <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
