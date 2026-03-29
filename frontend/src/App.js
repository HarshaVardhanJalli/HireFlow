import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';

import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import ToastContainer from './components/ToastContainer';
import ResumeDetailModal from './components/ResumeDetailModal';

import DashboardPage from './pages/DashboardPage';
import SearchPage from './pages/SearchPage';
import UploadPage from './pages/UploadPage';
import CandidatesPage from './pages/CandidatesPage';

import { fetchStatus } from './services/api';

/* ---- Pipeline stage definitions ---- */
const PIPELINE_STAGES = [
  { id: 'shortlisted', label: 'Shortlisted', color: '#6c5ce7', icon: '⭐' },
  { id: 'screening',   label: 'Screening',   color: '#0984e3', icon: '📞' },
  { id: 'interviewed', label: 'Interviewed',  color: '#e17055', icon: '🎤' },
  { id: 'offered',     label: 'Offered',      color: '#fdcb6e', icon: '📄' },
  { id: 'hired',       label: 'Hired',        color: '#00b894', icon: '✅' },
  { id: 'rejected',    label: 'Rejected',     color: '#d63031', icon: '❌' },
];

/* ---- Load shortlisted candidates from localStorage ---- */
function loadShortlist() {
  try {
    const raw = localStorage.getItem('hireflow_shortlist');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [status, setStatus] = useState({
    resumes_ready: false,
    vector_store_ready: false,
    hybrid_ready: false,
    pinecone_vector_count: 0,
  });
  const [backendOnline, setBackendOnline] = useState(false);
  const [searchCount, setSearchCount] = useState(0);
  const [recentSearches, setRecentSearches] = useState([]);
  const [lastResults, setLastResults] = useState([]);
  const [lastQuery, setLastQuery] = useState('');
  const [toasts, setToasts] = useState([]);
  const toastId = useRef(0);

  /* ---- Global indexing state (persists across tab switches) ---- */
  const [indexing, setIndexing] = useState(false);
  const [indexElapsed, setIndexElapsed] = useState(0);
  const timerRef = useRef(null);

  /* ---- Shortlist / Pipeline state ---- */
  const [shortlist, setShortlist] = useState(loadShortlist);

  /* ---- Resume viewer modal state ---- */
  const [resumeModalFile, setResumeModalFile] = useState(null);

  // Persist shortlist to localStorage
  useEffect(() => {
    localStorage.setItem('hireflow_shortlist', JSON.stringify(shortlist));
  }, [shortlist]);

  useEffect(() => {
    if (indexing) {
      setIndexElapsed(0);
      timerRef.current = setInterval(() => setIndexElapsed((s) => s + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [indexing]);

  /* ---- Toast helpers ---- */
  const addToast = useCallback((message, type = 'info') => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /* ---- Poll backend status ---- */
  const pollStatus = useCallback(async () => {
    try {
      const data = await fetchStatus();
      setStatus(data);
      setBackendOnline(true);
    } catch {
      setBackendOnline(false);
    }
  }, []);

  useEffect(() => {
    pollStatus();
    const interval = setInterval(pollStatus, 10000);
    return () => clearInterval(interval);
  }, [pollStatus]);

  /* ---- Called after a successful search ---- */
  const handleSearchDone = (query, results) => {
    setSearchCount((c) => c + 1);
    if (query) {
      setRecentSearches((prev) => [query, ...prev].slice(0, 5));
      setLastQuery(query);
    }
    if (results) setLastResults(results);
    pollStatus();
  };

  /* ---- Shortlist actions ---- */
  const handleShortlist = useCallback((candidate, query) => {
    setShortlist((prev) => {
      const exists = prev.find((s) => s.candidate_id === candidate.candidate_id);
      if (exists) return prev; // already shortlisted
      return [
        ...prev,
        {
          ...candidate,
          stage: 'shortlisted',
          shortlisted_at: new Date().toISOString(),
          search_query: query || '',
          notes: '',
        },
      ];
    });
    addToast(`${candidate.name} shortlisted!`, 'success');
  }, [addToast]);

  const handleUpdateStage = useCallback((candidateId, newStage) => {
    setShortlist((prev) =>
      prev.map((s) =>
        s.candidate_id === candidateId
          ? { ...s, stage: newStage, [`${newStage}_at`]: new Date().toISOString() }
          : s
      )
    );
  }, []);

  const handleUpdateNotes = useCallback((candidateId, notes) => {
    setShortlist((prev) =>
      prev.map((s) =>
        s.candidate_id === candidateId ? { ...s, notes } : s
      )
    );
  }, []);

  const handleRemoveFromShortlist = useCallback((candidateId) => {
    setShortlist((prev) => prev.filter((s) => s.candidate_id !== candidateId));
  }, []);

  /* ---- View resume ---- */
  const handleViewResume = useCallback((candidate) => {
    // Derive filename from candidate_id: "c_John_Doe" → "John_Doe.pdf"
    const cid = candidate.candidate_id || '';
    const filename = cid.startsWith('c_') ? cid.slice(2) + '.pdf' : cid + '.pdf';
    setResumeModalFile(filename);
  }, []);

  /* ---- Check if candidate is already shortlisted ---- */
  const isShortlisted = useCallback((candidateId) => {
    return shortlist.some((s) => s.candidate_id === candidateId);
  }, [shortlist]);

  /* ---- Render ---- */
  return (
    <div className="app">
      <Sidebar
        activePage={activePage}
        onPageChange={setActivePage}
        status={status}
        backendOnline={backendOnline}
      />

      <div className="main-content">
        <TopBar
          activePage={activePage}
          onPageChange={setActivePage}
          indexing={indexing}
          indexElapsed={indexElapsed}
        />

        {/* Global indexing banner */}
        {indexing && activePage !== 'upload' && (
          <div className="global-indexing-banner">
            <div className="banner-spinner" />
            <span>
              Indexing resumes… <strong>{Math.floor(indexElapsed / 60)}m {indexElapsed % 60}s</strong> elapsed
            </span>
            <button className="btn btn-sm btn-secondary" onClick={() => setActivePage('upload')}>
              View Details
            </button>
          </div>
        )}

        <div className="page-content">
          {activePage === 'dashboard' && (
            <DashboardPage
              status={status}
              backendOnline={backendOnline}
              searchCount={searchCount}
              recentSearches={recentSearches}
              onNavigate={setActivePage}
              shortlistCount={shortlist.length}
            />
          )}
          {activePage === 'search' && (
            <SearchPage
              addToast={addToast}
              onSearchDone={handleSearchDone}
              onShortlist={handleShortlist}
              onViewResume={handleViewResume}
              isShortlisted={isShortlisted}
            />
          )}
          {activePage === 'upload' && (
            <UploadPage
              addToast={addToast}
              indexing={indexing}
              setIndexing={setIndexing}
              indexElapsed={indexElapsed}
              onIndexDone={pollStatus}
            />
          )}
          {activePage === 'candidates' && (
            <CandidatesPage
              lastResults={lastResults}
              lastQuery={lastQuery}
              shortlist={shortlist}
              pipelineStages={PIPELINE_STAGES}
              onShortlist={handleShortlist}
              onViewResume={handleViewResume}
              onUpdateStage={handleUpdateStage}
              onUpdateNotes={handleUpdateNotes}
              onRemoveFromShortlist={handleRemoveFromShortlist}
              isShortlisted={isShortlisted}
              addToast={addToast}
            />
          )}
        </div>
      </div>

      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Resume detail modal */}
      {resumeModalFile && (
        <ResumeDetailModal
          filename={resumeModalFile}
          onClose={() => setResumeModalFile(null)}
        />
      )}
    </div>
  );
}

export default App;
