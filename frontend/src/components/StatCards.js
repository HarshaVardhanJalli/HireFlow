import React from 'react';
import { FileText, Search, Database, Zap } from 'lucide-react';

export default function StatCards({ status, searchCount, backendOnline }) {
  const cards = [
    {
      icon: <FileText size={20} />,
      label: 'Resumes Indexed',
      value: status.pinecone_vector_count || 0,
      ready: status.resumes_ready,
      change: status.resumes_ready ? 'Ready' : 'Not indexed',
      changeType: status.resumes_ready ? 'positive' : 'info',
    },
    {
      icon: <Search size={20} />,
      label: 'Searches Performed',
      value: searchCount,
      ready: null, // no status dot for this one
      change: 'This session',
      changeType: 'info',
    },
    {
      icon: <Database size={20} />,
      label: 'Vector Store',
      value: status.vector_store_ready ? 'Online' : 'Offline',
      ready: status.vector_store_ready,
      change: status.vector_store_ready ? 'Pinecone connected' : 'Not connected',
      changeType: status.vector_store_ready ? 'positive' : 'info',
    },
    {
      icon: <Zap size={20} />,
      label: 'Hybrid Search',
      value: status.hybrid_ready ? 'Active' : 'Inactive',
      ready: status.hybrid_ready,
      change: status.hybrid_ready ? 'BM25 + Vector' : 'Index first',
      changeType: status.hybrid_ready ? 'positive' : 'info',
    },
  ];

  return (
    <div className="stats-row">
      {cards.map((card, i) => (
        <div className="stat-card" key={i}>
          <div className="stat-card-header">
            <div className="stat-card-icon">{card.icon}</div>
            <span className="stat-card-label">{card.label}</span>
            {card.ready !== null && (
              <span className={`glow-dot small ${card.ready ? 'green' : 'red'}`} />
            )}
          </div>
          <div className="stat-card-value">{card.value}</div>
          <span className={`stat-card-change ${card.changeType}`}>{card.change}</span>
        </div>
      ))}
    </div>
  );
}
