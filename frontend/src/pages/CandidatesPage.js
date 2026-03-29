import React, { useState } from 'react';
import {
  Users, Search, Star, ChevronRight, Trash2,
  FileText, MapPin, Briefcase, Tag, StickyNote,
  ChevronDown, Clock,
} from 'lucide-react';
import CandidateCard from '../components/CandidateCard';

/* ============================================================
   CANDIDATES PAGE
   – Search results tab
   – Full hiring pipeline with stage management
   ============================================================ */

export default function CandidatesPage({
  lastResults,
  lastQuery,
  shortlist,
  pipelineStages,
  onShortlist,
  onViewResume,
  onUpdateStage,
  onUpdateNotes,
  onRemoveFromShortlist,
  isShortlisted,
  addToast,
}) {
  const [activeTab, setActiveTab] = useState('pipeline');

  const pipelineCounts = {};
  (pipelineStages || []).forEach((s) => { pipelineCounts[s.id] = 0; });
  (shortlist || []).forEach((s) => { if (pipelineCounts[s.stage] !== undefined) pipelineCounts[s.stage]++; });

  return (
    <div>
      {/* ---- Tab switcher ---- */}
      <div className="candidates-tab-bar">
        <button
          className={`candidates-tab ${activeTab === 'pipeline' ? 'active' : ''}`}
          onClick={() => setActiveTab('pipeline')}
        >
          <Star size={15} />
          Hiring Pipeline
          {shortlist && shortlist.length > 0 && (
            <span className="candidates-tab-count">{shortlist.length}</span>
          )}
        </button>
        <button
          className={`candidates-tab ${activeTab === 'results' ? 'active' : ''}`}
          onClick={() => setActiveTab('results')}
        >
          <Search size={15} />
          Search Results
          {lastResults && lastResults.length > 0 && (
            <span className="candidates-tab-count">{lastResults.length}</span>
          )}
        </button>
      </div>

      {/* ---- Pipeline Tab ---- */}
      {activeTab === 'pipeline' && (
        <PipelineView
          shortlist={shortlist}
          pipelineStages={pipelineStages}
          pipelineCounts={pipelineCounts}
          onUpdateStage={onUpdateStage}
          onUpdateNotes={onUpdateNotes}
          onRemoveFromShortlist={onRemoveFromShortlist}
          onViewResume={onViewResume}
          addToast={addToast}
        />
      )}

      {/* ---- Search Results Tab ---- */}
      {activeTab === 'results' && (
        <ResultsView
          lastResults={lastResults}
          lastQuery={lastQuery}
          onShortlist={onShortlist}
          onViewResume={onViewResume}
          isShortlisted={isShortlisted}
        />
      )}
    </div>
  );
}


/* ============================================================
   PIPELINE VIEW – Kanban-style hiring stages
   ============================================================ */
function PipelineView({
  shortlist,
  pipelineStages,
  pipelineCounts,
  onUpdateStage,
  onUpdateNotes,
  onRemoveFromShortlist,
  onViewResume,
  addToast,
}) {
  if (!shortlist || shortlist.length === 0) {
    return (
      <div className="card">
        <div className="empty-state">
          <div className="empty-state-icon"><Star size={52} strokeWidth={1.2} /></div>
          <h3>No Shortlisted Candidates</h3>
          <p>
            Search for candidates and click "Shortlist Candidate" to add them
            to your hiring pipeline. Track their progress from screening to hired.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* ---- Pipeline stats bar ---- */}
      <div className="pipeline-stats-bar">
        {pipelineStages.map((stage) => (
          <div key={stage.id} className="pipeline-stat-chip">
            <span className="pipeline-stat-dot" style={{ background: stage.color }} />
            <span className="pipeline-stat-label">{stage.label}</span>
            <span className="pipeline-stat-count" style={{ color: stage.color }}>
              {pipelineCounts[stage.id] || 0}
            </span>
          </div>
        ))}
      </div>

      {/* ---- Pipeline columns ---- */}
      <div className="pipeline-board">
        {pipelineStages.map((stage) => {
          const candidates = shortlist.filter((s) => s.stage === stage.id);
          return (
            <div key={stage.id} className="pipeline-column">
              <div className="pipeline-column-header" style={{ borderTopColor: stage.color }}>
                <span className="pipeline-column-icon">{stage.icon}</span>
                <span className="pipeline-column-title">{stage.label}</span>
                <span
                  className="pipeline-column-count"
                  style={{ background: `${stage.color}18`, color: stage.color }}
                >
                  {candidates.length}
                </span>
              </div>

              <div className="pipeline-column-body">
                {candidates.length === 0 && (
                  <div className="pipeline-empty">
                    <span>No candidates</span>
                  </div>
                )}
                {candidates.map((c) => (
                  <PipelineCard
                    key={c.candidate_id}
                    candidate={c}
                    stages={pipelineStages}
                    currentStage={stage}
                    onUpdateStage={onUpdateStage}
                    onUpdateNotes={onUpdateNotes}
                    onRemove={onRemoveFromShortlist}
                    onViewResume={onViewResume}
                    addToast={addToast}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


/* ============================================================
   PIPELINE CARD – Individual candidate in a pipeline column
   ============================================================ */
function PipelineCard({ candidate, stages, currentStage, onUpdateStage, onUpdateNotes, onRemove, onViewResume, addToast }) {
  const [expanded, setExpanded] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState(candidate.notes || '');
  const c = candidate;

  const currentIdx = stages.findIndex((s) => s.id === currentStage.id);

  // Get available next stages (any stage except current)
  const moveOptions = stages.filter((s) => s.id !== currentStage.id);

  const saveNotes = () => {
    onUpdateNotes(c.candidate_id, notesDraft);
    setEditingNotes(false);
    addToast('Notes saved', 'success');
  };

  const timeAgo = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="pipeline-card">
      {/* Top row */}
      <div className="pipeline-card-top" onClick={() => setExpanded(!expanded)}>
        <div className="pipeline-card-avatar">
          {(c.name || '?').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)}
        </div>
        <div className="pipeline-card-info">
          <div className="pipeline-card-name">{c.name || 'Unknown'}</div>
          <div className="pipeline-card-meta">
            {c.location && <span><MapPin size={11} /> {c.location}</span>}
            {c.experience != null && <span><Briefcase size={11} /> {c.experience}y</span>}
          </div>
        </div>
        <ChevronDown
          size={14}
          className={`pipeline-card-chevron ${expanded ? 'expanded' : ''}`}
        />
      </div>

      {/* Time added */}
      <div className="pipeline-card-time">
        <Clock size={10} />
        {timeAgo(c.shortlisted_at)}
      </div>

      {/* Skills preview */}
      {c.skills && c.skills.length > 0 && (
        <div className="pipeline-card-skills">
          {c.skills.slice(0, 4).map((s, i) => (
            <span key={i} className="pipeline-skill-tag">{s}</span>
          ))}
          {c.skills.length > 4 && (
            <span className="pipeline-skill-more">+{c.skills.length - 4}</span>
          )}
        </div>
      )}

      {/* Expanded section */}
      {expanded && (
        <div className="pipeline-card-expanded">
          {/* Notes */}
          <div className="pipeline-notes-section">
            <div className="pipeline-notes-header">
              <StickyNote size={13} /> Notes
            </div>
            {editingNotes ? (
              <div className="pipeline-notes-edit">
                <textarea
                  className="pipeline-notes-textarea"
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  placeholder="Add interview notes, feedback, reminders…"
                  rows={3}
                  autoFocus
                />
                <div className="pipeline-notes-actions">
                  <button className="btn btn-xs btn-primary" onClick={saveNotes}>Save</button>
                  <button className="btn btn-xs btn-ghost" onClick={() => { setEditingNotes(false); setNotesDraft(c.notes || ''); }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div
                className="pipeline-notes-display"
                onClick={() => setEditingNotes(true)}
              >
                {c.notes || <span className="pipeline-notes-placeholder">Click to add notes…</span>}
              </div>
            )}
          </div>

          {/* Move to stage */}
          <div className="pipeline-move-section">
            <span className="pipeline-move-label">Move to:</span>
            <div className="pipeline-move-buttons">
              {moveOptions.map((s) => (
                <button
                  key={s.id}
                  className="pipeline-move-btn"
                  style={{ borderColor: s.color, color: s.color }}
                  onClick={() => {
                    onUpdateStage(c.candidate_id, s.id);
                    addToast(`${c.name} moved to ${s.label}`, 'success');
                  }}
                >
                  {s.icon} {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="pipeline-card-actions">
            <button
              className="btn btn-xs btn-outline"
              onClick={() => onViewResume && onViewResume(c)}
            >
              <FileText size={12} /> Resume
            </button>
            <button
              className="btn btn-xs btn-danger"
              onClick={() => {
                onRemove(c.candidate_id);
                addToast(`${c.name} removed from pipeline`, 'info');
              }}
            >
              <Trash2 size={12} /> Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


/* ============================================================
   RESULTS VIEW – Search results with shortlist buttons
   ============================================================ */
function ResultsView({ lastResults, lastQuery, onShortlist, onViewResume, isShortlisted }) {
  if (!lastResults || lastResults.length === 0) {
    return (
      <div className="card">
        <div className="empty-state">
          <div className="empty-state-icon">
            <Users size={52} strokeWidth={1.2} />
          </div>
          <h3>No Search Results Yet</h3>
          <p>
            Run a search first to see candidate results here. Go to the Search
            tab and enter a job description to find matching candidates.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="results-header">
        <h2>
          <Users size={22} style={{ verticalAlign: 'middle', marginRight: 8 }} />
          Search Results
        </h2>
        <span className="results-count">{lastResults.length} candidates</span>
      </div>

      {lastQuery && (
        <div className="search-context-banner">
          <Search size={14} />
          <span>Results for: <strong>{lastQuery.length > 80 ? lastQuery.slice(0, 80) + '…' : lastQuery}</strong></span>
        </div>
      )}

      {lastResults.map((c, i) => (
        <CandidateCard
          key={c.candidate_id || i}
          candidate={c}
          rank={i}
          showAllScores
          searchQuery={lastQuery || ''}
          onViewResume={onViewResume}
          onShortlist={onShortlist}
          isShortlisted={isShortlisted}
        />
      ))}
    </div>
  );
}
