import React from 'react';
import {
  Activity,
  Search,
  Download,
  Lightbulb,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';
import StatCards from '../components/StatCards';

function StatusRow({ ready, label }) {
  return (
    <div className="status-indicator">
      <span className={`glow-dot ${ready ? 'green' : 'red'}`} />
      <span className="status-label">{label}</span>
      <span className="status-value">
        {ready ? (
          <><CheckCircle2 size={14} style={{ color: '#00b894', verticalAlign: 'middle', marginRight: 4 }} />Ready</>
        ) : (
          <><XCircle size={14} style={{ color: '#ff6b6b', verticalAlign: 'middle', marginRight: 4 }} />Offline</>
        )}
      </span>
    </div>
  );
}

export default function DashboardPage({
  status,
  backendOnline,
  searchCount,
  recentSearches,
  onNavigate,
}) {
  return (
    <div>
      <StatCards status={status} searchCount={searchCount} backendOnline={backendOnline} />

      <div className="content-grid">
        {/* ---- Left column ---- */}
        <div>
          {/* System Overview */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <h2>
                <Activity size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />
                System Overview
              </h2>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <StatusRow ready={backendOnline} label="FastAPI Backend" />
                <StatusRow ready={status.resumes_ready} label="Resume Index (BM25)" />
                <StatusRow ready={status.vector_store_ready} label="Vector Store (Pinecone)" />
                <StatusRow ready={status.hybrid_ready} label="Hybrid Search Engine" />

                <div style={{ marginTop: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#8b8fa8', marginBottom: 4 }}>
                    <span>Vectors Indexed</span>
                    <span>{status.pinecone_vector_count || 0}</span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-bar-fill purple"
                      style={{ width: `${Math.min(100, (status.pinecone_vector_count || 0) * 2)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Searches */}
          <div className="card">
            <div className="card-header">
              <h2>
                <Clock size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />
                Recent Searches
              </h2>
            </div>
            <div className="card-body">
              {recentSearches.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {recentSearches.map((s, i) => (
                    <div key={i} className="recent-search-item">
                      <Search size={14} style={{ flexShrink: 0, color: '#6c5ce7' }} />
                      <span>{s.length > 100 ? s.slice(0, 100) + '...' : s}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 24, color: '#8b8fa8', fontSize: 13 }}>
                  No searches yet — go to the Search tab to get started!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ---- Right column ---- */}
        <div className="status-panel">
          <div className="card">
            <div className="card-header">
              <h2>
                <Lightbulb size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />
                Quick Actions
              </h2>
            </div>
            <div className="card-body">
              <div className="quick-actions">
                <button className="btn btn-primary" onClick={() => onNavigate('search')}>
                  <Search size={16} /> Search Candidates
                </button>
                <button className="btn btn-success" onClick={() => onNavigate('upload')}>
                  <Download size={16} /> Index Resumes
                </button>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2>
                <Lightbulb size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />
                Tips
              </h2>
            </div>
            <div className="card-body">
              <div style={{ fontSize: 12, color: '#6b7094', lineHeight: 1.8 }}>
                <p style={{ marginBottom: 8 }}>
                  <strong>Hybrid Search</strong> combines keyword matching (BM25) with AI
                  semantic understanding (Vector) for the best results.
                </p>
                <p style={{ marginBottom: 8 }}>
                  <strong>RRF Score</strong> (Reciprocal Rank Fusion) merges both rankings —
                  higher means the candidate appeared at the top in both methods.
                </p>
                <p>
                  <strong>Pro tip:</strong> Write detailed job descriptions for more accurate
                  semantic matching!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
