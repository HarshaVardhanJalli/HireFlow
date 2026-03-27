"""
HireFlow FastAPI backend.

Endpoints:
    POST /index          — smart incremental index (only new files)
    POST /index/force    — force re-index everything (clears cache)
    GET  /index/files    — list all PDFs with their indexed/pending status
    POST /search         — hybrid search returning ranked candidates
    GET  /status         — returns current index stats

Run with:
    python start_backend.py
or:
    uvicorn api.main:app --reload --port 8000
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

# ---------------------------------------------------------------------------
# Bootstrap sys.path
# ---------------------------------------------------------------------------
import sys
_project_root = Path(__file__).resolve().parent.parent
if str(_project_root) not in sys.path:
    sys.path.insert(0, str(_project_root))

from core.hybrid_indexer import HybridIndexer
from core.ingestion import load_resumes, get_all_pdf_files, get_indexed_files, CACHE_FILE

# ---------------------------------------------------------------------------
# App singleton
# ---------------------------------------------------------------------------
app = FastAPI(title="HireFlow API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_indexer: Optional[HybridIndexer] = None
_DATA_RESUMES_DIR = _project_root / "data" / "resumes"


def get_indexer() -> HybridIndexer:
    global _indexer
    if _indexer is None:
        _indexer = HybridIndexer()
    return _indexer


# ---------------------------------------------------------------------------
# Request / response models
# ---------------------------------------------------------------------------

class SearchRequest(BaseModel):
    query: str
    top_k: int = 5


class CandidateResult(BaseModel):
    candidate_id: str
    name: str
    bm25_score: float
    vector_score: float
    combined_score: float
    skills: List[str]
    location: str
    experience: Optional[int]


class SearchResponse(BaseModel):
    results: List[CandidateResult]
    total: int


class IndexResponse(BaseModel):
    indexed: int
    cached: int
    new: int
    message: str


class FileStatus(BaseModel):
    filename: str
    indexed: bool
    name: Optional[str] = None
    skills: List[str] = []


class FilesResponse(BaseModel):
    files: List[FileStatus]
    total: int
    indexed_count: int
    pending_count: int


class StatusResponse(BaseModel):
    resumes_ready: bool
    vector_store_ready: bool
    hybrid_ready: bool
    pinecone_vector_count: int


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/index/files", response_model=FilesResponse,
         summary="List all PDFs with indexed/pending status")
def list_files():
    """Show every PDF in data/resumes/ and whether it has been parsed & cached."""
    all_pdfs = get_all_pdf_files(str(_DATA_RESUMES_DIR))
    indexed = get_indexed_files()
    indexed_set = set(indexed)

    # Load cache for metadata
    cache = {}
    if CACHE_FILE.exists():
        try:
            with open(CACHE_FILE) as f:
                cache = json.load(f)
        except (json.JSONDecodeError, IOError):
            pass

    files = []
    for pdf in all_pdfs:
        is_indexed = pdf in indexed_set
        entry = cache.get(pdf, {})
        files.append(FileStatus(
            filename=pdf,
            indexed=is_indexed,
            name=entry.get("name"),
            skills=entry.get("skills", []),
        ))

    indexed_count = sum(1 for f in files if f.indexed)
    return FilesResponse(
        files=files,
        total=len(files),
        indexed_count=indexed_count,
        pending_count=len(files) - indexed_count,
    )


@app.post("/index", summary="Smart incremental index (only new files)")
def index_resumes():
    """Parse only un-cached PDFs, then index ALL into BM25 + Pinecone."""
    indexer = get_indexer()

    progress_events: list[dict] = []

    def on_progress(filename, idx, total, cached):
        progress_events.append({
            "filename": filename,
            "index": idx,
            "total": total,
            "cached": cached,
        })

    resumes = load_resumes(
        str(_DATA_RESUMES_DIR),
        only_new=False,
        progress_callback=on_progress,
    )

    if not resumes:
        raise HTTPException(status_code=404, detail="No resume PDFs found in data/resumes/")

    ok = indexer.index_resumes(resumes)
    if not ok:
        raise HTTPException(status_code=500, detail="Indexing failed — check server logs")

    cached_count = sum(1 for e in progress_events if e.get("cached"))
    new_count = sum(1 for e in progress_events if not e.get("cached"))

    return IndexResponse(
        indexed=len(resumes),
        cached=cached_count,
        new=new_count,
        message=(
            f"Indexed {len(resumes)} resumes "
            f"({cached_count} from cache, {new_count} newly parsed)"
        ),
    )


@app.post("/index/force", summary="Force re-index everything (clears cache)")
def force_index():
    """Delete the parse cache and re-process all PDFs from scratch."""
    if CACHE_FILE.exists():
        CACHE_FILE.unlink()

    return index_resumes()


@app.post("/search", response_model=SearchResponse,
          summary="Search for matching candidates")
def search(request: SearchRequest):
    indexer = get_indexer()
    if not indexer.bm25_resumes:
        raise HTTPException(
            status_code=503,
            detail="Index not ready. Call POST /index first.",
        )
    raw_results = indexer.search_resumes(request.query, top_k=request.top_k)
    results = [
        CandidateResult(
            candidate_id=r.get("candidate_id", ""),
            name=r.get("name", "Unknown"),
            bm25_score=round(r.get("bm25_score", 0.0), 4),
            vector_score=round(r.get("vector_score", 0.0), 4),
            combined_score=round(r.get("combined_score", 0.0), 4),
            skills=r.get("skills", []),
            location=r.get("location", "Unknown"),
            experience=r.get("experience"),
        )
        for r in raw_results
    ]
    return SearchResponse(results=results, total=len(results))


@app.get("/status", response_model=StatusResponse,
         summary="Get current index status")
def status():
    indexer = get_indexer()
    stats = indexer.get_index_stats()
    pinecone_count = 0
    if indexer.vector_store.is_ready():
        pinecone_stats = indexer.vector_store.get_stats()
        pinecone_count = pinecone_stats.get("total_vector_count", 0)
    return StatusResponse(
        resumes_ready=stats["resumes_ready"],
        vector_store_ready=stats["vector_store_ready"],
        hybrid_ready=stats["hybrid_ready"],
        pinecone_vector_count=pinecone_count,
    )
