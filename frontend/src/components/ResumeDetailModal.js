import React, { useEffect, useState } from 'react';
import {
  X,
  FileText,
  User,
  MapPin,
  Briefcase,
  Code2,
  CheckCircle2,
  Clock,
  Loader2,
  ScrollText,
  Hash,
  Sparkles,
} from 'lucide-react';
import { fetchFileDetail } from '../services/api';

/**
 * Beautiful modal that pops up showing full parsed metadata for a resume file.
 * Fetches details on open from /index/files/{filename}.
 */
export default function ResumeDetailModal({ filename, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!filename) return;
    setLoading(true);
    setError(null);
    fetchFileDetail(filename)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [filename]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!filename) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>

        {/* ---- Header ---- */}
        <div className="modal-header">
          <div className="modal-header-left">
            <div className={`modal-icon ${data?.indexed ? 'green' : 'amber'}`}>
              <FileText size={24} />
            </div>
            <div>
              <h2 className="modal-title">{data?.name || filename}</h2>
              <p className="modal-subtitle">{filename}</p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* ---- Body ---- */}
        <div className="modal-body">
          {loading ? (
            <div className="modal-loading">
              <Loader2 size={32} className="tab-spinner" />
              <p>Loading resume details…</p>
            </div>
          ) : error ? (
            <div className="modal-error">
              <p>Failed to load details: {error}</p>
            </div>
          ) : data ? (
            <>
              {/* Status badge */}
              <div className="modal-status-row">
                {data.indexed ? (
                  <span className="modal-status-badge green">
                    <CheckCircle2 size={14} /> Indexed & Cached
                  </span>
                ) : (
                  <span className="modal-status-badge amber">
                    <Clock size={14} /> Pending — Not Yet Indexed
                  </span>
                )}
              </div>

              {/* Metadata grid */}
              <div className="modal-meta-grid">
                <MetaCard
                  icon={<User size={20} />}
                  label="Candidate Name"
                  value={data.name || 'Not parsed'}
                  muted={!data.name}
                />
                <MetaCard
                  icon={<Hash size={20} />}
                  label="Candidate ID"
                  value={data.candidate_id || 'N/A'}
                  muted={!data.candidate_id}
                  mono
                />
                <MetaCard
                  icon={<MapPin size={20} />}
                  label="Location"
                  value={data.location || 'Unknown'}
                  muted={!data.location || data.location === 'Unknown'}
                />
                <MetaCard
                  icon={<Briefcase size={20} />}
                  label="Experience"
                  value={data.experience != null ? `${data.experience} year${data.experience !== 1 ? 's' : ''}` : 'Unknown'}
                  muted={data.experience == null}
                />
              </div>

              {/* Skills */}
              <div className="modal-section">
                <h3 className="modal-section-title">
                  <Code2 size={16} /> Skills
                  {data.skills?.length > 0 && (
                    <span className="modal-section-count">{data.skills.length}</span>
                  )}
                </h3>
                {data.skills && data.skills.length > 0 ? (
                  <div className="modal-skills">
                    {data.skills.map((skill, i) => (
                      <span key={i} className="modal-skill-tag">
                        <Sparkles size={10} /> {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="modal-muted-text">No skills extracted yet.</p>
                )}
              </div>

              {/* Resume text preview */}
              <div className="modal-section">
                <h3 className="modal-section-title">
                  <ScrollText size={16} /> Resume Text Preview
                </h3>
                {data.text_preview ? (
                  <div className="modal-text-preview">
                    <pre>{data.text_preview}</pre>
                  </div>
                ) : (
                  <p className="modal-muted-text">No text could be extracted from this PDF.</p>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}


/** Small reusable metadata card inside the modal */
function MetaCard({ icon, label, value, muted, mono }) {
  return (
    <div className={`modal-meta-card ${muted ? 'muted' : ''}`}>
      <div className="modal-meta-icon">{icon}</div>
      <div>
        <div className="modal-meta-label">{label}</div>
        <div className={`modal-meta-value ${mono ? 'mono' : ''}`}>{value}</div>
      </div>
    </div>
  );
}
