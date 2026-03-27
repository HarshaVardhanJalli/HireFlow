# HireFlow — AI-Powered Resume Search Engine

HireFlow is an intelligent candidate search system. You give it a pile of PDF resumes and a job description, and it finds the best-matching candidates using a combination of keyword search, semantic (meaning-based) search, and AI evaluation.

Think of it like Google for resumes — but instead of just matching keywords, it actually **understands** what the resume says and how well the candidate fits your role.

---

## Table of Contents

- [How It Works (The Big Picture)](#how-it-works-the-big-picture)
- [Setup Guide](#setup-guide)
- [Running the App](#running-the-app)
- [Project Structure](#project-structure)
- [Layer-by-Layer Breakdown](#layer-by-layer-breakdown)
  - [Layer 1: Configuration (utils/)](#layer-1-configuration--utilities-utils)
  - [Layer 2: Ingestion Pipeline (core/ingestion.py + core/parsing.py)](#layer-2-ingestion-pipeline)
  - [Layer 3: Search Engine (core/hybrid_indexer.py + core/vector_store.py)](#layer-3-search-engine)
  - [Layer 4: Post-Search Filtering (core/filters.py)](#layer-4-post-search-filtering)
  - [Layer 5: AI Re-Ranking (core/re_ranker.py)](#layer-5-ai-re-ranking)
  - [Layer 6: Memory & Evaluation (core/memory_rag.py + core/evaluator.py)](#layer-6-memory--evaluation)
  - [Layer 7: API Backend (api/main.py)](#layer-7-api-backend)
  - [Layer 8: React Frontend (frontend/)](#layer-8-react-frontend)
- [End-to-End Data Flow](#end-to-end-data-flow)
- [Key Algorithms Explained](#key-algorithms-explained)
- [Technology Stack](#technology-stack)
- [Testing](#testing)
- [Feature Walkthrough](#feature-walkthrough)

---

## How It Works (The Big Picture)

Here's what happens when you search for a candidate:

```
                          YOUR SEARCH QUERY
                      "Senior Accountant with tax expertise"
                                  |
                                  v
              +-------------------+-------------------+
              |                                       |
        BM25 (Keyword)                      Pinecone (Semantic)
        "Does the resume                    "Does the resume MEAN
         CONTAIN these words?"               something SIMILAR?"
              |                                       |
              v                                       v
        Keyword scores                        Similarity scores
              |                                       |
              +-------------------+-------------------+
                                  |
                                  v
                    Reciprocal Rank Fusion (RRF)
                    Merges both ranked lists into one
                                  |
                                  v
                        Post-Search Filters
                    "Must have QuickBooks skill"
                    "Must be in New York"
                    "Must have 3+ years experience"
                                  |
                                  v
                      AI Re-Ranking (Gemini)
                  Reads each resume and scores:
                  - Fit Score (0-100)
                  - Strengths, Gaps, Risks
                                  |
                                  v
                        RANKED CANDIDATES
                  Displayed in the React dashboard
```

**Why two search methods?**
- **BM25 (keyword search)** is great when you know the exact terms — "QuickBooks", "CPA", "Excel". It finds resumes that literally contain those words.
- **Vector search (semantic)** is great when meaning matters — searching "financial reporting" will also find resumes mentioning "accounting statements" or "fiscal analysis" even if those exact words weren't in your query.
- **Combining both** gives you the best of both worlds. A candidate who matches on both keywords AND meaning ranks highest.

---

## Setup Guide

### Prerequisites

- Python 3.9 or higher
- Node.js 16+ and npm (for the React frontend)
- A Google AI API key (for Gemini LLM) — [Get one here](https://aistudio.google.com/apikey)
- A Pinecone API key (for vector search) — [Sign up here](https://app.pinecone.io/) (free tier works)

### Step 1: Create a virtual environment

```bash
cd "Hireflow 2"
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
```

### Step 2: Install Python dependencies

```bash
pip install -r requirements.txt
```

### Step 3: Install React frontend dependencies

```bash
cd frontend
npm install
cd ..
```

### Step 4: Create a `.env` file

Create a file called `.env` in the project root with your API keys:

```env
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX_NAME=hireflow
GOOGLE_API_KEY=your_google_api_key_here
```

| Variable | What it does | Required? |
|---|---|---|
| `PINECONE_API_KEY` | Connects to Pinecone cloud for vector search | Yes, for full search |
| `PINECONE_INDEX_NAME` | Name of the Pinecone index (default: `hireflow`) | Optional |
| `GOOGLE_API_KEY` | Powers Gemini LLM for resume parsing and AI evaluation | Yes, for AI features |

> **Note:** The app works without these keys in degraded mode — BM25 keyword search still works, but you lose semantic search and AI evaluation.

### Step 5: Add resume PDFs

Place your PDF resumes in the `data/resumes/` folder.

---

## Running the App

Open **two terminals**:

**Terminal 1 — Start the FastAPI backend:**
```bash
source .venv/bin/activate
python start_backend.py
```
This starts the API server at `http://localhost:8000`. Visit `http://localhost:8000/docs` for interactive Swagger docs.

**Terminal 2 — Start the React frontend:**
```bash
cd frontend
npm start
```
This opens the React dashboard at `http://localhost:3000`.

### Alternative: CLI mode

```bash
source .venv/bin/activate
python main.py
```
A simple interactive prompt where you type queries and see results.

### Alternative: Streamlit UI (legacy)

```bash
source .venv/bin/activate
streamlit run streamlit/app.py
```

---

## Project Structure

```
Hireflow 2/
|
├── .env                            # Your API keys (you create this)
├── requirements.txt                # Python dependencies
├── main.py                         # CLI entry point
├── start_backend.py                # Starts FastAPI server
|
├── api/                            # REST API layer
│   └── main.py                     # FastAPI endpoints (5 endpoints)
|
├── core/                           # Business logic (the brain)
│   ├── ingestion.py                # PDF loading + Gemini parsing + caching
│   ├── parsing.py                  # Gemini-powered structured resume extraction
│   ├── hybrid_indexer.py           # BM25 + vector search + RRF fusion
│   ├── vector_store.py             # Pinecone vector database manager
│   ├── filters.py                  # Post-search skill/location/experience filters
│   ├── re_ranker.py                # AI-powered candidate evaluation (0-100 score)
│   ├── memory_rag.py               # Search history tracking
│   ├── search_router.py            # Routes to shallow or deep search
│   └── evaluator.py                # RAGAS quality metrics
|
├── utils/                          # Shared utilities
│   ├── config.py                   # Loads .env variables
│   ├── schemas.py                  # Pydantic data models
│   ├── embeddings.py               # HuggingFace embedding model
│   ├── utils.py                    # Text cleaning, PDF loading, logging
│   └── multi_query.py              # Query expansion via LLM
|
├── frontend/                       # React web dashboard
│   ├── src/
│   │   ├── App.js                  # Root component (routing, global state)
│   │   ├── App.css                 # All styles
│   │   ├── components/
│   │   │   ├── Sidebar.js          # Left navigation with status lights
│   │   │   ├── TopBar.js           # Top header with tabs + indexing indicator
│   │   │   ├── StatCards.js        # 4 stat cards (indexed, searches, etc.)
│   │   │   ├── CandidateCard.js    # Expandable candidate result card
│   │   │   ├── ToastContainer.js   # Notification toasts
│   │   │   └── Spinner.js          # Loading spinners
│   │   ├── pages/
│   │   │   ├── DashboardPage.js    # Analytics: system status, recent searches
│   │   │   ├── SearchPage.js       # Search form + ranked results
│   │   │   ├── UploadPage.js       # Index controls + file tracker
│   │   │   └── CandidatesPage.js   # Browse last search results
│   │   └── services/
│   │       └── api.js              # All fetch calls to FastAPI backend
│   └── package.json
|
├── streamlit/                      # Legacy Streamlit UI
│   └── app.py
|
├── tests/                          # Unit tests
│   ├── test_ingestion.py
│   ├── test_hybrid_indexer.py
│   ├── test_filters.py
│   └── test_re_ranker.py
|
├── data/
│   ├── resumes/                    # Put your PDF resumes here
│   ├── parsed_cache.json           # Auto-generated: cached Gemini parse results
│   └── memory/                     # Auto-generated: search history
|
└── HireFlow_Architecture.md        # Architecture diagrams (Mermaid)
```

---

## Layer-by-Layer Breakdown

### Layer 1: Configuration & Utilities (`utils/`)

These are the foundational files that every other module depends on.

#### `utils/config.py` — Environment Configuration

**What it does:** Reads your `.env` file and makes API keys and settings available to the rest of the app.

**How it works:**
- Uses Pydantic's `BaseSettings` to define all configuration fields with defaults
- Automatically loads values from the `.env` file using `python-dotenv`
- Exports constants that other files import: `GOOGLE_API_KEY`, `PINECONE_API_KEY`, `LLM_MODEL`, etc.

```python
# Other files use it like this:
from utils.config import GOOGLE_API_KEY, PINECONE_API_KEY
```

**Key settings:**
| Setting | Default | Purpose |
|---|---|---|
| `GOOGLE_API_KEY` | None | Gemini LLM access |
| `LLM_MODEL` | `gemini-2.5-flash-lite` | Which Gemini model to use |
| `PINECONE_API_KEY` | None | Pinecone vector DB access |
| `PINECONE_INDEX_NAME` | `hireflow` | Name of the vector index |
| `PINECONE_DIMENSION` | `384` | Embedding vector size (matches all-MiniLM-L6-v2) |
| `PINECONE_METRIC` | `cosine` | How vectors are compared |
| `MAX_TEXT_LENGTH` | `4000` | Max characters sent to LLM |

---

#### `utils/schemas.py` — Data Models

**What it does:** Defines the "shape" of data that flows through the system.

**Three main models:**

1. **`SearchQuery`** — `title`, `text`, `required_skills`
2. **`Resume`** — `candidate_id`, `name`, `email`, `phone`, `location`, `text`, `skills`, `experience`
3. **`CandidateEvaluation`** — `fit_score` (0-100), `strengths`, `gaps`, `risks`, `summary`

---

#### `utils/embeddings.py` — Embedding Model

Loads HuggingFace `all-MiniLM-L6-v2` — runs **locally** on your machine (no API calls). Converts text to 384-dimensional vectors for semantic search.

---

#### `utils/utils.py` — Common Helpers

| Function | Purpose |
|---|---|
| `get_logger(name)` | Named logger for consistent output |
| `clean_text(text)` | Strips weird characters, normalizes whitespace |
| `truncate_text(text, max_length)` | Cuts text for LLM token limits |
| `load_pdf(file_path)` | Extracts all text from a PDF via PyPDF |
| `split_text(text, chunk_size)` | Breaks long text into smaller chunks |
| `is_quota_error(error)` | Detects API rate limit errors |

---

### Layer 2: Ingestion Pipeline

This is how resumes go from PDF files on disk to searchable data.

#### `core/ingestion.py` — PDF Loading, Parsing & Caching

**What it does:** Scans `data/resumes/`, reads each PDF, parses it via Gemini, and returns structured `Document` objects. Includes **caching**, **rate limiting**, and **incremental indexing**.

**Key features:**

| Feature | How it works |
|---|---|
| **Parse cache** | Results are saved to `data/parsed_cache.json`. If a resume was already parsed, Gemini is NOT called again — the cached result is loaded instantly. |
| **Incremental indexing** | Only new PDFs (not in cache) are sent to Gemini. Previously indexed files load from cache in milliseconds. |
| **Rate limiting** | 4-second delay between Gemini API calls (~15 RPM), staying within the free tier limit. |
| **Retry with backoff** | On 429 (rate limit) errors, waits 30s → 60s → 90s and retries up to 3 times. |

**The flow:**
```
PDF files in data/resumes/
    |
    +--> Check parsed_cache.json
    |       |
    |       +--> CACHED: Load parsed metadata instantly (no Gemini call)
    |       |
    |       +--> NOT CACHED: Call Gemini to parse, save result to cache
    |                         (with 4s rate-limit between calls)
    |
    v
Document objects with:
  - page_content = raw resume text
  - metadata = {candidate_id, name, skills, location, experience}
```

**Key functions:**

| Function | Purpose |
|---|---|
| `load_resumes(directory, only_new, progress_callback)` | Main entry point. Loads cached files instantly, parses new ones with Gemini. |
| `get_all_pdf_files(directory)` | Returns sorted list of PDF filenames |
| `get_indexed_files()` | Returns list of filenames already in the cache |
| `_try_parse_resume(text, candidate_id, max_retries)` | Calls Gemini with retry + backoff on 429 |
| `_load_cache()` / `_save_cache(cache)` | Read/write `parsed_cache.json` |

---

#### `core/parsing.py` — AI-Powered Resume Parsing

**What it does:** Uses Google Gemini to extract structured fields from raw resume text.

**The LangChain chain:**
```
PromptTemplate (instructions + resume text)
    -> ChatGoogleGenerativeAI (Gemini)
    -> PydanticOutputParser (validates output matches Resume schema)
    -> Dict with name, skills, location, experience, etc.
```

---

### Layer 3: Search Engine

#### `core/vector_store.py` — Pinecone Vector Database

Manages the Pinecone cloud vector DB for semantic search.

| Method | What it does |
|---|---|
| `initialize()` | Connects to Pinecone, creates index if needed |
| `add_resumes(documents)` | Embeds resume text -> vectors, upserts to Pinecone |
| `search_resumes(query, top_k)` | Embeds query -> finds most similar resume vectors |
| `get_stats()` | Returns total vector count and index dimensions |

---

#### `core/hybrid_indexer.py` — The Search Orchestrator

Runs both BM25 and vector search, combines results with Reciprocal Rank Fusion (RRF).

**`search_resumes(query, top_k)`:**
1. BM25: scores all resumes by keyword overlap
2. Pinecone: embeds query -> finds most similar vectors
3. `combine_results()`: RRF fusion merges both ranked lists
4. Returns top_k candidates with `bm25_score`, `vector_score`, `combined_score`

---

### Layer 4: Post-Search Filtering

#### `core/filters.py`

| Filter | Logic |
|---|---|
| `filter_by_skills()` | Candidate must have ALL required skills (case-insensitive) |
| `filter_by_location()` | Location must contain any target string |
| `filter_by_experience()` | Experience must be >= minimum |

---

### Layer 5: AI Re-Ranking

#### `core/re_ranker.py`

Gemini reads each resume against the job description and produces:
- **fit_score** (0-100): `50 + strength_score (max +30) - gap_penalty (max -40)`
- **strengths**, **gaps**, **risks**, **summary**

Falls back to rule-based scoring if Gemini is unavailable.

---

### Layer 6: Memory & Evaluation

#### `core/memory_rag.py` — Search History

Tracks searches and candidate views using LangChain conversation memory.

#### `core/evaluator.py` — RAGAS Quality Metrics

Measures search quality with: Answer Relevancy, Context Precision, Faithfulness, Answer Correctness.

---

### Layer 7: API Backend

#### `api/main.py` — FastAPI REST Endpoints

**Five endpoints:**

#### `POST /index` — Smart Incremental Index
Only parses new files (not in cache). Cached files load instantly.

```bash
curl -X POST http://localhost:8000/index
```

Response:
```json
{
  "indexed": 50,
  "cached": 45,
  "new": 5,
  "message": "Indexed 50 resumes (45 from cache, 5 newly parsed)"
}
```

#### `POST /index/force` — Force Re-index
Clears the parse cache and re-parses ALL PDFs from scratch.

```bash
curl -X POST http://localhost:8000/index/force
```

#### `GET /index/files` — File Status Tracker
Lists every PDF with its cached/pending status and parsed metadata.

```bash
curl http://localhost:8000/index/files
```

Response:
```json
{
  "files": [
    {"filename": "alice_smith.pdf", "indexed": true, "name": "Alice Smith", "skills": ["Python", "SQL"]},
    {"filename": "new_resume.pdf", "indexed": false, "name": null, "skills": []}
  ],
  "total": 50,
  "indexed_count": 49,
  "pending_count": 1
}
```

#### `POST /search` — Hybrid Search

```bash
curl -X POST http://localhost:8000/search \
  -H "Content-Type: application/json" \
  -d '{"query": "Senior Accountant with QuickBooks", "top_k": 5}'
```

Response includes `bm25_score`, `vector_score`, `combined_score` for each candidate.

#### `GET /status` — System Health

```bash
curl http://localhost:8000/status
```

Returns `resumes_ready`, `vector_store_ready`, `hybrid_ready`, `pinecone_vector_count`.

**Swagger Docs:** Visit `http://localhost:8000/docs` for an interactive API explorer.

---

### Layer 8: React Frontend

#### Architecture

The frontend is a modern React SPA with a modular file structure:

```
frontend/src/
├── App.js              # Root: global state (indexing, status, search results, toasts)
├── App.css             # All styles (single source of truth)
├── components/         # Reusable UI building blocks
│   ├── Sidebar.js      # Left nav with lucide icons + connection status lights
│   ├── TopBar.js       # Header with nav tabs + indexing progress indicator
│   ├── StatCards.js    # 4 stat cards with glow dots
│   ├── CandidateCard.js # Expandable candidate result with scores + skills
│   ├── ToastContainer.js # Slide-in notification toasts
│   └── Spinner.js      # Loading spinners (full-page + inline)
├── pages/              # One file per tab
│   ├── DashboardPage.js # System health, status lights, recent searches, quick actions
│   ├── SearchPage.js    # Search form -> API call -> display ranked results
│   ├── UploadPage.js    # Index controls, stats, file tracker grid
│   └── CandidatesPage.js # Browse results from last search
└── services/
    └── api.js           # All API calls (fetchStatus, triggerIndex, forceIndex, fetchFileList, searchCandidates)
```

#### Key UI Features

| Feature | Description |
|---|---|
| **Connection status lights** | Pulsing green/red glow dots everywhere — sidebar (API, Vector, Search), top bar, stat cards |
| **Global indexing state** | Indexing persists when switching tabs. A purple banner + top-right pill shows progress on any page. |
| **File tracker** | Upload page shows every PDF as a card with green (cached) or amber (pending) status, parsed name, and skill tags. Filter by All/Cached/Pending. |
| **Smart indexing** | "Index N New Resumes" button only processes uncached files. "Force Re-index" button clears cache. |
| **Candidate cards** | Expandable cards with rank medals, RRF/BM25/Vector score badges, skill tags, animated fade-in |
| **Toast notifications** | Slide-in success/error/info toasts with auto-dismiss |
| **Responsive design** | Sidebar collapses to icons on small screens, grid layouts adapt |

#### Visual Design

- **Sidebar**: White 220px with shadow, purple gradient active states, status light section at bottom
- **Background**: Subtle purple-blue gradient across all pages
- **Top bar**: Frosted glass effect (`backdrop-filter: blur`)
- **Cards**: Rounded corners (16px), hover lift, gradient top borders on stat cards
- **Brand**: "HireFlow" in 28px/800 weight with purple gradient text
- **Icons**: lucide-react library throughout (Search, Users, Database, CheckCircle2, etc.)

---

## End-to-End Data Flow

### Flow 1: Indexing

```
PDF files in data/resumes/
    |
    v
[ingestion.py] load_resumes()
    |
    +--> Check parsed_cache.json for each file
    |       |
    |       +--> CACHED: Load metadata instantly
    |       +--> NEW: Call Gemini (with 4s rate-limit + 429 retry)
    |                  Save to cache immediately after each parse
    |
    v
LangChain Document objects
    { page_content: "raw text...", metadata: {name, skills, ...} }
    |
    v
[hybrid_indexer.py] index_resumes()
    |
    +--> BM25 Index (in-memory): tokenizes all texts, builds BM25Okapi model
    |
    +--> [vector_store.py]: embeds each resume -> 384-dim vector -> upserts to Pinecone
```

### Flow 2: Searching

```
User types: "Senior Accountant with tax expertise"
    |
    v
React frontend -> POST /search -> [hybrid_indexer.py] search_resumes()
    |
    +--> BM25: scores all resumes by keyword overlap
    +--> Pinecone: embeds query -> cosine similarity search
    |
    v
combine_results() -> RRF Fusion -> top_k candidates
    |
    v
React displays: candidate cards with BM25 + Vector + RRF scores, skills, metadata
```

---

## Key Algorithms Explained

### Reciprocal Rank Fusion (RRF)

**Formula:** `rrf_score = 1 / (k + rank)` where `k = 60`

| Candidate | BM25 Rank | Vector Rank | BM25 RRF | Vector RRF | Combined |
|---|---|---|---|---|---|
| Alice | 1st | 3rd | 1/61 = 0.0164 | 1/63 = 0.0159 | **0.0323** |
| Bob | 3rd | 1st | 1/63 = 0.0159 | 1/61 = 0.0164 | **0.0323** |
| Carol | 2nd | — | 1/62 = 0.0161 | 0 | **0.0161** |

### BM25 (Best Matching 25)

Scores documents based on term frequency, inverse document frequency, and document length normalization.

### Cosine Similarity

Measures the angle between two vectors — same direction = similar meaning, regardless of length.

---

## Technology Stack

| Component | Technology | Purpose |
|---|---|---|
| **LLM** | Google Gemini (`gemini-2.5-flash-lite`) | Resume parsing, evaluation, query expansion |
| **Vector DB** | Pinecone (serverless) | Stores and searches resume embeddings |
| **Embeddings** | HuggingFace `all-MiniLM-L6-v2` | Text to 384-dim vectors (runs locally) |
| **Keyword Search** | `rank_bm25` (BM25Okapi) | Traditional keyword scoring |
| **Score Fusion** | Reciprocal Rank Fusion (k=60) | Combines BM25 + vector rankings |
| **Orchestration** | LangChain | LLM chains, memory, output parsing |
| **Backend** | FastAPI + uvicorn | REST API (5 endpoints) |
| **Frontend** | React + lucide-react | Modern dashboard SPA |
| **Legacy Frontend** | Streamlit | Still available as alternative |
| **PDF Processing** | PyPDF | Extracts text from PDF files |
| **RAG Evaluation** | RAGAS | Search quality metrics |
| **Testing** | pytest | Unit tests with mocked external services |
| **Config** | Pydantic + python-dotenv | Type-safe environment configuration |

---

## Testing

All tests mock Pinecone and Gemini — no API keys needed.

```bash
pytest tests/ -v
```

| Test File | What It Tests |
|---|---|
| `test_ingestion.py` | PDF loading, document creation, metadata extraction |
| `test_hybrid_indexer.py` | BM25 indexing, RRF fusion math, score normalization |
| `test_filters.py` | Skill/location/experience filters, case-insensitivity |
| `test_re_ranker.py` | AI evaluation, fit score calculation, fallback scoring |

---

## Feature Walkthrough

1. **Start backend** — `python start_backend.py` — check `http://localhost:8000/status`
2. **Start frontend** — `cd frontend && npm start` — opens `http://localhost:3000`
3. **Check file status** — Go to the Upload tab, see which files are cached vs pending
4. **Index resumes** — Click "Index N New Resumes" (only new files are parsed)
5. **Search** — Go to Search tab, enter a job description, click "Search Candidates"
6. **View results** — Expand candidate cards to see scores, skills, details
7. **Check analytics** — Dashboard shows system status, vector counts, recent searches
8. **Force re-index** — Click "Force Re-index" if you need to re-parse everything
9. **Run tests** — `pytest tests/ -v`
