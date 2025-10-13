import React, { useState, useEffect } from 'react';

interface TabbedPanelsProps { 
  children: React.ReactNode; 
  actionsRight?: React.ReactNode;
}

type TabPaneElement = React.ReactElement<{ ['data-tab']?: string }>;

function hasDataTab(el: unknown): el is TabPaneElement {
  return React.isValidElement(el) && typeof (el.props as Record<string, unknown>)['data-tab'] === 'string';
}

export function TabbedPanels({ children, actionsRight }: TabbedPanelsProps) {
  const raw = React.Children.toArray(children);
  const panes = raw.filter(hasDataTab);
  const tabNames = panes.map(p => p.props['data-tab'] || 'Tab');
  const [active, setActive] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('ds_active_tab');
      if (stored && tabNames.includes(stored)) return stored;
    }
    return tabNames[0] || 'Tab';
  });
  
  // Ajustar si desaparece pestaña activa
  useEffect(() => {
    if (tabNames.length && !tabNames.includes(active)) setActive(tabNames[0]);
  }, [active, tabNames]);
  
  useEffect(() => {
    try { localStorage.setItem('ds_active_tab', active); } catch { /* ignore */ }
  }, [active]);
  
  if (!panes.length) return null;
  
  return (
    <div className="tabs-wrapper">
      <div className="tabs-nav" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'.75rem', flexWrap:'wrap' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'.4rem', flexWrap:'wrap' }}>
          {tabNames.map(tab => (
            <button key={tab} type="button" className={`tab-btn ${tab === active ? 'active' : ''}`} onClick={() => setActive(tab)}>
              {tab}
            </button>
          ))}
        </div>
        {actionsRight && (
          <div className="tabs-actions" style={{ display:'flex', alignItems:'center', gap:'.5rem' }}>
            {actionsRight}
          </div>
        )}
      </div>
      <div className="tabs-content">
        {panes.filter(p => (p.props['data-tab'] || 'Tab') === active)}
      </div>
    </div>
  );
}