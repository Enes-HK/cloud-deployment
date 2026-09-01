# 3-Tier To-Do App — Docker Deployment Project

A guided DevOps lab: containerizing, composing, and deploying a
pre-existing full-stack to-do app (React + Vite frontend, FastAPI
backend, PostgreSQL). The code of the application itself is not mine, it comes
from Codingschule's docker-projects lab. My work in this repo is
the deployment layer: the Dockerfiles, `docker-compose.yml`, and
the deployment to AWS.

## What I did here

- **Backend image** — `python:3.12-slim`, dependencies copied and
  installed before source for layer caching, `.dockerignore`
  excludes `.env`/`.venv`/`__pycache__`, runs as a non-root user.
- **Frontend image** — multi-stage build: a `node` stage runs
  `npm ci` + `npm run build`, a final `nginx` stage serves only
  the compiled `dist/` (no Node, no `node_modules` in the image).
- **Compose stack** — `db` (Postgres, named volume, healthcheck),
  `backend` (waits for healthy db via `depends_on: service_healthy`),
  `frontend` (built with the `VITE_API_URL` build arg).
- **Docker Hub** — images tagged (`v1`, ...) and pushed for reuse.
- **AWS EC2** — stack runs from pulled images on an Ubuntu instance.

## Key concepts I exercised

- Build-time vs run-time configuration: `VITE_API_URL` is baked into
  the frontend at build time; DB credentials stay out of the image
  and are injected at runtime via `env_file`.
- Containers are their own environment: no venv inside the image.
- `CMD` vs `ENTRYPOINT`, `EXPOSE` vs published ports, healthchecks
  and startup ordering.

## Architecture
Browser -> Frontend (nginx, port 80) -> Backend (uvicorn, port 8000) -> PostgreSQL (port 5432)

## Status
Dockerfiles and compose complete. Deployment docs and EC2 rollout in progress. See the original guides in README.original.md / README.de.md.

## Run locally
---to-be-added--

### Credits
Adapted from Codingschule/docker-projects (project-01). All application code from the original project; deployment files written by me as a learning exercise.
