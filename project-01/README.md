# 3-Tier To-Do App: Guided DevOps Project

A hands-on lab for learning Docker, Docker Compose, Docker Hub and AWS EC2 deployment, using a small full-stack to-do app as the subject.

The application already exists under [3-tier-app](3-tier-app). Your job in this project is not to write application code, it is to containerize, compose and deploy what is already there.

## Architecture

```
                 ┌─────────────┐        ┌─────────────┐        ┌──────────────┐
   Browser  ───▶ │   Frontend  │ ───▶   │   Backend   │ ───▶   │  PostgreSQL  │
                 │  React+Vite │        │   FastAPI   │        │   Database   │
                 │  (nginx)    │        │  (uvicorn)  │        │              │
                 └─────────────┘        └─────────────┘        └──────────────┘
                   port 80/8080           port 8000               port 5432
```

The frontend does not proxy API calls through nginx, it calls the backend directly from the browser using the `VITE_API_URL` value that was set when the frontend was built. Keep that in mind, it matters in step 6.

## Learning objectives

By the end of this project you will be able to:

- Run a stateful container with the correct environment variables and port mapping
- Write a production-grade Dockerfile for a Python API and for a static React build
- Compose a multi-service application with Docker Compose
- Publish images to Docker Hub
- Provision an EC2 instance and run a containerized stack on it
- Reason about the difference between build-time and run-time configuration

## Prerequisites

- Docker and Docker Compose installed locally
- A free Docker Hub account
- A KodeKloud account with access to the AWS Playground
- Basic command line and git familiarity
- An SSH client

## Repository structure

```
3-tier-app/
├── backend/
│   ├── main.py
│   ├── models.py
│   ├── schemas.py
│   ├── database.py
│   ├── requirements.txt
│   └── .env
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── nginx.conf
    ├── package.json
    └── src/
        ├── main.jsx
        └── App.jsx
```

You will be adding three new files to this structure: `backend/Dockerfile`, `frontend/Dockerfile`, and `docker-compose.yml` at the `3-tier-app/` root.

---

## Step 1: Run PostgreSQL as a standalone container

Before touching the app, get comfortable running a stateful container by itself.

**Task:** start a container from the official `postgres` image that satisfies these requirements:

- Container name: `todo-db`
- Published on host port `5432`
- Environment variables:
  - `POSTGRES_USER=postgres`
  - `POSTGRES_PASSWORD=root`
  - `POSTGRES_DB=todos`
- Runs in the background and keeps running after your terminal returns

<details>
<summary>Hint</summary>

You need `-d` for detached mode, `-p` to publish a port, `--name` to name the container, and one `-e` flag per environment variable.

</details>

**Verify it worked:**

- `docker ps` shows `todo-db` as running
- `docker logs todo-db` shows the database finished starting up
- You can connect to it with `docker exec -it todo-db psql -U postgres -d todos`

Stop and remove this container once you have confirmed it works. You will define the database properly inside Docker Compose in step 3.

---

## Step 2: Write a Dockerfile for the backend and the frontend

### 2a. Backend Dockerfile

Create `backend/Dockerfile`. The backend is a FastAPI app served by uvicorn, dependencies are listed in `requirements.txt`.

**Checklist for a good backend image:**

- Start from a slim, pinned Python base image (avoid `latest`)
- Copy `requirements.txt` first and install dependencies before copying the rest of the source, so dependency layers are cached and do not get rebuilt on every code change
- Copy only what the app needs, add a `.dockerignore` so `__pycache__`, `.venv`, `.env` and `.idea` never end up in the image
- Run the process as a non-root user
- Expose port `8000`
- Start the app with `uvicorn main:app --host 0.0.0.0 --port 8000` (no `--reload` in a production image)

<details>
<summary>Hint</summary>

Base image suggestion: `python:3.12-slim`. Remember `--host 0.0.0.0`, without it uvicorn only listens on localhost inside the container and nothing outside the container can reach it.

</details>

### 2b. Frontend Dockerfile

Create `frontend/Dockerfile`. This one is trickier because Vite produces static files, they don't need Node.js to be served, they need a web server. An `nginx.conf` is already provided for you.

**Checklist for a good frontend image:**

- Use a multi-stage build: a `node` stage that runs `npm ci` and `npm run build`, then a separate `nginx` stage that only contains the built `dist/` output and your `nginx.conf`
- The final image should not contain Node.js, npm, or `node_modules` at all, only nginx and static files
- Expose port `80`
- Declare `VITE_API_URL` as a build argument (`ARG`) in the Node stage, and pass it into the environment before running `npm run build`, since Vite reads `import.meta.env.VITE_API_URL` and bakes its value into the compiled JavaScript at build time. There is no way to change it after the image is built.

<details>
<summary>Hint</summary>

`ARG VITE_API_URL` followed by `ENV VITE_API_URL=$VITE_API_URL` in the build stage, before `RUN npm run build`. You will pass the actual value with `--build-arg` when you build the image.

</details>

<details>
<summary>Why this matters</summary>

This is the single most common mistake students make in this project. A frontend image built with `VITE_API_URL=http://localhost:8000` will work fine on your laptop and then fail completely once deployed to EC2, because the browser will still try to reach `localhost:8000`, which does not exist on the visitor's machine. Keep this in mind for step 6, you will need to rebuild the frontend image with the EC2 instance's IP address before it will work there.

</details>

---

## Step 3: Write a Docker Compose file for the full stack

Create `docker-compose.yml` at the root of `3-tier-app/`, combining the database, backend and frontend into one stack.

**Requirements:**

- A `db` service using the `postgres` image with the same environment variables as step 1, plus a named volume so data survives a restart
- A `backend` service built from `backend/Dockerfile`, connected to `db`
- A `frontend` service built from `frontend/Dockerfile`, with the `VITE_API_URL` build argument set correctly for local use
- Port mappings so you can reach the frontend and backend from your host machine

**Best practices to apply:**

- Do not hardcode secrets directly in the compose file, put them in an `.env` file and reference it, or use `env_file:`
- Make `backend` wait for `db` to be ready, not just started, with a healthcheck and `depends_on: condition: service_healthy`
- Give the `db` service a named volume (for example `postgres_data:/var/lib/postgresql/data`), not an anonymous one
- Set `restart: unless-stopped` on each service
- Inside the Docker network, the backend reaches the database using the service name `db` as the hostname, not `localhost`, containers on the same compose network resolve each other by service name

<details>
<summary>Hint on backend to db networking</summary>

Compose creates a default network where each service is reachable by its service name. Your backend's `POSTGRES_HOST` should be `db`, not `localhost`, since from the backend container's point of view, `localhost` refers to itself.

</details>

**Run it:**

```bash
cd 3-tier-app
docker compose up -d --build
docker compose ps
```

**Verify:**

- Frontend is reachable in a browser on the port you mapped
- Adding, completing and deleting a to-do item works end to end
- `docker compose logs backend` shows no connection errors to the database

---

## Step 4: Push the images to Docker Hub

Once your images build and run correctly, publish them so they can be pulled from anywhere, including your EC2 instance.

```bash
docker login

docker tag 3-tier-app-backend  <your-dockerhub-username>/todo-backend:v1
docker tag 3-tier-app-frontend <your-dockerhub-username>/todo-frontend:v1

docker push <your-dockerhub-username>/todo-backend:v1
docker push <your-dockerhub-username>/todo-frontend:v1
```

Use a real tag such as `v1` instead of relying on `latest`, it makes it obvious later which version is running where, and it is a habit worth building early.

**Verify:** log into hub.docker.com and confirm both repositories exist and show the tag you pushed.

---

## Step 5: Open an AWS Playground in KodeKloud

1. Log into your KodeKloud account
2. Go to the Playgrounds section and start an **AWS Playground**
3. Note the temporary credentials, account ID and the AWS region shown on the playground page, you will use these to log into the AWS Console
4. Note the time limit shown on the playground, the environment and everything in it is destroyed once it expires

Keep the playground tab open, you will need to return to it to check remaining time and to terminate resources before it expires on its own.

---

## Step 6: Create an EC2 instance and run the stack there

1. In the AWS Console (inside the playground), open EC2 and launch a new instance:
   - A recent Ubuntu LTS AMI
   - `t2.micro` or `t3.micro` (free tier eligible sizes)
   - Create or select a key pair and save the `.pem` file, you need it to SSH in
   - In the security group, open inbound rules for:
     - port `22` (SSH), source: your IP
     - port `80` (or whichever port you mapped the frontend to), source: anywhere
     - port `8000` (backend), source: anywhere, since the browser calls the backend directly

2. Connect to the instance:

```bash
chmod 400 your-key.pem
ssh -i your-key.pem ubuntu@<EC2-PUBLIC-IP>
```

3. Install Docker and the Compose plugin on the instance:

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-v2
sudo usermod -aG docker $USER
```

Log out and back in (or start a new SSH session) for the group change to take effect.

4. Update your `docker-compose.yml` for deployment. Replace the `build:` sections for `backend` and `frontend` with `image:` pointing at the tags you pushed to Docker Hub in step 4, so the instance pulls prebuilt images instead of building from source.

<details>
<summary>Remember the build-time gotcha from step 2b</summary>

The frontend image you pushed earlier was built with `VITE_API_URL` pointing at `localhost`. That will not work from a browser hitting your EC2 instance. Rebuild the frontend image locally with `--build-arg VITE_API_URL=http://<EC2-PUBLIC-IP>:8000`, tag it (for example `v2`), push it again, then reference that new tag in the compose file you deploy on EC2.

</details>

5. Copy your updated `docker-compose.yml` and `.env` to the instance (`scp` works fine), then start the stack:

```bash
scp -i your-key.pem docker-compose.yml .env ubuntu@<EC2-PUBLIC-IP>:~/
ssh -i your-key.pem ubuntu@<EC2-PUBLIC-IP>
docker compose up -d
docker compose ps
```

---

## Step 7: View the application

Open a browser and go to:

```
http://<EC2-PUBLIC-IP>:<frontend-port>
```

Confirm the app loads, and that you can add, edit, complete and delete to-do items. If the page loads but items never appear, open your browser's developer console, a `localhost` API call there is a sure sign the frontend image was built with the wrong `VITE_API_URL`.

---

## Cleanup

Playground environments are temporary, but it is good practice to shut down cleanly rather than let it expire mid-task:

```bash
docker compose down
```

Then, from the AWS Console, terminate the EC2 instance before the KodeKloud playground session ends.

---

## Troubleshooting

- **Frontend loads but no data appears:** check the browser console for the URL being called, this is almost always the `VITE_API_URL` build-time issue described in step 2b
- **Backend can't reach the database:** confirm `POSTGRES_HOST` is set to the compose service name (`db`), not `localhost`
- **Can't reach the app from your browser at all:** check the EC2 security group inbound rules, and confirm the container's port mapping with `docker compose ps`
- **`docker compose up` rebuilds instead of pulling:** make sure the `build:` key was fully removed for services where you meant to use `image:` instead

## Completion checklist

- [ ] PostgreSQL container ran standalone with the required name, port and environment variables
- [ ] `backend/Dockerfile` builds a working image following the checklist in step 2a
- [ ] `frontend/Dockerfile` uses a multi-stage build following the checklist in step 2b
- [ ] `docker-compose.yml` runs the full stack locally with `docker compose up`
- [ ] Both images are pushed to your Docker Hub account with a real version tag
- [ ] An EC2 instance is running the stack using images pulled from Docker Hub
- [ ] The app is reachable and fully functional from the EC2 instance's public IP
