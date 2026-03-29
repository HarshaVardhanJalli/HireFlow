import React, { useState } from 'react';
import {
  MapPin,
  Briefcase,
  Tag,
  ChevronDown,
  Trophy,
  Medal,
  Award,
  CheckCircle2,
  XCircle,
  Zap,
  Target,
  BarChart3,
  FileText,
  Star,
  Check,
} from 'lucide-react';

function getAvatarClass(rank) {
  if (rank === 0) return 'rank-1';
  if (rank === 1) return 'rank-2';
  if (rank === 2) return 'rank-3';
  return 'rank-default';
}

function getInitials(name) {
  if (!name || name === 'Unknown') return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function RankIcon({ rank }) {
  if (rank === 0) return <Trophy size={16} className="rank-icon gold" />;
  if (rank === 1) return <Medal size={16} className="rank-icon silver" />;
  if (rank === 2) return <Award size={16} className="rank-icon bronze" />;
  return null;
}

/* ---------- Compute a 0-100 fit score ---------- */
function computeFitScore(candidate, searchQuery) {
  const combined = candidate.combined_score || 0;
  const vector = candidate.vector_score || 0;
  const rrfPart = Math.min((combined / 0.04) * 100, 100);
  const skillMatch = computeSkillMatch(candidate.skills, searchQuery);
  const vectorPart = vector * 100;
  const raw = rrfPart * 0.4 + skillMatch.percentage * 0.3 + vectorPart * 0.3;
  return Math.round(Math.min(raw, 100));
}

/* ---------- Match candidate skills against search query ---------- */
function computeSkillMatch(candidateSkills, searchQuery) {
  if (!candidateSkills || !searchQuery) {
    return { matched: [], notMatched: [], missing: [], percentage: 0 };
  }
  const query = searchQuery.toLowerCase();
  const matched = [];
  const notMatched = [];

  (candidateSkills || []).forEach((skill) => {
    if (query.includes(skill.toLowerCase())) {
      matched.push(skill);
    } else {
      notMatched.push(skill);
    }
  });

  const queryTokens = query
    .replace(/[.,;:!?()]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2);

  const missing = [];
  const candidateLower = (candidateSkills || []).map((s) => s.toLowerCase());
  const commonSkillWords = [
    'python', 'java', 'javascript', 'react', 'node', 'aws', 'docker', 'kubernetes',
    'sql', 'nosql', 'mongodb', 'postgresql', 'redis', 'kafka', 'spark', 'hadoop',
    'tensorflow', 'pytorch', 'pandas', 'numpy', 'scikit', 'flask', 'django', 'fastapi',
    'typescript', 'angular', 'vue', 'go', 'rust', 'c++', 'scala', 'ruby', 'php',
    'html', 'css', 'git', 'linux', 'azure', 'gcp', 'terraform', 'jenkins',
    'agile', 'scrum', 'jira', 'figma', 'machine', 'learning', 'nlp', 'data',
  ];
  queryTokens.forEach((token) => {
    if (
      commonSkillWords.includes(token) &&
      !candidateLower.some((s) => s.includes(token))
    ) {
      missing.push(token);
    }
  });

  const total = matched.length + missing.length;
  const percentage = total > 0 ? (matched.length / total) * 100 : 50;
  return { matched, notMatched, missing, percentage };
}

function getScoreColor(score) {
  if (score >= 75) return { bg: '#e8f9ee', color: '#16a34a', border: '#bbf0cc', label: 'Strong Match' };
  if (score >= 50) return { bg: '#fef3e2', color: '#d97706', border: '#fde5b0', label: 'Good Match' };
  if (score >= 30) return { bg: '#fff4e6', color: '#ea580c', border: '#fde0b0', label: 'Partial Match' };
  return { bg: '#fde8e8', color: '#dc2626', border: '#f5c6c6', label: 'Weak Match' };
}


export default function CandidateCard({
  candidate,
  rank,
  showAllScores = true,
  searchQuery = '',
  onViewResume,
  onShortlist,
  isShortlisted,
}) {
  const [expanded, setExpanded] = useState(false);
  const c = candidate;

  const fitScore = computeFitScore(c, searchQuery);
  const scoreStyle = getScoreColor(fitScore);
  const skillMatch = computeSkillMatch(c.skills, searchQuery);
  const alreadyShortlisted = isShortlisted ? isShortlisted(c.candidate_id) : false;

  return (
    <div className="candidate-card" style={{ animationDelay: `${rank * 0.06}s` }}>
      {/* -------- Clickable top row -------- */}
      <div className="candidate-card-top" onClick={() => setExpanded(!expanded)}>
        <div className="candidate-info">
          <div className={`candidate-avatar ${getAvatarClass(rank)}`}>
            {getInitials(c.name)}
          </div>
          <div>
            <div className="candidate-name">
              <RankIcon rank={rank} />
              {c.name}
              {alreadyShortlisted && (
                <span className="shortlisted-badge">
                  <Star size={11} /> Shortlisted
                </span>
              )}
            </div>
            <div className="candidate-meta">
              <span><MapPin size={13} /> {c.location || 'N/A'}</span>
              <span><Briefcase size={13} /> {c.experience != null ? `${c.experience} yrs` : 'N/A'}</span>
              <span><Tag size={13} /> {(c.skills || []).length} skills</span>
            </div>
          </div>
        </div>

        <div className="candidate-scores">
          <div
            className="fit-score-badge"
            style={{
              background: scoreStyle.bg,
              color: scoreStyle.color,
              border: `1.5px solid ${scoreStyle.border}`,
            }}
          >
            <Target size={14} />
            <span className="fit-score-number">{fitScore}</span>
            <span className="fit-score-max">/100</span>
          </div>

          {showAllScores && (
            <>
              <div className="score-badge combined">
                <span className="score-badge-label">RRF</span>
                {c.combined_score?.toFixed(4)}
              </div>
              <div className="score-badge bm25">
                <span className="score-badge-label">BM25</span>
                {c.bm25_score?.toFixed(3)}
              </div>
              <div className="score-badge vector">
                <span className="score-badge-label">Vector</span>
                {c.vector_score?.toFixed(3)}
              </div>
            </>
          )}
          <ChevronDown
            size={18}
            className={`candidate-expand-icon ${expanded ? 'expanded' : ''}`}
          />
        </div>
      </div>

      {/* -------- Expandable detail -------- */}
      <div className={`candidate-detail ${expanded ? 'open' : ''}`}>
        <div className="candidate-detail-inner">

          {/* ---- Score explanation banner ---- */}
          <div className="evidence-banner" style={{ borderLeft: `4px solid ${scoreStyle.color}` }}>
            <div className="evidence-banner-header">
              <Zap size={16} style={{ color: scoreStyle.color }} />
              <strong style={{ color: scoreStyle.color }}>{scoreStyle.label}</strong>
              <span className="evidence-score-pill" style={{ background: scoreStyle.bg, color: scoreStyle.color }}>
                {fitScore}/100
              </span>
            </div>
            <p className="evidence-explanation">
              Score breakdown: <strong>RRF rank fusion</strong> ({Math.min((c.combined_score * 100 / 0.04), 100).toFixed(0)}% weight) +
              <strong> skill match</strong> ({skillMatch.percentage.toFixed(0)}%) +
              <strong> semantic similarity</strong> ({((c.vector_score || 0) * 100).toFixed(0)}%).
              {fitScore >= 70 && ' This candidate is a strong fit for the described role.'}
              {fitScore >= 40 && fitScore < 70 && ' This candidate has relevant experience but may have some skill gaps.'}
              {fitScore < 40 && ' This candidate has limited overlap with the job requirements.'}
            </p>
          </div>

          <div className="detail-grid">
            {/* ---- Matched Skills Evidence ---- */}
            <div className="detail-section">
              <h4><CheckCircle2 size={15} style={{ color: '#16a34a' }} /> Matching Skills</h4>
              <div className="skills-list">
                {skillMatch.matched.length > 0 ? (
                  skillMatch.matched.map((s, i) => (
                    <span className="skill-tag skill-match" key={i}>
                      <CheckCircle2 size={11} /> {s}
                    </span>
                  ))
                ) : (
                  <span className="evidence-note">No direct skill keyword matches found</span>
                )}
              </div>

              {skillMatch.missing.length > 0 && (
                <>
                  <h4 style={{ marginTop: 14 }}><XCircle size={15} style={{ color: '#dc2626' }} /> Missing Skills</h4>
                  <div className="skills-list">
                    {skillMatch.missing.map((s, i) => (
                      <span className="skill-tag skill-gap" key={i}>
                        <XCircle size={11} /> {s}
                      </span>
                    ))}
                  </div>
                </>
              )}

              {skillMatch.notMatched.length > 0 && (
                <>
                  <h4 style={{ marginTop: 14 }}><FileText size={15} style={{ color: '#8b8fa8' }} /> Other Skills</h4>
                  <div className="skills-list">
                    {skillMatch.notMatched.map((s, i) => (
                      <span className="skill-tag" key={i}>{s}</span>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* ---- Scores & Details ---- */}
            <div className="detail-section">
              <h4><BarChart3 size={15} /> Score Breakdown</h4>
              <div className="score-breakdown">
                <div className="score-row">
                  <span>Combined (RRF)</span>
                  <div className="score-bar-track">
                    <div className="score-bar-fill rrf" style={{ width: `${Math.min((c.combined_score / 0.04) * 100, 100)}%` }} />
                  </div>
                  <span className="score-val">{c.combined_score?.toFixed(4)}</span>
                </div>
                <div className="score-row">
                  <span>BM25 (Keyword)</span>
                  <div className="score-bar-track">
                    <div className="score-bar-fill bm25" style={{ width: `${(c.bm25_score || 0) * 100}%` }} />
                  </div>
                  <span className="score-val">{c.bm25_score?.toFixed(4)}</span>
                </div>
                <div className="score-row">
                  <span>Vector (Semantic)</span>
                  <div className="score-bar-track">
                    <div className="score-bar-fill vector" style={{ width: `${(c.vector_score || 0) * 100}%` }} />
                  </div>
                  <span className="score-val">{c.vector_score?.toFixed(4)}</span>
                </div>
                <div className="score-row">
                  <span>Skill Match</span>
                  <div className="score-bar-track">
                    <div className="score-bar-fill skill" style={{ width: `${skillMatch.percentage}%` }} />
                  </div>
                  <span className="score-val">{skillMatch.percentage.toFixed(0)}%</span>
                </div>
              </div>

              <h4 style={{ marginTop: 16 }}>Candidate Info</h4>
              <div style={{ fontSize: 13, lineHeight: 1.8, color: '#6b7094' }}>
                <div><strong>ID:</strong> {c.candidate_id}</div>
                <div><strong>Location:</strong> {c.location || 'N/A'}</div>
                <div><strong>Experience:</strong> {c.experience != null ? `${c.experience} years` : 'N/A'}</div>
              </div>
            </div>
          </div>

          {/* ---- Action buttons ---- */}
          <div className="card-action-row">
            {onViewResume && (
              <button
                className="btn btn-sm btn-outline"
                onClick={(e) => { e.stopPropagation(); onViewResume(c); }}
              >
                <FileText size={14} /> View Full Resume
              </button>
            )}
            {onShortlist && (
              <button
                className={`btn btn-sm ${alreadyShortlisted ? 'btn-shortlisted' : 'btn-primary'}`}
                disabled={alreadyShortlisted}
                onClick={(e) => { e.stopPropagation(); onShortlist(c, searchQuery); }}
              >
                {alreadyShortlisted ? (
                  <><Check size={14} /> Already Shortlisted</>
                ) : (
                  <><Star size={14} /> Shortlist Candidate</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
