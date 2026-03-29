import React, { useState, useEffect } from 'react';
import {
  FolderOpen,
  Database,
  BookOpen,
  CheckCircle2,
  Clock,
  Loader2,
  FileText,
  RefreshCw,
  AlertTriangle,
  MapPin,
  Briefcase,
  Sparkles,
} from 'lucide-react';
import { triggerIndex, forceIndex, fetchFileList } from '../services/api';
import { InlineSpinner } from '../components/Spinner';
import ResumeDetailModal from '../components/ResumeDetailModal';

export default function UploadPage({ addToast, indexing, setIndexing, indexElapsed, onIndexDone }) {
  const [fileData, setFileData] = useState(null);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'cached' | 'pending'
  const [selectedFile, setSelectedFile] = useState(null); // filename for detail modal

  const refreshFiles = async () => {
    setLoadingFiles(true);
    try {
      const data = await fetchFileList();
      setFileData(data);
    } catch { /* backend offline */ }
    finally { setLoadingFiles(false); }
  };

  useEffect(() => { refreshFiles(); }, []);
  useEffect(() => { if (!indexing) refreshFiles(); }, [indexing]);

  const handleIndex = async () => {
    setIndexing(true);
    try {
      const data = await triggerIndex();
      addToast(data.message, 'success');
      onIndexDone();
      refreshFiles();
    } catch (err) { addToast(err.message, 'error'); }
    finally { setIndexing(false); }
  };

  const handleForceIndex = async () => {
    if (!window.confirm(
      'This will clear the cache and re-parse ALL resumes through Gemini.\nThis uses API quota and takes several minutes.\n\nContinue?'
    )) return;
    setIndexing(true);
    try {
      const data = await forceIndex();
      addToast(data.message, 'success');
      onIndexDone();
      refreshFiles();
    } catch (err) { addToast(err.message, 'error'); }
    finally { setIndexing(false); }
  };

  const fmt = (s) => {
    const m = Math.floor(s / 60), sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  const indexedCount = fileData?.indexed_count || 0;
  const pendingCount = fileData?.pending_count || 0;
  const totalCount   = fileData?.total || 0;
  const pct = totalCount > 0 ? Math.round((indexedCount / totalCount) * 100) : 0;

  const filteredFiles = fileData?.files?.filter(f => {
    if (filter === 'cached')  return f.indexed;
    if (filter === 'pending') return !f.indexed;
    return true;
  }) || [];

  return (
    <div>
      {/* ============ TOP ROW ============ */}
      <div className="content-grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 24 }}>

        {/* --- Index controls --- */}
        <div className="card">
          <div className="card-header"><h2>
            <Database size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />
            Index Resumes
          </h2></div>
          <div className="card-body">
            <p style={{ fontSize: 13, color: '#6b7094', marginBottom: 20, lineHeight: 1.7 }}>
              Smart indexing only parses <strong>new files</strong> through Gemini.
              Previously parsed resumes load instantly from cache.
            </p>

            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <button className="btn btn-success" onClick={handleIndex} disabled={indexing}>
                {indexing
                  ? <><InlineSpinner /> Indexing…</>
                  : pendingCount > 0
                    ? <><Database size={16} /> Index {pendingCount} New Resume{pendingCount !== 1 ? 's' : ''}</>
                    : <><Database size={16} /> Index All Resumes</>}
              </button>
              <button className="btn btn-secondary btn-sm" onClick={handleForceIndex} disabled={indexing}
                      title="Clear cache and re-parse everything">
                <RefreshCw size={14} /> Force Re-index
              </button>
            </div>

            {indexing && (
              <div className="indexing-status">
                <div className="indexing-status-header">
                  <Loader2 size={16} className="tab-spinner" style={{ color: '#6c5ce7' }} />
                  <span>Indexing — <strong>{fmt(indexElapsed)}</strong> elapsed</span>
                </div>
                <div className="progress-bar" style={{ marginTop: 12 }}>
                  <div className="progress-bar-fill purple indeterminate" />
                </div>
                <p style={{ fontSize: 12, color: '#8b8fa8', marginTop: 10 }}>
                  New resumes parsed via Gemini (~4 s each). Cached ones load instantly.
                  You can switch tabs.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* --- Summary card --- */}
        <div className="card">
          <div className="card-header"><h2>
            <BookOpen size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />
            Index Summary
          </h2></div>
          <div className="card-body">
            <div className="idx-stats">
              <div className="idx-stat">
                <div className="idx-stat-num">{totalCount}</div>
                <div className="idx-stat-lbl"><FileText size={13} /> Total PDFs</div>
              </div>
              <div className="idx-stat green">
                <div className="idx-stat-num">{indexedCount}</div>
                <div className="idx-stat-lbl"><CheckCircle2 size={13} /> Cached</div>
              </div>
              <div className="idx-stat amber">
                <div className="idx-stat-num">{pendingCount}</div>
                <div className="idx-stat-lbl"><Clock size={13} /> Pending</div>
              </div>
            </div>

            {totalCount > 0 && (
              <div style={{ marginTop: 20 }}>
                <div className="idx-progress-label">
                  <span>Cache Coverage</span><span>{pct}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-bar-fill green" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )}

            {pendingCount === 0 && totalCount > 0 && (
              <div className="idx-all-done">
                <Sparkles size={15} />
                All resumes cached — indexing will be instant!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============ FILE LIST ============ */}
      <div className="card">
        <div className="card-header">
          <h2>
            <FolderOpen size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />
            Resume Files
            <span className="hdr-badge">{totalCount}</span>
          </h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Filter pills */}
            <div className="filter-pills">
              {[
                { id: 'all',     label: `All (${totalCount})` },
                { id: 'cached',  label: `Cached (${indexedCount})` },
                { id: 'pending', label: `Pending (${pendingCount})` },
              ].map(f => (
                <button key={f.id}
                  className={`filter-pill ${filter === f.id ? 'active' : ''}`}
                  onClick={() => setFilter(f.id)}>
                  {f.label}
                </button>
              ))}
            </div>
            <button className="card-header-action" onClick={refreshFiles}
                    title="Refresh" disabled={loadingFiles}>
              <RefreshCw size={14} className={loadingFiles ? 'tab-spinner' : ''} />
            </button>
          </div>
        </div>

        <div className="file-grid-wrap">
          {loadingFiles && !fileData ? (
            <div className="file-empty"><InlineSpinner /> Loading…</div>
          ) : filteredFiles.length > 0 ? (
            <div className="file-grid">
              {filteredFiles.map((file, i) => (
                <div key={file.filename}
                     className={`file-card ${file.indexed ? 'is-cached' : 'is-pending'} clickable`}
                     style={{ animationDelay: `${i * 0.03}s` }}
                     onClick={() => setSelectedFile(file.filename)}
                     title="Click to view details">

                  {/* icon + status */}
                  <div className="file-card-icon">
                    <FileText size={22} />
                    <span className={`file-dot ${file.indexed ? 'green' : 'amber'}`} />
                  </div>

                  {/* info */}
                  <div className="file-card-body">
                    <div className="file-card-name" title={file.filename}>
                      {file.filename}
                    </div>

                    {file.indexed ? (
                      <>
                        {file.name && (
                          <div className="file-card-parsed-name">{file.name}</div>
                        )}
                        <div className="file-card-meta">
                          {file.skills && file.skills.length > 0 && (
                            <div className="file-card-skills">
                              {file.skills.slice(0, 4).map((s, si) => (
                                <span key={si} className="file-skill">{s}</span>
                              ))}
                              {file.skills.length > 4 && (
                                <span className="file-skill more">+{file.skills.length - 4}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="file-card-pending-label">
                        <Clock size={12} /> Awaiting indexing
                      </div>
                    )}
                  </div>

                  {/* status badge */}
                  <div className="file-card-badge-wrap">
                    {file.indexed ? (
                      <span className="file-badge cached"><CheckCircle2 size={12} /> Cached</span>
                    ) : (
                      <span className="file-badge pending"><Clock size={12} /> Pending</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : fileData && fileData.files.length > 0 ? (
            <div className="file-empty">
              No {filter === 'cached' ? 'cached' : 'pending'} files.
            </div>
          ) : (
            <div className="file-empty">
              <AlertTriangle size={20} style={{ marginBottom: 8 }} />
              <br />No PDF files found in <code className="inline-code">data/resumes/</code>
            </div>
          )}
        </div>
      </div>

      {/* Detail modal */}
      {selectedFile && (
        <ResumeDetailModal
          filename={selectedFile}
          onClose={() => setSelectedFile(null)}
        />
      )}
    </div>
  );
}
