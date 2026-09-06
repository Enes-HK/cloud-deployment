# 3-Tier To-Do App — Docker Deployment Project

## Introduction

This project is a containerization lab based on an existing
3-tier to-do system consisting of a React/Vite frontend (nginx),
a FastAPI backend (uvicorn) and PostgreSQL. The application logic
comes from the Codingschule/docker-projects lab, my contribution
is limited to the deployment layer.

## Objective

The goal is to containerize and deploy the stack, locally via
Docker Compose and in production on an AWS EC2 instance
(t3.micro).

## Implementation

- **Backend image**: `python:3.12-slim`, dependencies installed
  before the source code (layer caching), non-root runtime process
- **Frontend image**: multi-stage build in which the Node stage
  compiles the static assets and the nginx stage serves only
  `dist/`
- **Compose setup**: the database runs on a named volume with a
  healthcheck, the backend only starts after
  `condition: service_healthy`, and secrets are handled
  exclusively via `env_file`
- **Deployment**: images are published to Docker Hub with version
  tags, and the stack on EC2 is pulled from pre-built images

## Key findings

1. **Build-time vs. runtime configuration**: `VITE_API_URL` is
   compiled into the frontend at build time and therefore has to
   be rebuilt for each environment, whereas database credentials
   only enter the container at runtime
2. **Network perspective inside a container**: `localhost` refers
   to the container itself, so services reach each other via the
   Compose service name (`db`) instead of the host IP
3. **Image validation**: a mis-tagged image that was supposedly
   the backend but actually contained nginx was identified through
   the container logs and rebuilt
4. **Startup order**: healthchecks combined with `depends_on`
   ensure readiness rather than just start-up

## Directory structure

```text
.
├── README.md
└── devops
    ├── 3-tier-app
    │   ├── backend
    │   │   ├── Dockerfile
    │   │   ├── README.md
    │   │   ├── database.py
    │   │   ├── main.py
    │   │   ├── models.py
    │   │   ├── requirements.txt
    │   │   └── schemas.py
    │   ├── docker-compose-local.yml
    │   ├── docker-compose.yml
    │   └── frontend
    │       ├── Dockerfile
    │       ├── README.md
    │       ├── index.html
    │       ├── nginx.conf
    │       ├── package-lock.json
    │       ├── package.json
    │       ├── src
    │       │   ├── App.jsx
    │       │   └── main.jsx
    │       └── vite.config.js
    ├── README.de.md
    └── README.md
````

## References

Original guide: `devops/README.md` or `README.de.md`. Source code: Codingschule/docker-projects (project-01).