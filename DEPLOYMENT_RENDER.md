# 🚀 Deploying BalanceCycle on Render

This guide provides everything you need to deploy the complete **BalanceCycle** stack on [Render](https://render.com):
- **PostgreSQL Database** (Managed PostgreSQL)
- **Ollama LLM Service** (Self-hosted with persistent model storage)
- **FastAPI Backend** (Python 3.12 / uvicorn)
- **React Frontend** (Static Site with global CDN)

---

## ⚡ Method 1: 1-Click Blueprint Deployment (Recommended)

BalanceCycle includes a [`render.yaml`](./render.yaml) Infrastructure-as-Code blueprint that automatically configures and links all 4 services.

### Steps:
1. **Push your repository** to GitHub or GitLab.
2. Log in to your [Render Dashboard](https://dashboard.render.com).
3. Click **New +** in the top-right corner and select **Blueprint**.
4. Connect your GitHub/GitLab account and select your **BalanceCycle** repository.
5. Review the 4 automatically generated services:
   - `balancecycle-db` (PostgreSQL)
   - `balancecycle-ollama` (Ollama Web Service with 10GB persistent disk)
   - `balancecycle-backend` (FastAPI Web Service)
   - `balancecycle-frontend` (React Static Site)
6. Click **Apply**.
7. Render will provision the database, download the model, build the backend & frontend, and launch your application!

---

## 🛠️ Method 2: Manual Step-by-Step Deployment

If you prefer to configure services manually in the Render UI:

### Step 1: Create the Managed PostgreSQL Database
1. Go to **New +** -> **PostgreSQL**.
2. **Name**: `balancecycle-db`
3. **Database**: `balancecycle`
4. **User**: `balancecycle_user`
5. **Plan**: `Free` (or `Starter` for production)
6. Click **Create Database**.
7. Copy the **Internal Database URL** (e.g. `postgres://balancecycle_user:...@dpg-...:5432/balancecycle`).

---

### Step 2: Create the Ollama Web Service
1. Go to **New +** -> **Web Service**.
2. Connect your repository.
3. **Name**: `balancecycle-ollama`
4. **Runtime**: `Docker`
5. **Dockerfile Path**: `./ollama/Dockerfile`
6. **Docker Context**: `./ollama`
7. **Instance Type / Plan**:
   - For `llama3.2:1b` (recommended): **Starter** (512MB–2GB RAM)
   - For `llama3.1` (8B): **Standard / Pro** (8GB+ RAM or GPU instance)
8. **Disks** (under Advanced):
   - **Name**: `ollama-models`
   - **Mount Path**: `/root/.ollama`
   - **Size**: `10 GB`
9. **Environment Variables**:
   | Variable | Value | Description |
   | :--- | :--- | :--- |
   | `OLLAMA_MODEL` | `llama3.2:1b` | Target LLM model |
   | `PORT` | `11434` | Ollama port |
10. Click **Create Web Service**. Note its internal or public URL (e.g., `https://balancecycle-ollama.onrender.com`).

---

### Step 3: Create the FastAPI Backend Web Service
1. Go to **New +** -> **Web Service**.
2. Connect your repository.
3. **Name**: `balancecycle-backend`
4. **Runtime**: `Docker`
5. **Dockerfile Path**: `./backend/Dockerfile`
6. **Docker Context**: `./backend`
7. **Plan**: `Free` or `Starter`
8. **Environment Variables**:
   | Variable | Value | Description |
   | :--- | :--- | :--- |
   | `DATABASE_URL` | *(Select from `balancecycle-db` or paste Internal DB URL)* | PostgreSQL connection string |
   | `OLLAMA_BASE_URL` | `http://balancecycle-ollama:11434` (or `https://balancecycle-ollama.onrender.com`) | Ollama URL |
   | `OLLAMA_MODEL` | `llama3.2:1b` | Same model configured in Ollama service |
   | `ENVIRONMENT` | `production` | Production mode |
   | `ALLOWED_ORIGINS` | `*` (or your frontend Render URL) | CORS allowed domains |
9. **Health Check Path**: `/health`
10. Click **Create Web Service**. Note the backend URL (e.g., `https://balancecycle-backend.onrender.com`).

---

### Step 4: Create the React Frontend (Static Site)
1. Go to **New +** -> **Static Site**.
2. Connect your repository.
3. **Name**: `balancecycle-frontend`
4. **Build Command**: `cd frontend && npm install && npm run build`
5. **Publish Directory**: `frontend/dist`
6. **Environment Variables**:
   | Variable | Value |
   | :--- | :--- |
   | `VITE_API_URL` | `https://balancecycle-backend.onrender.com` |
7. **Redirects/Rewrites** (under Settings):
   - **Type**: `Rewrite`
   - **Source**: `/*`
   - **Destination**: `/index.html`
8. Click **Create Static Site**.

---

## 🧠 LLM Model Selection for Cloud Deployments

| Model | Memory Required | Speed on CPU | Quality | Best Plan on Render |
| :--- | :--- | :--- | :--- | :--- |
| **`llama3.2:1b`** *(Default)* | ~1.3 GB | ⚡ Very Fast | High accuracy for JSON symptom extraction | Starter (Cost-effective) |
| **`llama3.2:3b`** | ~2.8 GB | 🚀 Fast | Excellent reasoning | Standard (2–4 GB) |
| **`llama3.1` (8B)** | ~6.5 GB | ⏱️ Moderate | Highest depth | Pro / GPU Instance (8 GB+) |

> [!TIP]
> `llama3.2:1b` is highly optimized for structured entity and JSON extraction tasks. It delivers instant responses on standard Render CPU plans while keeping hosting costs minimal.

---

## 🔍 Verification & Health Checks

1. **Backend Health Check**:
   Visit `https://<your-backend-url>.onrender.com/health` — should return:
   ```json
   {
     "status": "ok",
     "service": "BalanceCycle API",
     "version": "3.0.0"
   }
   ```
2. **Interactive API Docs (Swagger UI)**:
   Visit `https://<your-backend-url>.onrender.com/docs` to test endpoints directly.
3. **Ollama Service Health**:
   Visit `https://<your-ollama-url>.onrender.com/api/tags` — should return list of installed models.
4. **Frontend App**:
   Visit `https://<your-frontend-url>.onrender.com` to test symptom logging, the interactive Cycle Wheel, Triage recommendations, and PDF generation.
