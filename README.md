# BalanceCycle

**BalanceCycle** is a women's hormonal health and menstrual cycle-tracking application. It lets you log symptoms in plain, free-form text, uses a locally-run LLM (via [Ollama](https://ollama.com)) to structure and triage that text, predicts your next cycle, surfaces trends over time, and keeps a personal remedy journal — all without sending any data to third-party services.

> ⚠️ **Not medical advice.** BalanceCycle is a personal tracking and triage-support tool. It is not a substitute for professional medical diagnosis or treatment. Always consult a qualified healthcare provider for medical concerns.

---

## ✨ Features

- **Free-text symptom logging** — type or speak how you're feeling; an LLM extracts structured symptoms (name, body area, intensity, duration, category, severity) from your description.
- **AI-assisted triage** — every log is scored `mild` / `moderate` / `severe` and mapped to a recommendation: home remedies, watch-and-wait, or "talk to a doctor," complete with a rationale.
- **Cycle tracking & prediction** — log period start/end dates and get a predicted next period, fertile window, and a "Cycle Wheel" visualization.
- **Trends & correlations** — weekly severity bar charts, this-cycle-vs-last-cycle comparisons, and correlation insights across logged symptoms.
- **Personal remedy journal** — track which remedies you've tried for which symptoms and whether they helped.
- **Doctor-visit export** — generate a PDF summary (built entirely client-side) of your logs, cycles, and triage history to bring to an appointment.
- **Privacy-first** — the LLM runs locally via Ollama; no symptom data leaves your machine. A one-click "delete all data" option is available in Settings.

---

## 🏗️ Tech Stack

| Layer         | Technology                                                                 |
|---------------|-----------------------------------------------------------------------------|
| Backend       | Python, [FastAPI](https://fastapi.tiangolo.com/), SQLAlchemy, Alembic       |
| Database      | PostgreSQL 16                                                               |
| LLM           | [Ollama](https://ollama.com) (default model: `llama3.1`), called via `httpx`|
| Frontend      | React 19, Vite, React Router, Tailwind CSS, Recharts, lucide-react          |
| PDF Export    | `jspdf` + `html2canvas` (client-side, no server round-trip)                 |
| Containerization | Docker Compose (Postgres + Ollama + backend + frontend/nginx)           |
| Testing       | `pytest`, `pytest-asyncio`                                                  |

> GitHub's automatic language detection currently reports this repository as **100% Python** for its primary language stats; in practice the project is a full-stack app with a substantial React/JavaScript frontend under `frontend/`, as reflected in the tech stack table above.

---

## 📁 Project Structure

```
BalanceCycle/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app entrypoint
│   │   ├── core/                # config + database setup
│   │   ├── models/               # SQLAlchemy models + Pydantic schemas
│   │   ├── routers/              # symptoms, triage, cycles, trends, remedies
│   │   ├── services/              # business logic (Ollama calls, triage engine, etc.)
│   │   └── alembic/               # DB migrations
│   ├── tests/                    # pytest suite
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/                # Log, Triage, Trends, Resources, Settings, Splash
│   │   ├── components/           # CycleWheel, TrendsBars, SymptomFeed, VoiceInput, etc.
│   │   ├── hooks/                 # API client, speech-to-text, local settings
│   │   └── lib/                   # date utils, PDF export, notifications
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
├── .env.docker
└── README.md
```

---

## 🚀 Getting Started

### Option A — Docker Compose (recommended)

This spins up PostgreSQL, Ollama (with the model auto-pulled), the FastAPI backend, and the React frontend served via nginx.

```bash
git clone https://github.com/snpathaks/BalanceCycle.git
cd BalanceCycle

# Copy and edit environment variables (at minimum, change POSTGRES_PASSWORD)
cp .env.docker .env

docker compose up --build
```

Once everything is healthy:

- Frontend: [http://localhost](http://localhost)
- Backend API docs (Swagger): [http://localhost:8000/docs](http://localhost:8000/docs)
- Ollama API: `http://localhost:11434`

To stop and remove containers (keeping data volumes):

```bash
docker compose down
```

To also wipe the database and Ollama model cache:

```bash
docker compose down -v
```

> **GPU note:** the `ollama` service in `docker-compose.yml` requests an NVIDIA GPU by default. If you don't have one, remove or comment out the `deploy.resources.reservations.devices` block for the `ollama` service before running `docker compose up`.

### Option B — Run locally without Docker

**Prerequisites:** Python 3.11+, Node.js 18+, PostgreSQL 16, and [Ollama](https://ollama.com) installed locally.

1. **Start Ollama and pull the model**

   ```bash
   ollama serve
   ollama pull llama3.1
   ```

2. **Backend**

   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate      # Windows: venv\Scripts\activate
   pip install -r requirements.txt

   cp .env.example .env
   # Edit .env: set DATABASE_URL to your local Postgres instance

   uvicorn app.main:app --reload
   ```

   The API will be available at `http://localhost:8000` (Swagger docs at `/docs`).

3. **Frontend**

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

   The app will be available at `http://localhost:5173`.

---

## ⚙️ Environment Variables (backend)

| Variable          | Default                              | Description                                      |
|-------------------|---------------------------------------|---------------------------------------------------|
| `DATABASE_URL`    | *(required)*                          | PostgreSQL connection string (`postgresql+psycopg://...`) |
| `OLLAMA_BASE_URL` | `http://localhost:11434`              | Base URL of the running Ollama server              |
| `OLLAMA_MODEL`    | `llama3.1`                            | Ollama model used for symptom extraction           |
| `ENVIRONMENT`     | `development`                         | `development` enables auto table creation on startup |
| `ALLOWED_ORIGINS` | `http://localhost:5173`               | Comma-separated list of allowed CORS origins        |

See `backend/.env.example` for the full template.

---

## 🔌 Key API Endpoints

| Method | Endpoint               | Description                                          |
|--------|-------------------------|--------------------------------------------------------|
| POST   | `/api/log-symptom`      | Submit free-text symptoms → LLM extraction → DB save   |
| GET    | `/api/logs`              | Paginated list of symptom logs                          |
| GET    | `/api/logs/{id}`         | Single symptom log                                       |
| POST   | `/api/triage`             | Re-run triage on an existing log                          |
| GET    | `/api/triage/cards`       | Categorized triage cards from recent logs                  |
| POST   | `/api/cycles`              | Log a period start                                           |
| PATCH  | `/api/cycles/{id}`         | Mark a period's end date                                       |
| GET    | `/api/cycles/predict`       | Predict next period + fertile window                              |
| GET    | `/api/cycles/wheel`          | Cycle Wheel visualization data                                       |
| GET    | `/api/trends/bars`            | Weekly severity bar chart data                                          |
| GET    | `/api/trends/summary`          | This-cycle-vs-last-cycle comparison + correlation insights                |
| POST   | `/api/remedies`                  | Log a tried remedy                                                          |
| GET    | `/api/remedies`                   | List remedy journal                                                           |
| DELETE | `/api/remedies/{id}`               | Remove a remedy entry                                                            |
| GET    | `/api/export/data`                  | Full structured data export (used to generate the doctor-visit PDF)               |
| DELETE | `/api/user-data`                     | Permanently delete all data for a user                                              |
| GET    | `/health`                             | Liveness probe                                                                        |

Full interactive documentation is available at `/docs` (Swagger UI) once the backend is running.

---

## 🧪 Running Tests

```bash
cd backend
pytest
```

Test coverage includes the triage engine (`test_triage_engine.py`) and the Ollama extraction service (`test_ollama_service.py`).

---

## 🩺 Disclaimer

BalanceCycle is intended for personal tracking and informational purposes only. The triage suggestions and remedies it surfaces are not a substitute for professional medical advice, diagnosis, or treatment. If you are experiencing severe symptoms, please seek immediate medical attention.

---




