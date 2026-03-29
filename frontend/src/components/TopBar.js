import React from 'react';
import { Loader2 } from 'lucide-react';

const tabs = [
  { id: 'dashboard', label: 'Analytics' },
  { id: 'search', label: 'Search' },
  { id: 'upload', label: 'Upload' },
  { id: 'candidates', label: 'Candidates' },
];

export default function TopBar({ activePage, onPageChange, indexing, indexElapsed }) {
  return (
    <header className="topbar">
      <div className="topbar-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`topbar-tab ${activePage === tab.id ? 'active' : ''}`}
            onClick={() => onPageChange(tab.id)}
          >
            {tab.label}
            {tab.id === 'upload' && indexing && (
              <Loader2 size={13} className="tab-spinner" />
            )}
          </button>
        ))}
      </div>

      <div className="topbar-right">
        {indexing && (
          <div className="topbar-indexing-pill">
            <Loader2 size={14} className="tab-spinner" />
            <span>Indexing… {Math.floor(indexElapsed / 60)}m {indexElapsed % 60}s</span>
          </div>
        )}
      </div>
    </header>
  );
}
