# HireFlow System Architecture

## Overview

HireFlow is a resume-only AI candidate search engine. It indexes PDF resumes using both BM25 (lexical) and Pinecone vector (semantic) search, fuses results with Reciprocal Rank Fusion (RRF), applies post-search filters, and optionally re-ranks candidates with a Gemini LLM evaluator.

The system is split into a **FastAPI backend** (handles indexing, caching, and search), a **React frontend** (modern dashboard SPA), and a legacy **Streamlit frontend**. Both frontends connect to the same API.

---

## System Diagram

```mermaid
graph TB
    subgraph UI["React Frontend (frontend/src/)"]
        DASHBOARD[Dashboard Page<br>Status lights / Stats / Recent searches]
        SEARCH_UI[Search Page<br>Job description / Skills / Filters]
        UPLOAD[Upload Page<br>Index controls / File tracker grid]
        CANDIDATES[Candidates Page<br>Browse last search results]
    end

    subgraph API["FastAPI Backend (api/main.py)"]
        INDEX_EP["POST /index<br>(smart incremental)"]
        FORCE_EP["POST /index/force<br>(clear cache + reparse)"]
        FILES_EP["GET /index/files<br>(file status tracker)"]
        SEARCH_EP[POST /search]
        STATUS_EP[GET /status]
    end

    subgraph CORE["Core Layer"]
        INGESTION["ingestion.py<br>PDF -> Document<br>+ parse cache + rate limit"]
        CACHE[(parsed_cache.json<br>Gemini results cache)]
        INDEXER[hybrid_indexer.py<br>BM25 + Vector + RRF]
        FILTERS[filters.py<br>skills / location / experience]
        RERANKER[re_ranker.py<br>LLM evaluation]
        MEMORY_RAG[memory_rag.py<br>search history]
        EVALUATOR[evaluator.py<br>RAGAS metrics]
    end

    subgraph INFRA["Infrastructure"]
        PINECONE[(Pinecone<br>Vector Index)]
        GEMINI[Gemini LLM<br>gemini-2.5-flash-lite]
        EMBEDDINGS[HuggingFace<br>all-MiniLM-L6-v2]
    end

    UPLOAD --> INDEX_EP
    UPLOAD --> FORCE_EP
    UPLOAD --> FILES_EP
    SEARCH_UI --> SEARCH_EP
    DASHBOARD --> STATUS_EP

    INDEX_EP --> INGESTION
    FORCE_EP --> CACHE
    FORCE_EP --> INGESTION
    FILES_EP --> CACHE

    INGESTION --> CACHE
    INGESTION --> GEMINI
    INGESTION --> INDEXER
    INDEXER --> PINECONE
    INDEXER --> EMBEDDINGS
    SEARCH_EP --> INDEXER
    INDEXER --> FILTERS
    FILTERS --> RERANKER
    RERANKER --> GEMINI
    RERANKER --> SEARCH_UI
    MEMORY_RAG --> DASHBOARD
    STATUS_EP --> INDEXER
```

---

## Data Flow — Indexing

```mermaid
sequenceDiagram
    participant User
    participant React
    participant FastAPI
    participant Ingestion
    participant Cache as parsed_cache.json
    participant Gemini
    participant HybridIndexer
    participant BM25
    participant Pinecone

    User->>React: Click "Index N New Resumes"
    React->>FastAPI: POST /index
    FastAPI->>Ingestion: load_resumes(directory)

    loop For each PDF
        Ingestion->>Cache: Is this file cached?
        alt Cached
            Cache-->>Ingestion: Return parsed metadata (instant)
        else Not cached
            Ingestion->>Gemini: Parse resume text (with 4s rate-limit)
            Gemini-->>Ingestion: {name, skills, location, experience}
            Ingestion->>Cache: Save result to cache
        end
        Ingestion->>Ingestion: Create Document object
    end

    Ingestion-->>FastAPI: List of Document objects
    FastAPI->>HybridIndexer: index_resumes(documents)
    HybridIndexer->>BM25: Build BM25 index (in-memory)
    HybridIndexer->>Pinecone: Embed + upsert vectors

    FastAPI-->>React: {indexed: 50, cached: 45, new: 5}
    React->>User: Show success toast + refresh file tracker
```

---

## Data Flow — Searching

```mermaid
sequenceDiagram
    participant User
    participant React
    participant FastAPI
    participant HybridIndexer
    participant BM25
    participant Pinecone

    User->>React: Enter job description + click Search
    React->>FastAPI: POST /search {query, top_k}
    FastAPI->>HybridIndexer: search_resumes(query, top_k)

    HybridIndexer->>BM25: get_scores(query_tokens)
    BM25-->>HybridIndexer: bm25_scores[]

    HybridIndexer->>Pinecone: query(embedding, top_k*2)
    Pinecone-->>HybridIndexer: vector_results[]

    HybridIndexer->>HybridIndexer: combine_results() — RRF fusion
    HybridIndexer-->>FastAPI: candidates [{bm25_score, vector_score, combined_score}]

    FastAPI-->>React: SearchResponse
    React->>User: Display ranked candidate cards with scores + skills
```

---

## Data Flow — File Status Tracking

```mermaid
sequenceDiagram
    participant User
    participant React
    participant FastAPI
    participant Cache as parsed_cache.json
    participant Disk as data/resumes/

    User->>React: Open Upload tab
    React->>FastAPI: GET /index/files
    FastAPI->>Disk: List all PDF filenames
    FastAPI->>Cache: Load cached entries
    FastAPI->>FastAPI: Compare: which files are cached vs pending
    FastAPI-->>React: {files: [{filename, indexed, name, skills}], total, indexed_count, pending_count}
    React->>User: Show file cards (green=cached, amber=pending) + filter pills
```

---

## Caching & Rate Limiting Architecture

```
data/resumes/
├── alice_smith.pdf          ──> cached in parsed_cache.json ──> INSTANT load
├── bob_jones.pdf            ──> cached in parsed_cache.json ──> INSTANT load
├── new_candidate.pdf        ──> NOT in cache ──> Gemini call (4s delay) ──> save to cache
└── another_new.pdf          ──> NOT in cache ──> Gemini call (4s delay) ──> save to cache

parsed_cache.json:
{
  "alice_smith.pdf": {
    "candidate_id": "c_alice_smith",
    "name": "Alice Smith",
    "skills": ["Python", "SQL", "AWS"],
    "location": "New York",
    "experience": 5
  },
  "bob_jones.pdf": { ... }
}

Rate limiting:
  - 4 seconds between Gemini calls (~15 RPM, within free tier)
  - On 429 error: retry with 30s / 60s / 90s exponential backoff
  - Max 3 retries per file, then fallback to basic metadata
```

---

## Scoring Pipeline

```
Resume text
    |
    +---> BM25 (rank_bm25)
    |         BM25 raw score
    |         normalized to [0,1]: score / max_score
    |
    +---> Pinecone (cosine similarity)
              Vector score in [0,1]
    |
    v
Reciprocal Rank Fusion (RRF)
    rrf_score = 1 / (60 + rank)
    candidates in both lists get scores summed
    |
    v
combined_score (RRF) -- used for initial ranking
    |
    v
Post-Search Filters (optional)
    skills / location / min_experience
    |
    v
LLM Re-Ranking (optional, top-5 only)
    fit_score = 50 + strength_score(max 30) - gap_penalty(max 40)
    clamped to [0, 100]
```

---

## API Endpoints

| Method | Path | Purpose | Response |
|---|---|---|---|
| `POST` | `/index` | Smart incremental index (only new files) | `{indexed, cached, new, message}` |
| `POST` | `/index/force` | Clear cache + re-parse everything | `{indexed, cached, new, message}` |
| `GET` | `/index/files` | List all PDFs with cached/pending status | `{files[], total, indexed_count, pending_count}` |
| `POST` | `/search` | Hybrid BM25+Vector search | `{results[{candidate_id, name, scores, skills}], total}` |
| `GET` | `/status` | System health check | `{resumes_ready, vector_store_ready, hybrid_ready, pinecone_vector_count}` |

---

## Component Descriptions

| Component | File | Responsibility |
|---|---|---|
| FastAPI Backend | `api/main.py` | 5 REST endpoints for index/search/status/files |
| HybridIndexer | `core/hybrid_indexer.py` | Orchestrates BM25 + Pinecone + RRF |
| VectorStore | `core/vector_store.py` | Pinecone upsert and query |
| Ingestion | `core/ingestion.py` | PDF -> Document + cache + rate-limit + retry |
| Parse Cache | `data/parsed_cache.json` | Stores Gemini parse results to avoid re-parsing |
| ResumeParser | `core/parsing.py` | LLM-based structured field extraction |
| ReRanker | `core/re_ranker.py` | Gemini evaluation with weighted scoring |
| Filters | `core/filters.py` | Post-search filtering (skills/location/exp) |
| MemoryRAG | `core/memory_rag.py` | LangChain conversation memory |
| SearchRouter | `core/search_router.py` | Routes to shallow or deep search strategy |
| RAGEvaluator | `core/evaluator.py` | RAGAS quality metrics |
| React Frontend | `frontend/src/` | Modern dashboard with 4 pages |

---

## React Frontend Architecture

```
frontend/src/
├── App.js                  # Global state: indexing, status, toasts, search results
├── App.css                 # All styles (single file)
│
├── services/
│   └── api.js              # fetchStatus, triggerIndex, forceIndex, fetchFileList, searchCandidates
│
├── components/
│   ├── Sidebar.js          # Left nav + connection status lights (API/Vector/Search)
│   ├── TopBar.js           # Header tabs + indexing progress pill
│   ├── StatCards.js        # 4 metric cards with glow status dots
│   ├── CandidateCard.js    # Expandable result card (scores, skills, details)
│   ├── ToastContainer.js   # Notification system
│   └── Spinner.js          # Loading indicators
│
└── pages/
    ├── DashboardPage.js    # System overview, status lights, recent searches, quick actions
    ├── SearchPage.js       # Search form -> POST /search -> display ranked results
    ├── UploadPage.js       # Index controls, summary stats, file tracker grid
    └── CandidatesPage.js   # Browse candidates from last search
```

**Key design decisions:**
- **Indexing state lives in App.js** — persists across tab switches, shows banner on all pages
- **Status polling every 10s** — keeps connection lights and stats current
- **File tracker uses GET /index/files** — shows cached vs pending with filter pills
- **lucide-react icons** — consistent, beautiful iconography throughout

---

## Re-Ranker Scoring Detail

### LLM path (Gemini available)
```
1. Gemini extracts: 3 strengths, 3 gaps, any risks, summary
2. For each item in strengths/gaps:
   - positional_weight = (n - i) / n  (first item = highest weight)
   - skill_match_weight = positional bonus if item matches a required skill
   - experience_bonus = +0.2 if item mentions "experience"/"years"/"senior"
3. strength_score = aggregate(strengths, max=30, is_gap=False)
4. gap_penalty   = aggregate(gaps, max=40, is_gap=True)
5. fit_score = clamp(50 + strength_score - gap_penalty, 0, 100)
```

### Fallback path (LLM unavailable)
```
fit_score = 50 + (20 * n_strengths) - (15 * n_gaps)
clamped to [0, 100]
```

---

## Startup Behaviour

### FastAPI Backend
1. Lazily initializes `HybridIndexer` on first request
2. HybridIndexer connects to Pinecone on init

### React Frontend
1. Polls `GET /status` every 10 seconds
2. Shows connection status lights (green/red glow dots)
3. Upload page loads `GET /index/files` to show file tracker

### Indexing (POST /index)
1. Loads `parsed_cache.json`
2. Scans `data/resumes/` for all PDFs
3. Cached files: load metadata instantly, create Documents
4. New files: call Gemini (4s rate-limit), save to cache, create Documents
5. Index ALL Documents into BM25 + Pinecone
6. Return counts: `{indexed, cached, new}`

### Force Re-index (POST /index/force)
1. Deletes `parsed_cache.json`
2. Runs full indexing (all files treated as new)

---

## Running Tests

```bash
pytest tests/ -v
```

All tests use `unittest.mock` — no live Pinecone or Gemini calls.

| Test file | Covers |
|---|---|
| `tests/test_filters.py` | skills / location / experience filtering |
| `tests/test_hybrid_indexer.py` | BM25 indexing, RRF fusion, score normalization |
| `tests/test_re_ranker.py` | LLM evaluation, rule-based fallback, section parsing |
| `tests/test_ingestion.py` | PDF loading, metadata extraction, DocumentProcessor |
