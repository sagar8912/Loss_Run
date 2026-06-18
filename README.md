# Loss Run Dashboard

This is an Agentic AI dashboard for Loss Run processing.

## Running the Backend (FastAPI + Python)

1. Navigate to the root directory `loss_run`.
2. Install dependencies:
   ```bash
   pip install fastapi uvicorn python-multipart
   ```
3. Start the API server:
   ```bash
   uvicorn api:app --reload --port 8000
   ```

## Running the Frontend (React + Vite)

1. Navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Install dependencies (if you haven't):
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```

The dashboard will be available at `http://localhost:5174`.
