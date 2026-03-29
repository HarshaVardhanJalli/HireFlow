import React from 'react';
import {
  LayoutDashboard,
  Search,
  Upload,
  Users,
  Settings,
} from 'lucide-react';
import Logo from './Logo';

const navItems = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'search', icon: Search, label: 'Search' },
  { id: 'upload', icon: Upload, label: 'Upload' },
  { id: 'candidates', icon: Users, label: 'Candidates' },
];

const statusItems = [
  { key: 'api', label: 'API Server', onlineLabel: 'Live', offlineLabel: 'Down' },
  { key: 'vector', label: 'Vector Store', onlineLabel: 'Ready', offlineLabel: 'Off' },
  { key: 'search', label: 'Search Engine', onlineLabel: 'Active', offlineLabel: 'Off' },
];

export default function Sidebar({ activePage, onPageChange, status, backendOnline }) {
  const statusMap = {
    api: backendOnline,
    vector: status.vector_store_ready,
    search: status.hybrid_ready,
  };

  return (
    <nav className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <Logo size={34} />
        <span className="sidebar-brand-name">HireFlow</span>
      </div>

      {/* Section label */}
      <div className="sidebar-section-label">Menu</div>

      {/* Navigation */}
      <div className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`sidebar-btn ${activePage === item.id ? 'active' : ''}`}
              onClick={() => onPageChange(item.id)}
              title={item.label}
            >
              <Icon size={20} strokeWidth={activePage === item.id ? 2.2 : 1.7} />
              <span className="sidebar-label">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Bottom section */}
      <div className="sidebar-bottom">
        {/* Status card */}
        <div className="sidebar-status-section">
          {statusItems.map((item) => {
            const online = statusMap[item.key];
            return (
              <div
                key={item.key}
                className="sidebar-status-row"
                title={online ? `${item.label} connected` : `${item.label} offline`}
              >
                <span className={`glow-dot small ${online ? 'green' : 'red'}`} />
                <span className="sidebar-status-label">{item.label}</span>
                <span className={`sidebar-status-value ${online ? '' : 'offline'}`}>
                  {online ? item.onlineLabel : item.offlineLabel}
                </span>
              </div>
            );
          })}
        </div>

        <div className="sidebar-divider" />

        <button className="sidebar-btn" title="Settings">
          <Settings size={20} strokeWidth={1.7} />
          <span className="sidebar-label">Settings</span>
        </button>
      </div>
    </nav>
  );
}
