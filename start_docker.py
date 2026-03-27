"""
Docker entrypoint – starts FastAPI backend and serves the React build.
The FastAPI app also serves the React static files in production mode.
"""
import uvicorn
import subprocess
import sys
import signal

def main():
    # Start static file server for React build on port 3000
    frontend = subprocess.Popen(
        [sys.executable, "-m", "http.server", "3000", "--directory", "frontend/build"],
    )

    # Start FastAPI on port 8000
    try:
        uvicorn.run("api.main:app", host="0.0.0.0", port=8000, workers=2)
    finally:
        frontend.terminate()

if __name__ == "__main__":
    signal.signal(signal.SIGTERM, lambda *_: sys.exit(0))
    main()
