#!/usr/bin/env bash
# ============================================================
#  HireFlow – One-command launcher (Backend + React Frontend)
# ============================================================
set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$PROJECT_DIR/frontend"

# Colors
GREEN='\033[0;32m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${PURPLE}"
echo "  ╔══════════════════════════════════════════╗"
echo "  ║        🚀  HireFlow AI Platform  🚀      ║"
echo "  ╚══════════════════════════════════════════╝"
echo -e "${NC}"

# ---- Activate virtual environment ----
if [ -d "$PROJECT_DIR/venv" ]; then
    echo -e "${CYAN}[1/4]${NC} Activating Python virtual environment..."
    source "$PROJECT_DIR/venv/bin/activate"
else
    echo -e "${CYAN}[1/4]${NC} No venv found — using system Python"
fi

# ---- Start Backend ----
echo -e "${CYAN}[2/4]${NC} Starting FastAPI backend on port 8000..."
cd "$PROJECT_DIR"
python3 start_backend.py &
BACKEND_PID=$!
echo -e "       Backend PID: ${GREEN}$BACKEND_PID${NC}"

# ---- Build Frontend (if no build exists) ----
if [ ! -d "$FRONTEND_DIR/build" ]; then
    echo -e "${CYAN}[3/4]${NC} Building React frontend (first time)..."
    cd "$FRONTEND_DIR"
    npm run build
else
    echo -e "${CYAN}[3/4]${NC} React build exists — skipping (run 'npm run build' to rebuild)"
fi

# ---- Start Frontend ----
echo -e "${CYAN}[4/4]${NC} Starting React frontend on port 3000..."
cd "$FRONTEND_DIR"
npx serve -s build -l 3000 &
FRONTEND_PID=$!
echo -e "       Frontend PID: ${GREEN}$FRONTEND_PID${NC}"

# ---- Summary ----
echo ""
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}  HireFlow is running!${NC}"
echo -e "  Backend  → ${CYAN}http://localhost:8000${NC}  (API + Docs: /docs)"
echo -e "  Frontend → ${CYAN}http://localhost:3000${NC}  (React App)"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo ""
echo "  Press Ctrl+C to stop both services."
echo ""

# ---- Cleanup on exit ----
cleanup() {
    echo ""
    echo -e "${PURPLE}Shutting down HireFlow...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    echo -e "${GREEN}Done.${NC}"
    exit 0
}
trap cleanup SIGINT SIGTERM

# Wait for both
wait
