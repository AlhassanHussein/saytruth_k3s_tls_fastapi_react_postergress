# FastAPI Backend — Service Documentation

Last updated: 2026-01-23

This document describes the FastAPI backend service used by Secreto Web Live. It is written for developers and AI agents to quickly understand responsibilities, structure, runtime configuration, API surface, authentication, error handling, database connection, and how the service is exposed to the Caddy reverse proxy.

---

## 1. Backend purpose and responsibility in the system

- Acts as the authoritative application server implementing business logic, validation, authentication, authorization, and persistence.
- Exposes a JSON HTTP API (and optional WebSocket endpoints) consumed by the frontend SPA.
- Runs data migrations and coordinates persistent storage operations against the relational database (PostgreSQL recommended).
- Emits application logs and metrics for observability.
- Provides health endpoints for orchestration and the reverse proxy to perform liveness/readiness checks.

Primary responsibilities:
- Validate and sanitize incoming requests.
- Enforce access control (authentication and authorization).
- Orchestrate transactions against the database.
- Return consistent JSON responses and HTTP status codes.
- Support migrations and admin operations via CLI or management endpoints.

---

## 2. Technologies used

Typical / recommended stack (the repository should contain similar packages):

- Language: Python 3.10+ (3.11 recommended)
- Web framework: FastAPI
- ASGI server: Uvicorn (or Gunicorn + Uvicorn workers)
- Data validation: Pydantic
- ORM / DB toolkit: SQLAlchemy (or equivalent)
- Migrations: Alembic
- Authentication: JWT (PyJWT or jose), OAuth2 password flow or session cookies (configurable)
- Database: PostgreSQL (14+ recommended)
- Containerization: Docker, Docker Compose
- Optional: Sentry for error monitoring, Prometheus metrics

Files to inspect for exact versions and imports:
- backend/requirements.txt or pyproject.toml
- backend/app/main.py
- backend/app/core/settings.py or backend/app/config.py

---

## 3. Project structure explanation

A canonical backend folder layout (the repository may vary slightly):

- backend/
  - Dockerfile (or referenced from /infra)
  - requirements.txt or pyproject.toml
  - alembic/
    - env.py
    - versions/ (auto-generated migration files)
  - app/
    - main.py                    # ASGI entrypoint; creates FastAPI app
    - core/
      - config.py or settings.py # BaseSettings (Pydantic) for env vars
      - security.py             # password hashing, JWT helpers
      - logging.py              # structured logging configuration
    - api/
      - deps.py                  # dependency injectors (db session, current_user, etc)
      - routers/
        - auth.py                # authentication endpoints
        - users.py               # user CRUD endpoints
        - items.py               # resource example endpoints
        - health.py              # /health or /healthz
    - db/
      - base.py                  # Base metadata and model registration
      - session.py               # create_engine & SessionLocal
    - models/                     # ORM models
      - user.py
      - item.py
    - schemas/                    # Pydantic request/response schemas
      - user.py
      - item.py
    - crud/                       # DB operations (create/get/update/delete)
      - user.py
      - item.py
    - services/                   # higher-level business services
    - tests/                      # unit & integration tests
    - utils/                      # helpers (email, background tasks)
  - scripts/
    - start.sh                    # optional container entrypoint script

Notes for AI agents:
- `main.py` wires routers, middleware, exception handlers, and startup/shutdown events.
- `core/settings.py` (or similar) uses Pydantic `BaseSettings` to define all required environment variables — search here to extract required env var names.
- `db/session.py` contains the SQLAlchemy engine and SessionLocal; follow it to see pooling/migration connection specifics.

---

## 4. How the backend connects to the database

Recommended / typical flow (inspect backend/app/db/session.py and alembic/env.py to confirm exact code):

1. Connection string provided via the environment variable `DATABASE_URL`.
   Example:
   - postgresql+psycopg2://postgres:password@db:5432/secreto

2. SQLAlchemy engine is created:
```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
```

3. Dependency injection:
- `api/deps.py` exposes a `get_db()` function that yields a DB session for each request and closes it after the request completes.

4. Migrations:
- Alembic is configured in `alembic/env.py` to use the same `DATABASE_URL` or import metadata from `app.db.base`.
- Apply migrations:
  - Locally: `alembic upgrade head` (run inside container or with environment vars set)
  - In Docker Compose startup: the deployment may execute migrations via an entrypoint script or CI/CD step.

Security note: Do not expose the DB port publicly. Backend should connect to the internal Docker network host (service name `db`).

---

## 5. Environment variables used

The backend uses environment variables for configuration. The actual file names may differ; search `BaseSettings` or `os.getenv` in the repository. Below is a recommended, comprehensive list and explanation:

- DATABASE_URL: SQLAlchemy URL for Postgres
  - Example: postgresql+psycopg2://postgres:password@db:5432/secreto
- SECRET_KEY: secret used for signing JWTs and other secrets (must be securely generated)
- ALGORITHM: JWT signing algorithm (e.g., HS256)
- ACCESS_TOKEN_EXPIRE_MINUTES: integer number of minutes an access token is valid
- REFRESH_TOKEN_EXPIRE_DAYS: integer days for refresh tokens (if used)
- ENVIRONMENT: development | staging | production
- LOG_LEVEL: debug | info | warning | error
- CORS_ORIGINS: comma-separated list or JSON array for allowed origins (e.g., https://example.com)
- SENTRY_DSN: optional, for Sentry error reporting
- PORT: HTTP port for uvicorn (defaults to 8000)
- DB_POOL_SIZE / DB_MAX_OVERFLOW: optional DB pool tuning vars

Example `.env` snippet:
```env
DATABASE_URL=postgresql+psycopg2://postgres:changeme@db:5432/secreto
SECRET_KEY=please-change-me-to-a-random-secret
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
ENVIRONMENT=development
LOG_LEVEL=debug
CORS_ORIGINS=http://localhost:3000,https://example.com
PORT=8000
```

Best practices:
- Keep secrets out of source control, use Docker secrets or a secrets manager for production.
- Provide a `.env.example` with placeholders.

---

## 6. How to run backend locally

Option A — Local Python development (recommended for iterating on code):

1. Create virtualenv and install:
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

2. Set environment variables (use `.env` or export manually):
```bash
cp .env.example .env
# edit .env
export $(cat .env | xargs)   # or use direnv / dotenv loader
```

3. Apply database migrations:
```bash
alembic upgrade head
# or from Python package:
# PYTHONPATH=. alembic upgrade head
```

4. Start the development server:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Option B — Using Docker Compose (recommended to match production):

1. Ensure Docker and Docker Compose are installed.
2. Copy `.env.example` to `.env` and fill secrets.
3. Start services:
```bash
# builds images and starts backend + db + other services defined in compose
docker compose up --build backend
# or start all services
docker compose up -d --build
```
4. To run migrations inside the container:
```bash
docker compose exec backend alembic upgrade head
# or if you have a migrations script:
docker compose run --rm backend ./scripts/migrate.sh
```

Notes:
- When running under Docker Compose, the DB hostname is `db` (the service name). The backend will use `DATABASE_URL` with host `db`.
- The backend listens on port 8000 internally. Caddy proxies to `backend:8000`. For local convenience you can map backend's port to host in docker-compose but prefer leaving it internal.

---

## 7. API architecture explanation

- Router organization:
  - Routes organized by resource and/or version: e.g., `app/api/routers/v1/...` or `app/api/routers/<resource>.py`
  - Each router mounted on an API prefix, e.g., `app.include_router(api_router, prefix="/api/v1")`.

- Schemas:
  - Pydantic models in `app/schemas/` define request and response payload shapes. Use them for automatic validation and documentation.

- Dependency injection:
  - DB sessions, current user, and other per-request dependencies are injected using FastAPI's `Depends`.

- Versioning:
  - Prefer including a version prefix: `/api/v1/...` to allow non-breaking evolution.

- Documentation:
  - OpenAPI is auto-generated by FastAPI and served at `/openapi.json`.
  - Interactive docs at `/docs` (Swagger UI) and `/redoc` (ReDoc) by default.

- Pagination, filtering, and sorting:
  - Use query parameters for list endpoints (`?limit=20&offset=0&sort=-created_at`).
  - Return metadata (total count, limit, offset) in list responses for clients and UIs.

- Background tasks:
  - Use FastAPI BackgroundTasks for non-blocking tasks (email, cache invalidation) or a worker system (Celery, RQ) for heavy jobs.

---

## 8. How authentication works (recommended pattern)

Common, production-ready pattern implemented in many FastAPI projects:

- Authentication method:
  - OAuth2 password flow with JWT tokens (stateless access tokens).
  - Short-lived access token (JWT) and optional long-lived refresh token (JWT or persistent token store).
  - Alternatively, cookie-based sessions with secure, HttpOnly cookies if you control both frontend and backend and prefer cookie security.

- Components:
  - `core/security.py` provides:
    - Password hashing functions (bcrypt/argon2)
    - JWT encode/decode helpers (using SECRET_KEY and ALGORITHM)
    - Token creation functions with expiry claims
  - `api/routers/auth.py` exposes:
    - POST /api/v1/auth/login — exchange credentials for tokens
    - POST /api/v1/auth/refresh — exchange refresh token for new access token
    - POST /api/v1/auth/logout — invalidate refresh token (if persisted)
  - `api/deps.py` provides `get_current_user` dependency that:
    - Reads Authorization header: `Authorization: Bearer <access_token>`
    - Verifies JWT signature and expiry
    - Fetches the user from DB and verifies active status
    - Raises HTTPException(401) on failure

- Typical token payload:
```json
{
  "sub": "user_id",
  "exp": 1712345678,
  "scopes": ["user"]
}
```

- Secure storage on frontend:
  - Store access token in memory or localStorage (if acceptable), prefer in-memory + refresh on page reload.
  - Use HttpOnly, Secure cookies for the refresh token when using cookie strategy.

- Example login request/response:

Request:
```json
POST /api/v1/auth/login
{
  "username": "alice",
  "password": "s3cret"
}
```

Response:
```json
200 OK
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 1800,
  "refresh_token": "m_refresh_token_if_used"
}
```

- Authorization:
  - Use route dependencies to require roles/scopes:
    - `Depends(get_current_active_user)`
    - `Depends(get_current_active_admin)` for admin-only endpoints

---

## 9. Error handling concept

- Validation errors:
  - FastAPI automatically returns 422 Unprocessable Entity where Pydantic validation fails for request bodies or query params.

- Application errors:
  - Raise FastAPI `HTTPException(status_code=..., detail=...)` for predictable errors.
  - Example: `HTTPException(status_code=403, detail="Not enough permissions")`.

- Structured error response:
  - Standardize error payloads to help clients and AI agents parse them. Example format:
```json
{
  "error": {
    "code": "invalid_credentials",
    "message": "Username or password is incorrect",
    "details": null
  }
}
```
  - Map HTTP status codes to `error.code` and `error.message`.

- Exception handlers:
  - Add custom handlers in `main.py` for common exceptions (e.g., `RequestValidationError`, `StarletteHTTPException`) to normalize responses.
  - Example:
```python
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    return JSONResponse(status_code=422, content={"error": {"code": "validation_error", "message": str(exc), "details": exc.errors()}})
```

- Logging:
  - Log exceptions with structured context and correlation IDs. Integrate with Sentry or similar for production error capture.

- Retry & timeouts:
  - Apply reasonable DB operation timeouts and handle transient errors with retries where appropriate.

---

## 10. How this service is exposed to Caddy

- Internal port: backend runs on internal port 8000 (configurable with PORT env var).
- Docker service name: `backend` (used as internal DNS name).
- Caddy routes all API requests (for example `/api/*` or `api.example.com`) to `http://backend:8000`.

Example Caddyfile snippet:
```text
example.com {
  # serve frontend static files...
  handle /api/* {
    reverse_proxy backend:8000
  }

  handle /socket/* {
    reverse_proxy backend:8000
  }
}
```

- TLS termination: Caddy handles TLS (HTTPS), forwards plain HTTP to backend. If mutual TLS or end-to-end TLS is required, configure Caddy -> backend to use HTTPS with mounted certs or mTLS settings.
- Health checks: Configure Caddy or orchestration to check `/health` or `/healthz` to monitor backend readiness.

---

## API Endpoints Reference

Notes:
- These endpoints are a canonical surface for a FastAPI backend. Confirm the actual endpoints in `app/api/routers`. Adjust prefix (`/api` or `/api/v1`) to match your project.
- All request/response examples use JSON. Content-Type: application/json.

---

### GET /health
- Method: GET
- Route path: /health or /api/v1/health
- Purpose: Liveness/readiness check used by Caddy / orchestrator
- Request body format: none
- Response format (200):
```json
{
  "status": "ok",
  "uptime_seconds": 12345,
  "db": "ok"
}
```
- Possible errors:
  - 503 Service Unavailable — if a dependent check (DB) fails:
```json
{
  "error": {
    "code": "service_unavailable",
    "message": "Database connection failed"
  }
}
```

---

### POST /api/v1/auth/login
- Method: POST
- Route path: /api/v1/auth/login
- Purpose: Authenticate a user and return access (and optionally refresh) tokens
- Request body format:
```json
{
  "username": "string",
  "password": "string"
}
```
- Response format (200):
```json
{
  "access_token": "string",
  "token_type": "bearer",
  "expires_in": 1800,
  "refresh_token": "string" # optional
}
```
- Possible errors:
  - 400 Bad Request — missing fields
  - 401 Unauthorized — invalid credentials
  - 403 Forbidden — user disabled

Example error:
```json
{
  "error": {
    "code": "invalid_credentials",
    "message": "Username or password is incorrect"
  }
}
```

---

### POST /api/v1/auth/register
- Method: POST
- Route path: /api/v1/auth/register
- Purpose: Create a new user account
- Request body format:
```json
{
  "email": "user@example.com",
  "username": "alice",
  "password": "secure-password"
}
```
- Response format (201):
```json
{
  "id": 123,
  "email": "user@example.com",
  "username": "alice",
  "created_at": "2026-01-23T12:34:56Z"
}
```
- Possible errors:
  - 400 Bad Request — validation error (weak password, invalid email)
  - 409 Conflict — email/username already exists

---

### POST /api/v1/auth/refresh
- Method: POST
- Route path: /api/v1/auth/refresh
- Purpose: Exchange a refresh token for a new access token
- Request body format:
```json
{
  "refresh_token": "string"
}
```
- Response format (200):
```json
{
  "access_token": "string",
  "token_type": "bearer",
  "expires_in": 1800
}
```
- Possible errors:
  - 401 Unauthorized — invalid/expired refresh token

---

### POST /api/v1/auth/logout
- Method: POST
- Route path: /api/v1/auth/logout
- Purpose: Revoke refresh tokens and/or clear session cookies
- Request body format: none (or optional token)
- Response format (200):
```json
{
  "detail": "Logged out"
}
```
- Possible errors:
  - 401 Unauthorized — if token missing / invalid

---

### GET /api/v1/users/me
- Method: GET
- Route path: /api/v1/users/me
- Purpose: Return current authenticated user's profile
- Request headers:
  - Authorization: Bearer <access_token>
- Request body format: none
- Response format (200):
```json
{
  "id": 123,
  "username": "alice",
  "email": "alice@example.com",
  "is_active": true,
  "roles": ["user"]
}
```
- Possible errors:
  - 401 Unauthorized — missing/invalid token
  - 403 Forbidden — user inactive

---

### GET /api/v1/users/{user_id}
- Method: GET
- Route path: /api/v1/users/{user_id}
- Purpose: Get a specific user's public profile (admin-only for full details)
- Request body format: none
- Response format (200):
```json
{
  "id": 124,
  "username": "bob",
  "email": "bob@example.com"   # omitted for anonymous callers if privacy enforced
}
```
- Possible errors:
  - 404 Not Found — user not found
  - 403 Forbidden — requesting sensitive data without permission

---

### GET /api/v1/items
- Method: GET
- Route path: /api/v1/items
- Purpose: List items (paginated)
- Query parameters:
  - limit (int, default=20)
  - offset (int, default=0)
  - q (string, optional search)
- Response format (200):
```json
{
  "items": [
    {
      "id": 1,
      "title": "Item A",
      "description": "..."
    }
  ],
  "total": 123,
  "limit": 20,
  "offset": 0
}
```
- Possible errors:
  - 400 Bad Request — invalid query params

---

### POST /api/v1/items
- Method: POST
- Route path: /api/v1/items
- Purpose: Create an item (authenticated)
- Request headers:
  - Authorization: Bearer <access_token>
- Request body format:
```json
{
  "title": "New item",
  "description": "Details",
  "private": false
}
```
- Response format (201):
```json
{
  "id": 42,
  "title": "New item",
  "description": "Details",
  "owner_id": 123,
  "created_at": "2026-01-23T..."
}
```
- Possible errors:
  - 401 Unauthorized — unauthenticated user
  - 400 Bad Request — validation error

---

### GET /api/v1/items/{id}
- Method: GET
- Route path: /api/v1/items/{id}
- Purpose: Get item details
- Response format (200):
```json
{
  "id": 42,
  "title": "New item",
  "description": "Details",
  "owner_id": 123,
  "is_private": false
}
```
- Possible errors:
  - 404 Not Found — item does not exist
  - 403 Forbidden — requesting a private item without permission

---

### PUT /api/v1/items/{id}
- Method: PUT
- Route path: /api/v1/items/{id}
- Purpose: Update an item (owner or admin)
- Request headers:
  - Authorization: Bearer <access_token>
- Request body format:
```json
{
  "title": "Updated title",
  "description": "Updated"
}
```
- Response format (200):
```json
{
  "id": 42,
  "title": "Updated title",
  "description": "Updated"
}
```
- Possible errors:
  - 401 Unauthorized
  - 403 Forbidden — not owner
  - 404 Not Found

---

### DELETE /api/v1/items/{id}
- Method: DELETE
- Route path: /api/v1/items/{id}
- Purpose: Delete an item (owner or admin)
- Request headers:
  - Authorization: Bearer <access_token>
- Response format (204 No Content): no body
- Possible errors:
  - 401 Unauthorized
  - 403 Forbidden
  - 404 Not Found

---

### GET /openapi.json
- Method: GET
- Route path: /openapi.json
- Purpose: FastAPI auto-generated OpenAPI schema of the API
- Response: JSON OpenAPI schema
- Useful for generating SDKs, API clients, and for API discovery by tools.

---

### GET /docs and GET /redoc
- Method: GET
- Route path: /docs (Swagger UI), /redoc (ReDoc)
- Purpose: Interactive API docs for development
- Access control: In production, consider disabling or protecting these endpoints.

---

### (Optional) WebSocket /ws
- Method: WebSocket
- Route path: /ws or /api/v1/ws
- Purpose: Real-time communication (notifications, live updates)
- Handshake:
  - Requests upgrade to WebSocket; may require query params or token header for auth
- Message format: application-level protocol defined by app (JSON frames)
- Possible errors:
  - 401 Unauthorized — missing/invalid token
  - 400 Bad Request — incorrect subprotocol

---

## Useful JSON schema examples

Pydantic request/response example for item creation:
```json
# Request body (CreateItem)
{
  "title": "My item",
  "description": "Description here",
  "private": false
}

# Response (Item)
{
  "id": 1,
  "title": "My item",
  "description": "Description here",
  "owner_id": 123,
  "created_at": "2026-01-23T12:00:00Z"
}
```

Standard error response schema:
```json
{
  "error": {
    "code": "string",
    "message": "human-readable message",
    "details": null | { "field": "reason" }
  }
}
```

---

## Notes for AI agents and developers (where to change things)

- To add a new endpoint:
  - Create a Pydantic schema in `app/schemas/`.
  - Add CRUD logic to `app/crud/`.
  - Add business logic to `app/services/` if appropriate.
  - Add a new router or modify an existing router in `app/api/routers/` and include it in `app/main.py`.
  - Add tests in `app/tests/`.
  - Create an Alembic migration if the change requires DB schema changes.

- To inspect required environment variables:
  - Read the Pydantic `BaseSettings` class in `app/core/config.py` or similar file.

- To change error formatting:
  - Modify or add exception handlers in `app/main.py`. Normalize output there.

- To change authentication:
  - Edit `app/core/security.py` and `app/api/routers/auth.py`. Ensure `api/deps.py` `get_current_user` and `get_current_active_user` dependencies are consistent.

- To expose new endpoints via Caddy:
  - Update Caddyfile to route `/api/*` to `backend:8000` and adjust path-based rules if you add subdomains.

---

## Appendix — Common dev commands

- Run tests:
```bash
cd backend
pytest -q
```

- Linting & formatting:
```bash
# from repo root
ruff backend --fix
black backend
isort backend
```

- Generate new alembic migration:
```bash
# from backend
alembic revision --autogenerate -m "describe change"
alembic upgrade head
```

- Run backend in Docker Compose (development):
```bash
docker compose up --build backend
```
