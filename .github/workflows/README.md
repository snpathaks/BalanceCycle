# CI/CD Pipeline — BalanceCycle

This directory contains the GitHub Actions workflows that power the
**Continuous Integration** and **Continuous Deployment** pipeline for BalanceCycle.

---

## Workflows

| File | Trigger | Purpose |
|---|---|---|
| [`ci.yml`](./ci.yml) | Every push & PR | Lint, test, Docker build (parallel) |
| [`cd.yml`](./cd.yml) | Push to `main` only | Quality gate + Render deploy trigger |

---

## CI Pipeline (`ci.yml`)

Runs **two jobs in parallel** on every push and pull request:

### `backend-ci`
| Step | Tool | What it checks |
|---|---|---|
| Lint | `flake8` | Code style, unused imports, obvious errors |
| Test | `pytest` | Unit tests (pure Python, no DB needed) |
| Docker | `docker/build-push-action` | Dockerfile correctness |

### `frontend-ci`
| Step | Tool | What it checks |
|---|---|---|
| Lint | `oxlint` | JS/JSX style and correctness |
| Build | `vite build` | Production bundle compiles without error |
| Docker | `docker/build-push-action` | nginx Dockerfile correctness |

---

## CD Pipeline (`cd.yml`)

Runs on every push to `main`. Contains:
1. **Quality gate** — re-runs all checks (same as CI) before deploying
2. **Deploy trigger** — pings Render deploy hooks (optional, see below)

### Deployment Strategy

**Option A (Default — no secrets needed)**  
Render's native GitHub integration auto-deploys every push to `main`.
The `cd.yml` workflow acts as a safety gate ensuring tests pass before
Render sees the push.

**Option B (Explicit deploy via hooks — more control)**  
Disable Render's auto-deploy and add these GitHub secrets:

| Secret Name | Value |
|---|---|
| `RENDER_DEPLOY_HOOK_BACKEND` | Copy from Render → Service → Settings → Deploy Hook |
| `RENDER_DEPLOY_HOOK_FRONTEND` | Copy from Render → Service → Settings → Deploy Hook |

**How to add secrets:**
1. Go to your GitHub repo → **Settings → Secrets and variables → Actions**
2. Click **New repository secret**
3. Paste the deploy hook URL from your Render dashboard

---

## Environments

The CD workflow uses a `production` GitHub Environment, which lets you:
- Add **required reviewers** before a deploy goes out
- Set **wait timers** between jobs
- View deploy history in the GitHub UI

**To create the environment:**  
GitHub repo → **Settings → Environments → New environment** → name it `production`

---

## Caching

Both workflows use GitHub Actions cache for fast re-runs:
- `pip` cache keyed on `backend/requirements.txt`
- `npm` cache keyed on `frontend/package-lock.json`
- Docker layer cache via `type=gha`

A cold run takes ~3–5 min. Warm (cache-hit) runs take ~1–2 min.

---

## Local Development Commands

Replicate CI steps locally before pushing:

```bash
# Backend
cd backend
pip install -r requirements.txt
flake8 app/ tests/ --max-line-length=120 --extend-ignore=E203,W503
pytest tests/ -v

# Frontend
cd frontend
npm ci
npm run lint
npm run build
```
