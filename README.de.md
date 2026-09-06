# 3-Tier To-Do App — Docker Deployment Project

## Einordnung

Das Projekt ist ein Containering-Labor zu einem bestehenden
3-Tier-To-Do-System aus React/Vite-Frontend (nginx), FastAPI-
Backend (uvicorn) und PostgreSQL. Die Anwendungslogik stammt aus
dem Lab von Codingschule/docker-projects, mein Beitrag ist
ausschließlich die Deployment-Schicht.

## Ziel

Ziel ist die Containerisierung und das Deployment des Stacks,
lokal per Docker-Compose und produktiv auf einer AWS-EC2-Instanz
(t3.micro).

## Umsetzung

- **Backend-Image**: `python:3.12-slim`, Dependency-Installation
  vor dem Quellcode (Layer-Caching), nicht-root-Runtimeprozess
- **Frontend-Image**: Multi-Stage-Build, bei dem die Node-Stufe
  statische Assets kompiliert und die nginx-Stufe ausschließlich
  `dist/` ausliefert
- **Compose-Setup**: Die Datenbank liegt hinter einem Named Volume
  mit Healthcheck, das Backend startet erst nach
  `condition: service_healthy` und Secrets laufen ausschließlich
  über `env_file`
- **Deployment**: Images werden mit Versions-Tags nach Docker Hub
  veröffentlicht, der Stack auf EC2 wird aus vorgebauten Images
  bezogen

## Zentrale Erkenntnisse

1. **Build- vs. Laufzeitkonfiguration**: `VITE_API_URL` wird beim
   Build in das Frontend kompiliert und muss je Umgebung neu
   gebaut werden, Datenbankzugangsdaten gelangen dagegen erst zur
   Laufzeit in den Container
2. **Netzwerk-Sicht im Container**: `localhost` bezeichnet den
   Container selbst, Dienste erreichen sich über den Compose-
   Servicenamen (`db`) statt über die Host-IP
3. **Image-Validierung**: Ein fehlerhaft getagtes Image, das als
   Backend fälschlich nginx enthielt, wurde über Container-Logs
   identifiziert und neu aufgebaut
4. **Startreihenfolge**: Healthchecks in Verbindung mit
   `depends_on` gewährleisten Readiness statt bloßem Start

## Verzeichnisstruktur


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
```
## Bezug

Original-Anleitung: `devops/README.md` oder `README.de.md`.
Quellcode: Codingschule/docker-projects (project-01).