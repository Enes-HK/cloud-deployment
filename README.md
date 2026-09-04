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

- **Build-time vs run-time configuration** — `VITE_API_URL` gets
  baked into the frontend at build time, so the browser-facing
  image must be rebuilt per environment. DB credentials, by
  contrast, stay out of the image and arrive at runtime via
  `env_file`.
- **Containers are their own environment** — no venv needed inside
  the image; services resolve each other by Compose service name
  (`db`), not `localhost`, because the process's idea of localhost
  is the container itself.
- **Image provenance matters** — I caught a real mis-tagged image
  (the backend was silently shipping an nginx build) by checking
  container logs, and rebuilt it from the correct Dockerfile.
- **Startup ordering & readiness** — healthchecks plus
  `depends_on: condition: service_healthy` so the backend waits for
  Postgres to actually accept connections.
- **Dockerfile fundamentals** — layer caching by copying
  dependency manifests before source, `CMD` vs `ENTRYPOINT`,
  `EXPOSE` vs published ports, non-root runtime user.

## Architecture
Browser -> Frontend (nginx, port 80) -> Backend (uvicorn, port 8000) -> PostgreSQL (port 5432)

## Status
Dockerfiles and compose complete. 
App deployed and working on EC2 (t3.micro).

## Run locally

You'll need Docker Desktop (with WSL 2 on Windows). First create the
folder structure the compose file expects and drop in the `.env`:

```bash
mkdir -p backend
```
Then create backend/.env with:
```
POSTGRES_HOST=db
POSTGRES_PORT=5432
POSTGRES_DB=todos
POSTGRES_USER=postgres
POSTGRES_PASSWORD=root
```
Note the host is db, not localhost — that's the Compose service name the backend uses to reach the database over the Docker network. The compose file points env_file at ./backend/.env, so the file has to live there.

Start the stack:
```
docker compose -f docker-compose-local.yml up -d --build
```
Frontend: http://localhost:80
Backend API docs: http://localhost:8000/docs
To tear it down:
```
docker compose -f docker-compose-local.yml down
```
Deploying to EC2
For deployment the services reference pre-built images from Docker Hub instead of building locally. The one thing to remember is that VITE_API_URL is baked into the frontend at build time, so before deploying you have to rebuild the frontend image pointing at your server's public IP:
```
# from the frontend/ directory
docker build --build-arg VITE_API_URL=http://<EC2-PUBLIC-IP>:8000 \
  -t <your-user>/todo-frontend:vN .
docker push <your-user>/todo-frontend:vN
```
Then point docker-compose.yml at that new tag.

On the instance, create the same backend/.env folder layout — the compose file's env_file points at ./backend/.env, so the file sits in a backend/ subfolder. Copy over the compose file and the .env, then run:

```bash
mkdir -p backend
# place backend/.env here (POSTGRES_HOST=db)
docker compose up -d
```

### Credits
Adapted from Codingschule/docker-projects (project-01). All application code from the original project; deployment files written by me as a learning exercise.
