"""
Document loading and processing for resumes.
Converts PDF files to LangChain Document objects with rich metadata.

Features:
 - Parsed-resume cache (data/parsed_cache.json) avoids redundant Gemini calls.
 - Rate-limiting (4 s between API calls) keeps within Gemini free-tier limits.
 - Exponential back-off + retry on 429 errors.
 - Incremental indexing: only new PDFs are parsed; cached ones are loaded instantly.
"""

import json
import os
import time
from pathlib import Path
from typing import Callable, Optional

from langchain.schema import Document

import sys
sys.path.append(str(Path(__file__).resolve().parent.parent))
from utils.utils import get_logger, load_pdf, split_text

logger = get_logger(__name__)

_project_root = Path(__file__).resolve().parent.parent
CACHE_FILE = _project_root / "data" / "parsed_cache.json"


# ---------------------------------------------------------------------------
# Cache helpers
# ---------------------------------------------------------------------------

def _load_cache() -> dict:
    """Load the parsed-resume cache from disk."""
    if CACHE_FILE.exists():
        try:
            with open(CACHE_FILE, "r") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            logger.warning("Cache file corrupted, starting fresh")
    return {}


def _save_cache(cache: dict) -> None:
    """Persist the cache to disk."""
    CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(CACHE_FILE, "w") as f:
        json.dump(cache, f, indent=2)


# ---------------------------------------------------------------------------
# Gemini call with retry + rate-limit
# ---------------------------------------------------------------------------

def _try_parse_resume(text: str, candidate_id: str, max_retries: int = 3) -> dict:
    """Call Gemini to parse a resume with exponential back-off on 429."""
    for attempt in range(max_retries):
        try:
            from core.parsing import ResumeParser
            parser = ResumeParser()
            result = parser.parse_resume(text, candidate_id)
            return result
        except Exception as e:
            err_str = str(e)
            if "429" in err_str and attempt < max_retries - 1:
                wait = 30 * (attempt + 1)       # 30 s, 60 s, 90 s
                logger.warning(
                    f"Rate-limited (429) for {candidate_id}, "
                    f"retrying in {wait}s (attempt {attempt+1}/{max_retries})"
                )
                time.sleep(wait)
            else:
                logger.warning(
                    f"Resume parsing failed for {candidate_id}, "
                    f"using basic metadata: {e}"
                )
                return {}
    return {}


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_all_pdf_files(directory: str) -> list[str]:
    """Return sorted list of PDF filenames in *directory*."""
    if not os.path.isdir(directory):
        return []
    return sorted(f for f in os.listdir(directory) if f.lower().endswith(".pdf"))


def get_indexed_files() -> list[str]:
    """Return list of filenames already present in the cache."""
    cache = _load_cache()
    return list(cache.keys())


def load_resumes(
    directory: str,
    *,
    only_new: bool = False,
    progress_callback: Optional[Callable] = None,
) -> list[Document]:
    """Load resume PDFs, parse via Gemini (cached), return Documents.

    Parameters
    ----------
    directory : str
        Folder containing PDF files.
    only_new : bool
        If True, skip files that are already in the cache (incremental mode).
    progress_callback : callable, optional
        Called as ``progress_callback(filename, index, total, cached)``
        after each file is processed so the caller can stream progress to
        the frontend.

    Returns
    -------
    list[Document]
        One Document per successfully loaded resume.
    """
    resumes: list[Document] = []

    if not os.path.isdir(directory):
        return resumes

    cache = _load_cache()
    pdf_files = get_all_pdf_files(directory)
    logger.info(f"Found {len(pdf_files)} PDFs in {directory}")

    # Decide which files to process
    if only_new:
        files_to_process = [f for f in pdf_files if f not in cache]
        cached_files = [f for f in pdf_files if f in cache]
    else:
        files_to_process = [f for f in pdf_files if f not in cache]
        cached_files = [f for f in pdf_files if f in cache]

    total = len(pdf_files)
    logger.info(
        f"Cache hit: {len(cached_files)}, "
        f"New to parse: {len(files_to_process)}, "
        f"Total: {total}"
    )

    # 1) Load cached resumes instantly (no Gemini call)
    for idx, file in enumerate(cached_files):
        file_path = os.path.join(directory, file)
        text = load_pdf(file_path)
        if not text:
            continue

        parsed = cache[file]
        candidate_id = parsed.get("candidate_id", f"c_{Path(file).stem}")
        fallback_name = Path(file).stem.replace("_", " ").title()

        doc = Document(
            page_content=text,
            metadata={
                "source": file_path,
                "filename": file,
                "candidate_id": candidate_id,
                "name": parsed.get("name") or fallback_name,
                "skills": parsed.get("skills", []),
                "location": parsed.get("location", "Unknown"),
                "experience": parsed.get("experience"),
            },
        )
        resumes.append(doc)
        if progress_callback:
            progress_callback(file, idx, total, True)

    # 2) Parse new resumes with Gemini (rate-limited)
    offset = len(cached_files)
    for idx, file in enumerate(files_to_process):
        file_path = os.path.join(directory, file)
        text = load_pdf(file_path)
        if not text:
            continue

        candidate_id = f"c_{Path(file).stem}"
        fallback_name = Path(file).stem.replace("_", " ").title()

        # Call Gemini with retry
        parsed = _try_parse_resume(text, candidate_id)

        # Save to cache immediately (even partial results)
        cache[file] = {
            "candidate_id": candidate_id,
            "name": parsed.get("name") or fallback_name,
            "skills": parsed.get("skills", []),
            "location": parsed.get("location", "Unknown"),
            "experience": parsed.get("experience"),
        }
        _save_cache(cache)

        doc = Document(
            page_content=text,
            metadata={
                "source": file_path,
                "filename": file,
                "candidate_id": candidate_id,
                "name": cache[file]["name"],
                "skills": cache[file]["skills"],
                "location": cache[file]["location"],
                "experience": cache[file]["experience"],
            },
        )
        resumes.append(doc)

        if progress_callback:
            progress_callback(file, offset + idx, total, False)

        # Rate-limit: 4 s between Gemini calls (~15 RPM)
        if idx < len(files_to_process) - 1:
            time.sleep(4)

    logger.info(f"Loaded {len(resumes)} resumes from {directory}")
    return resumes


# ---------------------------------------------------------------------------
# Legacy DocumentProcessor
# ---------------------------------------------------------------------------

class DocumentProcessor:
    """Legacy document processor class - kept for backward compatibility"""

    def __init__(self, chunk_size: int = 1000, overlap: int = 200):
        self.chunk_size = chunk_size
        self.overlap = overlap

    def load_pdf(self, file_path: str):
        return load_pdf(file_path)

    def split_text(self, text: str):
        return split_text(text, chunk_size=self.chunk_size, chunk_overlap=self.overlap)

    def process_resume_pdf(self, file_path: str):
        text = self.load_pdf(file_path)
        if text:
            return Document(
                page_content=text,
                metadata={"source": f"{Path(file_path).stem}"},
            )
        return None


def _default_data_dirs():
    project_root = Path(__file__).resolve().parent.parent
    return str(project_root / "data" / "resumes")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Ingestion demo: load resumes")
    parser.add_argument(
        "--resumes-dir", type=str, default=_default_data_dirs(),
        help="Path to resumes directory (PDFs)",
    )
    parser.add_argument("--show", action="store_true")
    args = parser.parse_args()

    print(f"Using resumes dir: {args.resumes_dir}")
    resumes = load_resumes(args.resumes_dir)
    print(f"Loaded {len(resumes)} resumes.")
