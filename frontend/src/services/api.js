const API_BASE = 'http://localhost:8000';

export async function fetchStatus() {
  const res = await fetch(`${API_BASE}/status`);
  if (!res.ok) throw new Error('Failed to fetch status');
  return res.json();
}

/**
 * Smart incremental index — only parses new files, loads cached ones instantly.
 */
export async function triggerIndex() {
  const res = await fetch(`${API_BASE}/index`, {
    method: 'POST',
    signal: AbortSignal.timeout(600000), // 10 min timeout
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Indexing failed');
  }
  return res.json();
}

/**
 * Force re-index — clears cache and re-parses every file from scratch.
 */
export async function forceIndex() {
  const res = await fetch(`${API_BASE}/index/force`, {
    method: 'POST',
    signal: AbortSignal.timeout(600000),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Force indexing failed');
  }
  return res.json();
}

/**
 * Get list of all PDF files with their indexed/pending status.
 */
export async function fetchFileList() {
  const res = await fetch(`${API_BASE}/index/files`);
  if (!res.ok) throw new Error('Failed to fetch file list');
  return res.json();
}

/**
 * Get full parsed details for a single resume file.
 */
export async function fetchFileDetail(filename) {
  const res = await fetch(`${API_BASE}/index/files/${encodeURIComponent(filename)}`);
  if (!res.ok) throw new Error('Failed to fetch file details');
  return res.json();
}

export async function searchCandidates(query, topK = 5) {
  const res = await fetch(`${API_BASE}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, top_k: topK }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Search failed');
  }
  return res.json();
}
