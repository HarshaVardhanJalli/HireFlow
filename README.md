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
  - [Layer 8: Web Interface (streamlit/app.py)](#layer-8-web-interface)
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
                  Displayed in the Streamlit UI
```

**Why two search methods?**
- **BM25 (keyword search)** is great when you know the exact terms — "QuickBooks", "CPA", "Excel". It finds resumes that literally contain those words.
- **Vector search (semantic)** is great when meaning matters — searching "financial reporting" will also find resumes mentioning "accounting statements" or "fiscal analysis" even if those exact words weren't in your query.
- **Combining both** gives you the best of both worlds. A candidate who matches on both keywords AND meaning ranks highest.

---

## Setup Guide

### Prerequisites

- Python 3.9 or higher
- A Google AI API key (for Gemini LLM) — [Get one here](https://aistudio.google.com/apikey)
- A Pinecone API key (for vector search) — [Sign up here](https://app.pinecone.io/) (free tier works)

### Step 1: Create a virtual environment

```bash
cd "Hireflow 2"
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
```

### Step 2: Install dependencies

```bash
pip install -r requirements.txt
```

### Step 3: Create a `.env` file

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

### Step 4: Add resume PDFs

Place your PDF resumes in the `data/resumes/` folder. The app will automatically index them on first launch.

---

## Running the App

### Option A: Web Interface (recommended)

Open **two terminals**:

**Terminal 1 — Start the backend:**
```bash
source .venv/bin/activate
python start_backend.py
```
This starts the FastAPI server at `http://localhost:8000`.

**Terminal 2 — Start the frontend:**
```bash
source .venv/bin/activate
streamlit run streamlit/app.py
```
This opens the Streamlit web UI in your browser.

### Option B: CLI mode

```bash
source .venv/bin/activate
python main.py
```
A simple interactive prompt where you type queries and see results.

### Option C: API only

```bash
source .venv/bin/activate
python start_backend.py
```
Then use `curl` or any HTTP client to hit the endpoints directly. See [Layer 7: API Backend](#layer-7-api-backend) for details.

---

## Project Structure

```
Hireflow 2/
│
├── .env                        # Your API keys (you create this)
├── requirements.txt            # Python dependencies
├── main.py                     # CLI entry point
├── start_backend.py            # Starts FastAPI server
│
├── api/                        # REST API layer
│   └── main.py                 # FastAPI endpoints (/index, /search, /status)
│
├── core/                       # Business logic (the brain)
│   ├── ingestion.py            # Loads PDF files into Document objects
│   ├── parsing.py              # Uses Gemini to extract name/skills/location from resumes
│   ├── hybrid_indexer.py       # Combines BM25 + vector search with RRF fusion
│   ├── vector_store.py         # Manages Pinecone vector database
│   ├── filters.py              # Filters results by skills, location, experience
│   ├── re_ranker.py            # AI-powered candidate evaluation (fit score 0-100)
│   ├── memory_rag.py           # Tracks search history
│   ├── search_router.py        # Routes to shallow or deep search
│   └── evaluator.py            # Measures search quality with RAGAS metrics
│
├── utils/                      # Shared utilities
│   ├── config.py               # Loads environment variables from .env
│   ├── schemas.py              # Data models (Resume, SearchQuery, CandidateEvaluation)
│   ├── embeddings.py           # Initializes the HuggingFace embedding model
│   ├── utils.py                # Text cleaning, PDF loading, logging
│   └── multi_query.py          # Generates multiple search queries from one
│
├── streamlit/                  # Web interface
│   └── app.py                  # Streamlit UI (upload, search, results, evaluation)
│
├── tests/                      # Unit tests
│   ├── test_ingestion.py       # Tests for PDF loading
│   ├── test_hybrid_indexer.py  # Tests for search and RRF fusion
│   ├── test_filters.py         # Tests for filtering logic
│   └── test_re_ranker.py       # Tests for AI evaluation
│
├── data/
│   ├── resumes/                # Put your PDF resumes here
│   └── memory/                 # Auto-generated search history files
│
└── HireFlow_Architecture.md    # Architecture diagrams (Mermaid)
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

**What it does:** Defines the "shape" of data that flows through the system. Think of these as blueprints.

**Three main models:**

1. **`SearchQuery`** — Represents a job search
   - `title` — Job title (e.g., "Senior Accountant")
   - `text` — Full job description
   - `required_skills` — List of must-have skills

2. **`Resume`** — Represents a parsed resume
   - `candidate_id` — Unique identifier
   - `name`, `email`, `phone`, `location` — Contact info
   - `text` — Raw resume text
   - `skills` — Extracted skill list
   - `experience` — Years of experience

3. **`CandidateEvaluation`** — The AI's assessment of a candidate
   - `fit_score` — 0 to 100 rating
   - `strengths` — What makes them a good fit
   - `gaps` — Where they fall short
   - `risks` — Potential concerns
   - `summary` — One-line assessment

---

#### `utils/embeddings.py` — Embedding Model Initialization

**What it does:** Loads the HuggingFace `all-MiniLM-L6-v2` model that converts text into 384-dimensional vectors.

**Why this matters:** To do semantic search, you need to convert text into numbers (vectors) that capture meaning. The sentence "experienced accountant" and "seasoned financial professional" have different words but similar vectors — that's what makes semantic search work.

**Key detail:** The model runs **locally** on your machine. No API calls needed — it downloads once and runs offline.

---

#### `utils/utils.py` — Common Utilities

**What it does:** Helper functions used everywhere in the project.

| Function | Purpose |
|---|---|
| `get_logger(name)` | Creates a named logger for consistent log output |
| `clean_text(text)` | Strips weird characters and normalizes whitespace |
| `truncate_text(text, max_length)` | Cuts text to a max length (for LLM token limits) |
| `load_pdf(file_path)` | Extracts all text from a PDF file using PyPDF |
| `split_text(text, chunk_size)` | Breaks long text into smaller chunks |
| `is_quota_error(error)` | Detects API rate limit errors |

---

#### `utils/multi_query.py` — Query Expansion

**What it does:** Takes one search query and generates multiple variations to improve search recall.

**Example:**
- Input: `"Senior Accountant with tax expertise"`
- Output: `["Senior Accountant with tax expertise", "experienced tax accountant", "accounting professional specializing in taxation"]`

**Why:** A single search query might miss good candidates who describe themselves differently. Searching with multiple variations catches more relevant results.

Uses Gemini LLM when available, falls back to simple word-based heuristics otherwise.

---

### Layer 2: Ingestion Pipeline

This is how resumes go from PDF files on disk to searchable data in the system.

#### `core/ingestion.py` — PDF Loading & Document Creation

**What it does:** Scans the `data/resumes/` folder, reads each PDF, and creates structured `Document` objects.

**The flow:**
```
PDF file on disk
    |
    v
load_pdf() extracts raw text from the PDF
    |
    v
_try_parse_resume() sends text to Gemini for structured extraction
    |
    v
Document object created with:
  - page_content = raw resume text
  - metadata = {candidate_id, name, skills, location, experience, source}
```

**Key function: `load_resumes(directory)`**
1. Finds all `.pdf` files in the directory
2. For each PDF:
   - Extracts text using PyPDF
   - Generates a `candidate_id` from the filename (e.g., `c_alice_smith`)
   - Calls `_try_parse_resume()` to extract structured fields
   - Wraps everything into a LangChain `Document`
3. Returns a list of Documents ready for indexing

**Important:** If Gemini parsing fails for a resume, ingestion **continues** — the resume is still indexed with whatever text was extracted. No single failure blocks the pipeline.

---

#### `core/parsing.py` — AI-Powered Resume Parsing

**What it does:** Uses Google Gemini to intelligently extract structured fields from raw resume text.

**Why not just regex?** Resumes come in wildly different formats. One might say "5 years of experience", another "Senior-level (2018-2023)", another has no explicit mention at all. An LLM can understand all of these.

**How it works:**
1. Creates a prompt template: _"Extract these fields from this resume: name, email, phone, location, skills, experience"_
2. Uses LangChain's `PydanticOutputParser` to force the LLM to return valid JSON matching the `Resume` schema
3. Cleans and truncates the resume text (Gemini has token limits)
4. Sends to Gemini via the chain: `prompt → LLM → parser`
5. Returns a structured dict with all extracted fields

**The LangChain chain:**
```
PromptTemplate (instructions + resume text)
    → ChatGoogleGenerativeAI (Gemini processes it)
    → PydanticOutputParser (validates output matches Resume schema)
    → Dict with name, skills, location, experience, etc.
```

---

### Layer 3: Search Engine

This is the core of HireFlow — how it finds candidates matching your query.

#### `core/vector_store.py` — Pinecone Vector Database

**What it does:** Manages the Pinecone cloud vector database for semantic (meaning-based) search.

**Key concepts for beginners:**
- A **vector** is a list of numbers (e.g., `[0.12, -0.34, 0.56, ...]`) that represents the "meaning" of text
- **Cosine similarity** measures how similar two vectors are (1.0 = identical meaning, 0.0 = unrelated)
- **Pinecone** is a cloud service that stores millions of vectors and finds the most similar ones fast

**Key methods:**

| Method | What it does |
|---|---|
| `initialize()` | Connects to Pinecone, creates the index if it doesn't exist |
| `ensure_index()` | Checks if the `hireflow` index exists with correct dimensions (384). Creates or recreates it if needed |
| `add_resumes(documents)` | Converts resume text → vectors using HuggingFace model, uploads to Pinecone |
| `search_resumes(query, top_k)` | Converts query → vector, finds the `top_k` most similar resumes in Pinecone |
| `get_stats()` | Returns index info: total vectors stored, dimensions, status |

**How `add_resumes` works:**
```
List of Documents
    → embed_documents() converts each resume text to a 384-dim vector
    → upsert to Pinecone as {id, values (vector), metadata (name, skills, etc.)}
```

**How `search_resumes` works:**
```
Query string
    → embed_query() converts to a 384-dim vector
    → Pinecone.query() finds the top_k most similar vectors (cosine similarity)
    → Returns results with similarity scores
```

---

#### `core/hybrid_indexer.py` — The Search Orchestrator

**What it does:** This is the brain of the search system. It runs **both** BM25 and vector search, then combines the results using Reciprocal Rank Fusion.

**Key methods:**

**`index_resumes(documents)`** — Indexes resumes into both search systems:
1. Extracts and lowercases text from each Document
2. Tokenizes text (splits into words) and builds a BM25 index
3. If Pinecone is available, also uploads vectors via `vector_store.add_resumes()`

**`search_resumes(query, top_k)`** — Runs a hybrid search:
1. Tokenizes the query and gets BM25 scores for all resumes
2. If Pinecone is ready, also runs vector search
3. Calls `combine_results()` to merge both result lists

**`combine_results(bm25_scores, vector_results, top_k)`** — The RRF fusion:
1. **Normalize** BM25 scores to [0, 1] by dividing by the max score
2. **Rank** both lists by their respective scores (highest first)
3. **Assign RRF scores:** `rrf_score = 1 / (60 + rank)` for each candidate in each list
4. **Merge:** If a candidate appears in both lists, their RRF scores are **added together**
5. **Sort** by combined RRF score and return the top_k

**Why RRF?** Different search methods return scores on different scales. BM25 might give scores from 0-15, while cosine similarity gives 0-1. RRF ignores the raw scores and only uses **rank position**, making the fusion fair.

---

### Layer 4: Post-Search Filtering

#### `core/filters.py` — Skills, Location & Experience Filters

**What it does:** After search returns candidates, this module removes anyone who doesn't meet hard requirements.

**Three independent filters applied in sequence:**

| Filter | Logic | Example |
|---|---|---|
| `filter_by_skills()` | Candidate must have **ALL** required skills (case-insensitive) | Required: ["Python", "SQL"] → only keeps candidates with both |
| `filter_by_location()` | Candidate location must **contain** any target location string | Target: ["New York"] → matches "New York, USA" or "New York City" |
| `filter_by_experience()` | Candidate experience must be **>=** minimum | Min: 3 → keeps candidates with 3+ years |

**`apply_filters(candidates, skills, locations, min_experience)`** chains all three:
```
Search results (e.g., 20 candidates)
    → filter_by_skills → 12 remaining
    → filter_by_location → 7 remaining
    → filter_by_experience → 5 remaining
    → Final filtered list
```

Filters are optional — if you don't specify skills/location/experience, that filter is skipped.

---

### Layer 5: AI Re-Ranking

#### `core/re_ranker.py` — Gemini-Powered Candidate Evaluation

**What it does:** Takes the top 5 filtered candidates and has Gemini LLM read each resume carefully, then score them on how well they fit the job.

**Why re-rank?** Search scores tell you about text similarity, but an LLM can understand nuance: "This candidate has the right skills but all their experience is in a different industry" — that kind of judgment.

**How `evaluate_candidate()` works:**

1. Sends resume + job description to Gemini with a prompt asking for:
   - 3 strengths (why this candidate is a good fit)
   - 3 gaps (where they fall short)
   - Any risks
   - A one-line summary

2. Parses the LLM's response using `extract_section()` to find bullet points under each heading

3. **Calculates a fit score (0-100):**
   ```
   Start at 50 (neutral)
       + strength_score (up to +30)
       - gap_penalty (up to -40)
       = fit_score (clamped to 0-100)
   ```

4. Strength/gap scoring considers:
   - **Position:** First-listed items get higher weight (LLM tends to list most important first)
   - **Skill match:** Extra weight if the strength/gap relates to a required skill
   - **Experience bonus:** Extra credit if the item mentions years of experience

**Fallback when Gemini is unavailable:**
```
fit_score = 50 + (20 * matching_skills) - (15 * missing_skills)
```
Simple but still useful — based purely on skill overlap.

**`re_rank_candidates(candidates, job_query)`:**
1. Evaluates each candidate individually
2. Sorts all evaluations by `fit_score` (highest first)
3. Returns `CandidateEvaluation` objects with scores, strengths, gaps, and summaries

---

### Layer 6: Memory & Evaluation

#### `core/memory_rag.py` — Search History Tracking

**What it does:** Uses LangChain's `ConversationBufferMemory` to track what the user has searched for and which candidates they viewed.

| Method | Purpose |
|---|---|
| `record_search(query, count)` | Logs a search query and result count |
| `record_candidate_view(name)` | Logs when a user expands a candidate's details |
| `get_search_history()` | Returns the last 5 search queries |
| `get_memory_stats()` | Returns counts: total messages, searches, candidate views |

This data is displayed on the Memory & Evaluation dashboard in the Streamlit UI.

---

#### `core/evaluator.py` — RAG Quality Evaluation (RAGAS)

**What it does:** Measures how good the search results are using industry-standard RAG metrics from the RAGAS framework.

**What is RAGAS?** It's a framework for evaluating Retrieval-Augmented Generation systems. It answers: "Are we retrieving the right documents and generating good answers?"

**Four metrics measured:**

| Metric | Weight | What it measures |
|---|---|---|
| Answer Relevancy | 30% | Are the results relevant to the query? |
| Context Precision | 30% | Are the retrieved resumes precise matches? |
| Faithfulness | 20% | Are the results factually consistent with the resumes? |
| Answer Correctness | 20% | Overall quality of the results |

**How it works:**
1. Runs a search query through the `SearchRouter`
2. Converts results to RAGAS format (question, contexts, ground_truth, answer)
3. Runs `ragas.evaluate()` with all four metrics
4. Returns a weighted average quality score

---

#### `core/search_router.py` — Intelligent Search Routing

**What it does:** Decides whether a query needs a simple fast search or a thorough deep search.

| Mode | What happens | When used |
|---|---|---|
| **Shallow** | Vector search only (fast) | Short, simple queries |
| **Deep** | Full hybrid search + LLM re-ranking | Detailed job descriptions |

Uses a LangChain `RunnableBranch` to route queries to the appropriate search strategy. If the LLM is available, it uses Gemini to analyze the query complexity. Otherwise, it routes based on query length.

---

### Layer 7: API Backend

#### `api/main.py` — FastAPI REST Endpoints

**What it does:** Provides a REST API so any client (Streamlit, curl, other apps) can index and search resumes.

**Three endpoints:**

#### `POST /index`
Triggers indexing of all PDFs in `data/resumes/`.

```bash
curl -X POST http://localhost:8000/index
```

Response:
```json
{"indexed": 50, "message": "Successfully indexed 50 resumes"}
```

**What happens internally:**
1. Calls `load_resumes("data/resumes/")` to load all PDFs
2. Calls `indexer.index_resumes(documents)` to build BM25 + Pinecone indexes
3. Returns the count of indexed resumes

#### `POST /search`
Runs a hybrid search.

```bash
curl -X POST http://localhost:8000/search \
  -H "Content-Type: application/json" \
  -d '{"query": "Senior Accountant with QuickBooks", "top_k": 5}'
```

Response:
```json
{
  "results": [
    {
      "candidate_id": "c_alice_smith",
      "name": "Alice Smith",
      "bm25_score": 0.87,
      "vector_score": 0.75,
      "combined_score": 0.032,
      "skills": ["QuickBooks", "Excel", "Accounting"],
      "location": "New York, USA",
      "experience": 5
    }
  ],
  "total": 5
}
```

**Three scores explained:**
- **bm25_score** — How well the resume matches your exact keywords (0-1)
- **vector_score** — How semantically similar the resume is to your query (0-1)
- **combined_score** — The RRF fusion score used for final ranking

#### `GET /status`
Returns system readiness.

```bash
curl http://localhost:8000/status
```

Response:
```json
{
  "resumes_ready": true,
  "vector_store_ready": true,
  "hybrid_ready": true,
  "pinecone_vector_count": 50
}
```

**Swagger Docs:** Visit `http://localhost:8000/docs` for an interactive API explorer.

---

### Layer 8: Web Interface

#### `streamlit/app.py` — The Streamlit UI

**What it does:** Provides a user-friendly web interface for uploading resumes, searching candidates, and viewing AI evaluations.

**Two main classes:**

#### `SystemManager` — Manages all core components

- **`initialize()`** — Lazy-loads all modules (HybridIndexer, VectorStore, ReRanker, MemoryRAG, etc.)
- **Smart cold-start:** Checks if Pinecone already has vectors. If yes, only rebuilds the BM25 index (fast restart). If no, does a full index.
- **`get_component(name)`** — Retrieves any initialized component by name

#### `HireFlowUI` — The UI layer

**Main page has three sections:**

1. **Upload Panel (left column)**
   - File uploader for PDF resumes
   - "Process & Index Resumes" button
   - Uploaded PDFs go through: `load_pdf() → ResumeParser → HybridIndexer.index_resumes()`

2. **Search Panel (right column)**
   - Job Title input
   - Job Description textarea
   - Required Skills (one per line)
   - Location filter
   - Min. Experience slider
   - "Find Candidates" button

3. **Results Display**
   - Each candidate shown as an expandable card with:
     - BM25, Vector, and Combined (RRF) scores
     - Skills, location, experience
     - AI evaluation: fit score, strengths, gaps, summary
     - Resume text preview

**Sidebar:**
- System status indicators
- "Force Re-index Resumes" button
- Navigation to Memory & Evaluation page

**Memory & Evaluation page:**
- Search history stats
- Recent queries list
- RAGAS quality evaluation form

---

## End-to-End Data Flow

### Flow 1: Indexing (What happens when resumes are loaded)

```
PDF files in data/resumes/
    │
    ▼
[ingestion.py] load_resumes()
    Reads each PDF, extracts raw text
    │
    ▼
[parsing.py] ResumeParser.parse_resume()
    Gemini extracts: name, skills, location, experience
    │
    ▼
Creates LangChain Document objects
    { page_content: "raw text...", metadata: {name, skills, ...} }
    │
    ▼
[hybrid_indexer.py] index_resumes()
    │
    ├──► BM25 Index (in-memory)
    │    Tokenizes all resume texts
    │    Builds BM25Okapi statistical model
    │
    └──► [vector_store.py] add_resumes()
         [embeddings.py] embeds each resume → 384-dim vector
         Upserts to Pinecone cloud
```

### Flow 2: Searching (What happens when you search)

```
User types: "Senior Accountant with tax expertise"
+ Required skills: ["QuickBooks"]
+ Location: "New York"
+ Min experience: 3
    │
    ▼
[hybrid_indexer.py] search_resumes(query, top_k=10)
    │
    ├──► BM25: scores all resumes by keyword overlap
    │    Returns: [{resume_idx: 3, score: 12.5}, ...]
    │
    └──► Pinecone: embeds query → finds most similar vectors
         Returns: [{candidate_id, score: 0.85, metadata}, ...]
    │
    ▼
[hybrid_indexer.py] combine_results() — RRF Fusion
    Ranks both lists, assigns RRF scores, merges
    Returns: top 10 candidates with combined scores
    │
    ▼
[filters.py] apply_filters()
    Removes candidates without QuickBooks skill
    Removes candidates not in New York
    Removes candidates with < 3 years experience
    Returns: maybe 5 candidates remaining
    │
    ▼
[re_ranker.py] re_rank_candidates(top_5, job_query)
    For each candidate:
      Gemini reads full resume + job description
      Extracts strengths, gaps, risks
      Calculates fit_score (0-100)
    Sorts by fit_score
    │
    ▼
Display in Streamlit with all scores and AI evaluation
```

---

## Key Algorithms Explained

### Reciprocal Rank Fusion (RRF)

RRF is a simple but effective way to combine ranked lists from different search methods.

**Formula:** `rrf_score = 1 / (k + rank)` where `k = 60`

**Example with 3 candidates searched by BM25 and Vector:**

| Candidate | BM25 Rank | Vector Rank | BM25 RRF | Vector RRF | Combined |
|---|---|---|---|---|---|
| Alice | 1st | 3rd | 1/61 = 0.0164 | 1/63 = 0.0159 | **0.0323** |
| Bob | 3rd | 1st | 1/63 = 0.0159 | 1/61 = 0.0164 | **0.0323** |
| Carol | 2nd | — | 1/62 = 0.0161 | 0 | **0.0161** |

Alice and Bob both appeared in both search results, so their scores are summed. Carol only appeared in BM25, so she ranks lower. The `k=60` dampening constant prevents the top result from dominating.

### BM25 (Best Matching 25)

A classic information retrieval algorithm. It scores documents based on:
- **Term frequency:** How often query words appear in the document
- **Inverse document frequency:** Rare words matter more than common ones
- **Document length normalization:** Longer documents don't get unfair advantage

### Cosine Similarity

Measures the angle between two vectors. If two resume vectors point in the same direction, they have similar meaning — regardless of document length.

---

## Technology Stack

| Component | Technology | Purpose |
|---|---|---|
| **LLM** | Google Gemini (`gemini-2.5-flash-lite`) | Resume parsing, candidate evaluation, query expansion |
| **Vector Database** | Pinecone (serverless) | Stores and searches resume embeddings |
| **Embeddings** | HuggingFace `all-MiniLM-L6-v2` | Converts text to 384-dimensional vectors (runs locally) |
| **Keyword Search** | `rank_bm25` (BM25Okapi) | Traditional keyword-based document scoring |
| **Score Fusion** | Reciprocal Rank Fusion (k=60) | Combines BM25 and vector search rankings |
| **Orchestration** | LangChain | Chains LLM prompts, memory, and output parsing |
| **Backend** | FastAPI + uvicorn | REST API server |
| **Frontend** | Streamlit | Interactive web UI |
| **PDF Processing** | PyPDF | Extracts text from PDF files |
| **RAG Evaluation** | RAGAS | Measures search quality with standard metrics |
| **Testing** | pytest | Unit testing with mocked external services |
| **Config** | Pydantic + python-dotenv | Type-safe environment configuration |

---

## Testing

All tests are self-contained — they mock Pinecone and Gemini, so you don't need API keys to run them.

```bash
pytest tests/ -v
```

| Test File | What It Tests |
|---|---|
| `test_ingestion.py` | PDF loading, document creation, metadata extraction, error handling |
| `test_hybrid_indexer.py` | BM25 indexing, RRF fusion math, score normalization, top_k limiting |
| `test_filters.py` | Skill/location/experience filters, case-insensitivity, AND logic |
| `test_re_ranker.py` | AI evaluation, fit score calculation, fallback scoring, section parsing |

---

## Feature Walkthrough

Follow these in order to exercise every feature:

1. **Run tests** — `pytest tests/ -v` — verify everything works
2. **Start the backend** — `python start_backend.py` — check `http://localhost:8000/status`
3. **Index resumes** — `curl -X POST http://localhost:8000/index`
4. **Search via API** — `curl -X POST http://localhost:8000/search -H "Content-Type: application/json" -d '{"query": "Senior Accountant", "top_k": 5}'`
5. **Launch the UI** — `streamlit run streamlit/app.py`
6. **Upload a resume** — Use the upload panel in the Streamlit app
7. **Search with filters** — Enter job details, skills, location, experience
8. **View AI evaluations** — Expand candidate cards to see fit scores and analysis
9. **Check memory** — Navigate to Memory & Evaluation page in the sidebar
10. **Force re-index** — Click "Force Re-index Resumes" in the sidebar
