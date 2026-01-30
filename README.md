```markdown
# Secreto Web Live — System README

Last updated: 2026-01-23

This repository contains a production-ready full-stack web system composed of:
- Frontend application (single-page application)
- Backend API built with FastAPI
- Relational database service (PostgreSQL recommended)
- Caddy reverse proxy for TLS, routing and static file serving
- Docker & Docker Compose infrastructure for local development and production deployment

This README explains architecture, responsibilities of each service, how services communicate, networking and ports, environment variables, run instructions, request flow, folder layout and notes intended for human developers and AI agents.

---

## 1. Project Overview

Secreto Web Live is a modular, microservice-style full-stack web application. The frontend is responsible for UI/UX and calling the backend API. The backend is a FastAPI service that implements the business logic, authentication, validation, and persistence. Data is stored in a relational database (Postgres). Caddy acts as the edge reverse-proxy, handling TLS termination, static assets, routing and proxying requests to the frontend or backend as appropriate.

The system is containerized using Docker and composed with Docker Compose for reproducible environments and easy deployment.

Goals:
- Clear separation of concerns (UI / API / Data / Proxy)
- Production-grade defaults (TLS, reverse proxy, volumes)
- Developer-friendly local workflow (single docker-compose command)
- Machine-readable organization for AI agents

---

## 2. System Architecture Explanation

High-level components:
- Client (browser or mobile): interacts with the system over HTTPS.
- Caddy (reverse proxy): edge component that receives incoming traffic, serves static files from the frontend build when appropriate, and proxies API calls to the backend. Provides TLS (Let's Encrypt or certificates provided via volume).
- Frontend app: single-page application (SPA) built with modern JS frameworks (e.g., React/Vue/Svelte). It is built into static assets and served either by Caddy or by a dedicated container that provides static hosting.
- Backend API (FastAPI): REST (and/or WebSocket) API that performs application logic and JSON responses. Runs with ASGI server (uvicorn/gunicorn+uvicorn workers).
- Database (PostgreSQL): stores persistent data. Exposes a port only to the internal Docker network. Backups and migrations are part of the deployment process.

Deployment model:
- Container-based microservices on a single host (or orchestrated cluster), with Docker Compose for multi-container orchestration.
- Caddy exposes ports 80/443 to the world; internal services communicate on an isolated overlay network.

Example runtime technologies:
- Frontend: Node.js build toolchain, static assets
- Backend: Python 3.10+, FastAPI, Pydantic, SQLAlchemy or equivalent, Alembic for migrations
- Database: PostgreSQL 14+
- Reverse proxy: Caddy 2.x

---

## 3. Services Description

Service: frontend
- Purpose: Present UI, handle client-side routing, user interactions, authentication flows (e.g., token storage), and call backend API endpoints.
- Responsibilities:
  - Build step produces static files (HTML/CSS/JS).
  - Optionally do Server Side Rendering (SSR) depending on framework (this doc assumes SPA static build).
  - Provide health endpoints (if running as a server) or rely on Caddy health checks.
- Typical ports: internal 3000 or 80 for static server — not exposed to the public if Caddy serves build.

Service: backend (FastAPI)
- Purpose: Provide JSON REST API, implement business rules, authentication, authorization, and orchestrate database operations.
- Responsibilities:
  - Expose HTTP API (e.g., /api/*) and optionally WebSocket endpoints.
  - Validate requests with Pydantic.
  - Interact with the database via an ORM or raw SQL.
  - Run database migrations on deploy (via Alembic or similar).
  - Log structured JSON for observability.
- Typical internal port: 8000 (uvicorn)

Service: database (PostgreSQL)
- Purpose: Durable storage of application state, relational data integrity, transactions.
- Responsibilities:
  - Store tables, indices, and migrations.
  - Provide backups and restore procedures.
  - Limit public exposure — available only on internal network for security.
- Typical port: 5432 (internal)

Service: caddy (reverse proxy)
- Purpose: Edge router that provides TLS termination, static file serving, HTTP->HTTPS redirects, and reverse-proxying to backend.
- Responsibilities:
  - Route requests to frontend or backend by path or hostname.
  - Automate TLS via ACME (Let's Encrypt) or use mounted certificates (production).
  - Provide centralized access and rate limiting, basic logging, and header manipulation.
- Typical exposed ports: 80 (HTTP), 443 (HTTPS)

---

## 4. How services communicate with each other

- Client (browser) <-> Caddy: all inbound HTTP/HTTPS traffic terminates at Caddy. Caddy enforces TLS and routing rules.
- Caddy -> Frontend: either serves static files (direct filesystem) or proxies to a frontend server container. Example: requests for `GET /` and `GET /static/*`.
- Caddy -> Backend: proxies API requests to the backend container (e.g., any route matching `/api/*` or a subdomain).
- Backend -> Database: backend connects to the database using private network hostnames and credentials (no public exposure).
- Optional internal services (e.g., job workers, admin containers) connect to the backend or database via the same Docker network.

Communication details:
- All inter-service traffic takes place over the Docker Compose defined network (bridge/overlay).
- Caddy uses service names (as DNS) to reach containers (e.g., `http://backend:8000`).
- Services authenticate and authorize at the application layer (JWT/OAuth/session tokens); transport security within the internal network is optional as traffic remains internal — but mutual TLS or service mesh can be added for stricter security.

---

## 5. Networking and ports explanation

Public-facing:
- 80/tcp (HTTP) — Caddy listens and redirects to HTTPS (production)
- 443/tcp (HTTPS) — Caddy listens for TLS traffic

Internal Docker network:
- backend:8000 — uvicorn/gunicorn serving FastAPI (NOT exposed publicly)
- db:5432 — PostgreSQL (NOT exposed publicly)
- frontend (if served by an app server): 3000 or 80 internally; otherwise static files served by Caddy directly.

Docker-compose networking:
- Compose creates an isolated network (default) where services can reference each other by service name. Example DNS:
  - `http://backend:8000`
  - `postgres://db:5432/dbname`

Port mapping example in docker-compose.yml:
- caddy: "80:80", "443:443"
- backend: no published ports (if strictly internal) or "8000:8000" for dev convenience
- db: no published ports (for local dev you might publish 5432:5432)

Production recommendation:
- Only Caddy should have public ports mapped. Backend and DB should remain internal.

---

## 6. Environment variables concept

Environment variables are used to configure services at runtime without changing code. They are critical for 12-factor apps and support differing environments (development, staging, production).

Common variables example:
- Backend:
  - DATABASE_URL=postgresql://USER:PASSWORD@db:5432/DBNAME
  - SECRET_KEY=... (used by auth/session signing)
  - ENVIRONMENT=production|staging|development
  - LOG_LEVEL=info|debug
  - CORS_ORIGINS=https://example.com,https://api.example.com
- Database:
  - POSTGRES_USER
  - POSTGRES_PASSWORD
  - POSTGRES_DB
- Caddy:
  - ACME_AGREE (or mount certificates) or use environment variables to set admin credentials if needed
- Frontend (build-time or runtime):
  - VITE_API_URL or REACT_APP_API_URL to point to proxied API origin (e.g., https://example.com/api)

Best practices:
- Store secrets in a secure secrets manager (Vault, AWS Secrets Manager, Docker secrets, or environment-specific secure stores).
- Do NOT commit .env files with secrets to source control.
- Provide a `.env.example` with only variable names and example placeholders for onboarding.
- When using Docker Compose, use the env_file option or pass variables via CI/CD pipelines.

Example `.env.example` snippet:
```env
# Backend
DATABASE_URL=postgresql://postgres:changeme@db:5432/secreto
SECRET_KEY=replace_with_a_secure_random_value
ENVIRONMENT=development
LOG_LEVEL=debug

# Caddy
CADDY_EMAIL=admin@example.com

# Frontend build
FRONTEND_API_BASE_URL=https://localhost/api
```

---

## 7. How to run the project using Docker Compose

Prerequisites:
- Docker (>=20.10)
- Docker Compose (v2 recommended) or Docker Desktop
- (Optional) Git for cloning repo

1. Clone repository:
```bash
git clone https://github.com/AlhassanHussein/secrecto_web_live.git
cd secreto_web_live
```

2. Copy `.env.example` to `.env` and fill secrets:
```bash
cp .env.example .env
# edit .env and fill values (DATABASE_URL, SECRET_KEY, CADDY_EMAIL, etc.)
```

3. Build and start containers (development):
```bash
docker compose up --build
# or in detached mode:
docker compose up -d --build
```

4. Run migrations (backend):
- If migrations are run automatically by the backend container on startup, nothing further is needed.
- Otherwise run a one-off migrations command:
```bash
docker compose run --rm backend alembic upgrade head
# or
docker compose exec backend alembic upgrade head
```

5. View logs:
```bash
docker compose logs -f caddy backend frontend db
```

6. Stop and remove containers:
```bash
docker compose down --volumes --remove-orphans
```

Production notes:
- Use the `--env-file` flag to point to secure env files in CI/CD.
- Consider using `docker compose -f docker-compose.prod.yml` with production settings (no bind mounts, proper volumes, enforced secrets).
- Use a process manager (systemd, docker swarm, k8s) for high availability.

---

## 8. Request flow: user → proxy → frontend/backend → database

Step-by-step flow for a typical request:

1. User (browser) navigates to https://example.com.
2. DNS resolves to the public IP of the host where Caddy is running.
3. Browser sends HTTPS request to port 443.
4. Caddy (reverse proxy) receives the request:
   - If the path corresponds to static assets (e.g., /, /index.html, /static/*), Caddy serves the built frontend files from its mounted `public/` or `frontend/dist/` folder.
   - If the path matches the API route pattern (e.g., /api/*), Caddy proxies the request to the backend service (e.g., `http://backend:8000`).
5. Backend (FastAPI) receives proxied request from Caddy:
   - Validates request and authentication (JWT, cookies, etc).
   - Performs business logic and interacts with the database.
6. Backend executes queries against PostgreSQL via a DB client/ORM (SQLAlchemy).
7. PostgreSQL performs the queries and returns results to the backend.
8. Backend constructs an HTTP response and returns it to Caddy.
9. Caddy forwards the response back to the browser over TLS.
10. Browser receives and renders the response (for API calls the frontend updates UI accordingly).

Error handling and retries:
- Caddy can be configured for health checks and upstream retries.
- Backend should return appropriate HTTP error codes and JSON error payloads for predictable client handling.

---

## 9. Folder structure overview

Below is a recommended canonical layout for clarity. The actual repo may differ slightly, but this shows the intended responsibilities of each folder.

```
/
├─ .env.example                # example environment variables (do not commit secrets)
├─ docker-compose.yml          # primary compose file for development
├─ docker-compose.prod.yml     # optional production compose with different volumes, secrets, replicas
├─ Caddyfile                   # Caddy configuration file (or caddy/Caddyfile)
├─ README.md                   # this file
├─ infra/                      # infra helpers (Dockerfiles, k8s manifests, ingress templates)
│  ├─ Dockerfile.frontend
│  ├─ Dockerfile.backend
│  └─ healthchecks/
├─ frontend/                   # frontend source code (SPA)
│  ├─ package.json
│  ├─ src/
│  └─ public/ or dist/         # build artifacts (generated)
├─ backend/                    # FastAPI application code
│  ├─ app/
│  │  ├─ main.py               # ASGI entrypoint
│  │  ├─ api/                  # routers and endpoints
│  │  ├─ core/                 # settings, security, logging
│  │  ├─ models/               # ORM models
│  │  ├─ db/                   # database session, migrations
│  │  └─ tests/
│  ├─ requirements.txt
│  └─ alembic/                 # migrations if using Alembic
├─ caddy/                      # caddy config, TLS assets, optional templates
│  └─ Caddyfile
└─ scripts/                    # helpers: build, migrate, backup, restore
```

Key notes:
- Keep build artifacts out of the repository (use .gitignore).
- Dockerfiles live in infra/ or at project root; docker-compose references them.
- Keep migrations and schema evolution in a dedicated folder (alembic/).
- Include CI/CD config in `.github/workflows/` for automated builds, tests and deployment.

---

## 10. Notes for AI agents (how the system is organized)

This section is explicitly for an AI agent analyzing the repository and producing code changes, diagnostics, or suggestions.

- Top-level responsibilities:
  - `frontend/`: UI code. Build process produces static assets consumed by `caddy` or served by a lightweight static server.
  - `backend/`: FastAPI application. This is the authoritative place for domain logic. Look for `app/main.py`, `app/api`, and `app/core/settings.py` for runtime configuration.
  - `db` service: Database configuration is typically controlled via `DATABASE_URL` in env vars. Connection pooling and migrations usually live inside `backend/db` or `backend/alembic`.
  - `caddy`: Routing and TLS. The `Caddyfile` contains essential routing rules. For changes to public routes, edit the `Caddyfile`.
  - `docker-compose.yml`: Coordinates service definitions and volumes. This file is critical for reproduction and local testing.
  - `infra/Dockerfile.*`: Build rules for each container. Use these to change base images, add dependencies, or tune startup commands.

- Where to look first for common tasks:
  - Run the app locally: `docker compose up --build`
  - Add an API endpoint: modify `backend/app/api/routers` and update `backend/app/main.py`
  - Database migrations: update models in `backend/app/models`, then create a migration in `backend/alembic/versions` and run Alembic.
  - Caddy routing: edit `caddy/Caddyfile`. For API routing, ensure `reverse_proxy /api/* backend:8000` exists.
  - Environment variables: search for `os.getenv`, Pydantic `BaseSettings` classes or a `settings.py` within `backend` to identify required variables.

- Useful heuristics for an AI:
  - Service names in docker-compose are reliable DNS names inside the Docker network.
  - Prefer reading `backend/app/core/settings.py` (or equivalent) to infer required runtime environment variables and defaults.
  - Look for `uvicorn` or `gunicorn` command in Dockerfile/CMD to find the app's exposed port.
  - If a `Caddyfile` is present, follow it for production routing semantics and to determine which routes map to which services.
  - Database connection strings are often in `DATABASE_URL` — search for env var references to confirm variable names.

- Typical endpoints and patterns to expect:
  - `/health` or `/healthz` health-check endpoints
  - `/api/v1/*` versioned API namespace
  - `/static/*` serving SPA assets
  - Authentication endpoints: `/auth/login`, `/auth/register`, JWT token issuance endpoints

- Security & devops tips for automation agents:
  - Do not introduce secrets into checked-in files. Use placeholders and instruct maintainers to use secret managers.
  - When proposing changes that affect ports, services, or TLS, update the `Caddyfile` and `docker-compose` in lockstep.
  - For database schema changes, generate and include migration files and add a migration step to CI/CD.
  - Provide health checks and liveness/readiness metadata for each service to ease orchestration.

---

## Appendices

A. Example minimal Caddyfile
```text
# caddy/Caddyfile
example.com {
  encode gzip zstd
  root * /srv/frontend
  file_server

  # Proxy API requests to backend
  handle /api/* {
    reverse_proxy backend:8000
  }

  # Redirect HTTP -> HTTPS handled by Caddy automatically
}
```

B. Example docker-compose (conceptual snippet)
```yaml
version: "3.8"
services:
  caddy:
    image: caddy:2
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./caddy/Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - ./frontend/dist:/srv/frontend:ro
    networks:
      - secreto_net

  backend:
    build:
      context: ./backend
      dockerfile: ../infra/Dockerfile.backend
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - SECRET_KEY=${SECRET_KEY}
    depends_on:
      - db
    networks:
      - secreto_net

  db:
    image: postgres:14
    environment:
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=${POSTGRES_DB}
    volumes:
      - db_data:/var/lib/postgresql/data
    networks:
      - secreto_net

volumes:
  caddy_data:
  db_data:

networks:
  secreto_net:
    driver: bridge
```

C. Operational checklist
- Ensure `.env` is configured and secrets are available for production.
- Run DB backups regularly and test restores.
- Set up monitoring/log aggregation (Prometheus, Loki, Grafana).
- Use CI to run tests, build images, run migrations and push images to a registry.
- Rotate keys and certs and use a secret manager for production secrets.

---

```
