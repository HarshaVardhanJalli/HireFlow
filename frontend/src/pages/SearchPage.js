import React, { useState } from 'react';
import {
  Search, X, SlidersHorizontal, ArrowRight, Users,
  Filter, CheckSquare, Mail,
} from 'lucide-react';
import { searchCandidates } from '../services/api';
import CandidateCard from '../components/CandidateCard';
import Spinner, { InlineSpinner } from '../components/Spinner';

export default function SearchPage({ addToast, onSearchDone, onShortlist, onViewResume, isShortlisted }) {
  const [form, setForm] = useState({
    jobTitle: '',
    jobDescription: '',
    requiredSkills: '',
    location: '',
    minExperience: 0,
    topK: 5,
  });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastQuery, setLastQuery] = useState('');

  const handleChange = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const clearForm = () => {
    setForm({
      jobTitle: '',
      jobDescription: '',
      requiredSkills: '',
      location: '',
      minExperience: 0,
      topK: 5,
    });
    setResults([]);
    setLastQuery('');
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!form.jobDescription.trim()) {
      addToast('Please enter a job description', 'error');
      return;
    }

    setLoading(true);
    try {
      const parts = [];
      if (form.jobTitle) parts.push(form.jobTitle);
      parts.push(form.jobDescription);
      if (form.requiredSkills) parts.push(`Required skills: ${form.requiredSkills}`);
      if (form.location) parts.push(`Location: ${form.location}`);
      const query = parts.join('. ');

      const data = await searchCandidates(query, form.topK);
      const candidates = data.results || [];
      setResults(candidates);
      setLastQuery(query);
      addToast(`Found ${data.total} matching candidates`, 'success');
      onSearchDone(query, candidates);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const strongMatches = results.filter((_, i) => i < 3).length;
  const topCandidate = results.length > 0 ? results[0] : null;

  return (
    <div>
      {/* ---------- Search Form ---------- */}
      <div className="card search-card">
        <div className="card-header">
          <h2><Search size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />Candidate Search</h2>
          <button className="card-header-action" title="Filters">
            <SlidersHorizontal size={16} />
          </button>
        </div>

        <div className="card-body">
          <form className="search-form" onSubmit={handleSearch}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Job Title</label>
                <input
                  className="form-input"
                  placeholder="e.g. Senior Python Developer"
                  value={form.jobTitle}
                  onChange={handleChange('jobTitle')}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Preferred Location</label>
                <input
                  className="form-input"
                  placeholder="e.g. San Francisco, Remote"
                  value={form.location}
                  onChange={handleChange('location')}
                />
              </div>
            </div>

            <div className="form-group full-width">
              <label className="form-label">Job Description *</label>
              <textarea
                className="form-textarea"
                placeholder="Describe the role, responsibilities, and ideal candidate profile…"
                value={form.jobDescription}
                onChange={handleChange('jobDescription')}
                rows={4}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Required Skills</label>
                <input
                  className="form-input"
                  placeholder="Python, AWS, Docker (comma-separated)"
                  value={form.requiredSkills}
                  onChange={handleChange('requiredSkills')}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Min. Experience (years)</label>
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.minExperience}
                  onChange={handleChange('minExperience')}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Number of Results: <strong>{form.topK}</strong>
              </label>
              <div className="form-slider-row">
                <span className="form-slider-value">3</span>
                <input
                  type="range"
                  className="form-slider"
                  min="3"
                  max="10"
                  value={form.topK}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, topK: parseInt(e.target.value) }))
                  }
                />
                <span className="form-slider-value">10</span>
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? (
                  <><InlineSpinner /> Searching…</>
                ) : (
                  <><Search size={16} /> Search Candidates</>
                )}
              </button>
              <button type="button" className="btn btn-secondary" onClick={clearForm}>
                <X size={16} /> Clear
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ---------- Loading ---------- */}
      {loading && <Spinner text="Searching candidates with AI…" />}

      {/* ---------- Results ---------- */}
      {!loading && results.length > 0 && (
        <div className="results-section">
          <div className="results-header">
            <h2>Top Matches</h2>
            <span className="results-count">{results.length} candidates found</span>
          </div>

          {results.map((c, i) => (
            <CandidateCard
              key={c.candidate_id || i}
              candidate={c}
              rank={i}
              searchQuery={lastQuery}
              onViewResume={onViewResume}
              onShortlist={onShortlist}
              isShortlisted={isShortlisted}
            />
          ))}

          {/* ---------- What To Do Next ---------- */}
          <div className="next-steps-card">
            <div className="next-steps-header">
              <ArrowRight size={20} />
              <h3>What to do next?</h3>
            </div>
            <div className="next-steps-grid">
              <div className="next-step-item">
                <div className="next-step-icon" style={{ background: '#e8f9ee', color: '#16a34a' }}>
                  <CheckSquare size={20} />
                </div>
                <div>
                  <strong>Review & Shortlist</strong>
                  <p>Expand each candidate to see match evidence. Click "Shortlist Candidate" to add them to your hiring pipeline.</p>
                </div>
              </div>
              <div className="next-step-item">
                <div className="next-step-icon" style={{ background: '#eef0ff', color: '#6c5ce7' }}>
                  <Users size={20} />
                </div>
                <div>
                  <strong>Manage Pipeline</strong>
                  <p>Go to the <strong>Candidates</strong> tab to track shortlisted candidates through Screening → Interview → Offer → Hired stages.</p>
                </div>
              </div>
              <div className="next-step-item">
                <div className="next-step-icon" style={{ background: '#fff4e6', color: '#d97706' }}>
                  <Filter size={20} />
                </div>
                <div>
                  <strong>Refine Search</strong>
                  <p>Not satisfied? Add more specific skills, adjust experience requirements, or increase the number of results and search again.</p>
                </div>
              </div>
              <div className="next-step-item">
                <div className="next-step-icon" style={{ background: '#fde8e8', color: '#dc2626' }}>
                  <Mail size={20} />
                </div>
                <div>
                  <strong>Reach Out</strong>
                  <p>{strongMatches > 0 ? `${strongMatches} strong candidates` : 'Top candidates'} are ready for outreach. {topCandidate && `Top match: ${topCandidate.name}.`}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Empty ---------- */}
      {!loading && results.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Search size={52} strokeWidth={1.2} /></div>
            <h3>Search for Candidates</h3>
            <p>
              Enter a job description above and click "Search Candidates" to find the
              best matches from your indexed resumes using AI-powered hybrid search.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
