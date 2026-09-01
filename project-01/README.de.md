# 3-Tier To-Do App: Geführtes DevOps-Projekt

Ein praxisnahes Lab zum Erlernen von Docker, Docker Compose, Docker Hub und AWS-EC2-Deployment, anhand einer kleinen Full-Stack-To-Do-App.

Die Anwendung existiert bereits unter [3-tier-app](3-tier-app). Eure Aufgabe in diesem Projekt ist nicht das Schreiben von Anwendungscode, sondern das Containerisieren, Komponieren und Deployen dessen, was bereits vorhanden ist.

## Architektur

```
                 ┌─────────────┐        ┌─────────────┐        ┌──────────────┐
   Browser  ───▶ │   Frontend  │ ───▶   │   Backend   │ ───▶   │  PostgreSQL  │
                 │  React+Vite │        │   FastAPI   │        │  Datenbank   │
                 │  (nginx)    │        │  (uvicorn)  │        │              │
                 └─────────────┘        └─────────────┘        └──────────────┘
                   Port 80/8080           Port 8000               Port 5432
```

Das Frontend leitet API-Aufrufe nicht über nginx weiter, sondern ruft das Backend direkt aus dem Browser auf, unter Verwendung des Werts `VITE_API_URL`, der beim Build des Frontends gesetzt wurde. Das ist wichtig, in Schritt 6 kommt es darauf an.

## Lernziele

Am Ende dieses Projekts könnt ihr:

- Einen zustandsbehafteten Container mit den richtigen Umgebungsvariablen und dem richtigen Port-Mapping starten
- Ein produktionsreifes Dockerfile für eine Python-API und für einen statischen React-Build schreiben
- Eine Multi-Service-Anwendung mit Docker Compose komponieren
- Images auf Docker Hub veröffentlichen
- Eine EC2-Instanz bereitstellen und einen containerisierten Stack darauf betreiben
- Den Unterschied zwischen Build-Zeit- und Laufzeit-Konfiguration verstehen und anwenden

## Voraussetzungen

- Docker und Docker Compose lokal installiert
- Ein kostenloser Docker Hub Account
- Ein KodeKloud Account mit Zugriff auf den AWS Playground
- Grundlegende Kenntnisse in Kommandozeile und git
- Ein SSH-Client

## Struktur des Repositories

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

Ihr fügt dieser Struktur drei neue Dateien hinzu: `backend/Dockerfile`, `frontend/Dockerfile` und `docker-compose.yml` im Wurzelverzeichnis von `3-tier-app/`.

---

## Schritt 1: PostgreSQL als eigenständigen Container starten

Bevor ihr die App anfasst, macht euch mit dem Starten eines zustandsbehafteten Containers vertraut.

**Aufgabe:** Startet einen Container aus dem offiziellen `postgres` Image, der folgende Anforderungen erfüllt:

- Containername: `todo-db`
- Veröffentlicht auf Host-Port `5432`
- Umgebungsvariablen:
  - `POSTGRES_USER=postgres`
  - `POSTGRES_PASSWORD=root`
  - `POSTGRES_DB=todos`
- Läuft im Hintergrund und bleibt aktiv, nachdem euer Terminal zurückkehrt

<details>
<summary>Hinweis</summary>

Ihr braucht `-d` für den detached Modus, `-p` zum Veröffentlichen eines Ports, `--name` zum Benennen des Containers und pro Umgebungsvariable ein `-e` Flag.

</details>

**So überprüft ihr, ob es funktioniert hat:**

- `docker ps` zeigt `todo-db` als laufend an
- `docker logs todo-db` zeigt, dass die Datenbank fertig gestartet ist
- Ihr könnt euch mit `docker exec -it todo-db psql -U postgres -d todos` verbinden

Stoppt und entfernt diesen Container, sobald ihr bestätigt habt, dass er funktioniert. Die Datenbank wird in Schritt 3 sauber innerhalb von Docker Compose definiert.

---

## Schritt 2: Ein Dockerfile für Backend und Frontend schreiben

### 2a. Backend-Dockerfile

Erstellt `backend/Dockerfile`. Das Backend ist eine FastAPI-App, die von uvicorn ausgeliefert wird, die Abhängigkeiten stehen in `requirements.txt`.

**Checkliste für ein gutes Backend-Image:**

- Startet von einem schlanken, versionsfixierten Python-Base-Image (vermeidet `latest`)
- Kopiert zuerst `requirements.txt` und installiert die Abhängigkeiten, bevor der restliche Quellcode kopiert wird, damit die Dependency-Layer gecacht bleiben und nicht bei jeder Codeänderung neu gebaut werden
- Kopiert nur das, was die App wirklich braucht, fügt eine `.dockerignore` hinzu, damit `__pycache__`, `.venv`, `.env` und `.idea` niemals im Image landen
- Lasst den Prozess unter einem non-root User laufen
- Exponiert Port `8000`
- Startet die App mit `uvicorn main:app --host 0.0.0.0 --port 8000` (kein `--reload` in einem Produktions-Image)

<details>
<summary>Hinweis</summary>

Vorschlag für das Base-Image: `python:3.12-slim`. Denkt an `--host 0.0.0.0`, ohne dieses Flag hört uvicorn nur auf localhost innerhalb des Containers und ist von außerhalb des Containers nicht erreichbar.

</details>

### 2b. Frontend-Dockerfile

Erstellt `frontend/Dockerfile`. Dieses ist etwas anspruchsvoller, da Vite statische Dateien erzeugt, die keinen Node.js-Server benötigen, sondern einen Webserver. Eine `nginx.conf` liegt bereits bereit.

**Checkliste für ein gutes Frontend-Image:**

- Verwendet einen Multi-Stage-Build: eine `node` Stage, die `npm ci` und `npm run build` ausführt, und eine separate `nginx` Stage, die nur den gebauten `dist/` Ordner und eure `nginx.conf` enthält
- Das finale Image sollte weder Node.js noch npm noch `node_modules` enthalten, nur nginx und statische Dateien
- Exponiert Port `80`
- Deklariert `VITE_API_URL` als Build-Argument (`ARG`) in der Node-Stage und übergebt den Wert in die Umgebung, bevor `npm run build` läuft, denn Vite liest `import.meta.env.VITE_API_URL` und bäckt den Wert zur Build-Zeit fest in den kompilierten JavaScript-Code ein. Nach dem Bauen des Images lässt sich dieser Wert nicht mehr ändern.

<details>
<summary>Hinweis</summary>

`ARG VITE_API_URL`, gefolgt von `ENV VITE_API_URL=$VITE_API_URL` in der Build-Stage, vor `RUN npm run build`. Den tatsächlichen Wert übergebt ihr beim Bauen des Images mit `--build-arg`.

</details>

<details>
<summary>Warum das wichtig ist</summary>

Das ist der häufigste Fehler in diesem Projekt. Ein Frontend-Image, das mit `VITE_API_URL=http://localhost:8000` gebaut wurde, funktioniert auf dem eigenen Laptop einwandfrei und schlägt nach dem Deployment auf EC2 vollständig fehl, weil der Browser weiterhin versucht, `localhost:8000` zu erreichen, was auf dem Rechner der Besucher nicht existiert. Denkt in Schritt 6 daran, ihr müsst das Frontend-Image mit der IP-Adresse der EC2-Instanz neu bauen, damit es dort funktioniert.

</details>

---

## Schritt 3: Eine Docker Compose Datei für den gesamten Stack schreiben

Erstellt `docker-compose.yml` im Wurzelverzeichnis von `3-tier-app/`, die Datenbank, Backend und Frontend zu einem Stack zusammenführt.

**Anforderungen:**

- Ein `db` Service mit dem `postgres` Image und denselben Umgebungsvariablen wie in Schritt 1, plus einem benannten Volume, damit die Daten einen Neustart überstehen
- Ein `backend` Service, gebaut aus `backend/Dockerfile`, verbunden mit `db`
- Ein `frontend` Service, gebaut aus `frontend/Dockerfile`, mit dem Build-Argument `VITE_API_URL` korrekt für die lokale Nutzung gesetzt
- Port-Mappings, damit Frontend und Backend von eurem Host-Rechner aus erreichbar sind

**Best Practices, die ihr anwenden solltet:**

- Keine Secrets direkt in der Compose-Datei hardcoden, packt sie in eine `.env` Datei und referenziert diese, oder nutzt `env_file:`
- Lasst `backend` warten, bis `db` wirklich bereit ist, nicht nur gestartet, mit einem Healthcheck und `depends_on: condition: service_healthy`
- Gebt dem `db` Service ein benanntes Volume (zum Beispiel `postgres_data:/var/lib/postgresql/data`), kein anonymes
- Setzt `restart: unless-stopped` bei jedem Service
- Innerhalb des Docker-Netzwerks erreicht das Backend die Datenbank über den Service-Namen `db` als Hostname, nicht über `localhost`, Container im selben Compose-Netzwerk lösen sich gegenseitig über ihren Service-Namen auf

<details>
<summary>Hinweis zur Netzwerkverbindung zwischen Backend und db</summary>

Compose erstellt ein Standardnetzwerk, in dem jeder Service über seinen Service-Namen erreichbar ist. Der `POSTGRES_HOST` eures Backends sollte `db` sein, nicht `localhost`, denn aus Sicht des Backend-Containers bezieht sich `localhost` auf sich selbst.

</details>

**Ausführen:**

```bash
cd 3-tier-app
docker compose up -d --build
docker compose ps
```

**Überprüfen:**

- Das Frontend ist im Browser über den gemappten Port erreichbar
- Hinzufügen, Abschließen und Löschen eines To-Do-Eintrags funktioniert durchgängig
- `docker compose logs backend` zeigt keine Verbindungsfehler zur Datenbank

---

## Schritt 4: Die Images auf Docker Hub veröffentlichen

Sobald eure Images korrekt bauen und laufen, veröffentlicht sie, damit sie von überall gezogen werden können, auch von eurer EC2-Instanz.

```bash
docker login

docker tag 3-tier-app-backend  <euer-dockerhub-username>/todo-backend:v1
docker tag 3-tier-app-frontend <euer-dockerhub-username>/todo-frontend:v1

docker push <euer-dockerhub-username>/todo-backend:v1
docker push <euer-dockerhub-username>/todo-frontend:v1
```

Verwendet einen echten Tag wie `v1`, anstatt euch auf `latest` zu verlassen, so bleibt später nachvollziehbar, welche Version wo läuft, und es ist eine Gewohnheit, die sich früh lohnt.

**Überprüfen:** loggt euch bei hub.docker.com ein und bestätigt, dass beide Repositories existieren und den gepushten Tag zeigen.

---

## Schritt 5: Einen AWS Playground in KodeKloud öffnen

1. Loggt euch in euren KodeKloud Account ein
2. Geht zum Bereich Playgrounds und startet einen **AWS Playground**
3. Notiert euch die temporären Zugangsdaten, die Account-ID und die AWS-Region, die auf der Playground-Seite angezeigt werden, ihr braucht sie für den Login in die AWS Console
4. Notiert euch das Zeitlimit, das auf dem Playground angezeigt wird, die Umgebung und alles darin wird nach Ablauf automatisch gelöscht

Lasst den Playground-Tab geöffnet, ihr müsst dorthin zurückkehren, um die verbleibende Zeit zu prüfen und Ressourcen zu beenden, bevor die Sitzung von selbst abläuft.

---

## Schritt 6: Eine EC2-Instanz erstellen und den Stack dort ausführen

1. Öffnet in der AWS Console (innerhalb des Playgrounds) EC2 und startet eine neue Instanz:
   - Ein aktuelles Ubuntu LTS AMI
   - `t2.micro` oder `t3.micro` (im Free Tier enthaltene Größen)
   - Erstellt oder wählt ein Key Pair und speichert die `.pem` Datei, ihr braucht sie für den SSH-Zugriff
   - Öffnet in der Security Group folgende eingehende Regeln:
     - Port `22` (SSH), Quelle: eure IP
     - Port `80` (oder der Port, auf den ihr das Frontend gemappt habt), Quelle: überall
     - Port `8000` (Backend), Quelle: überall, da der Browser das Backend direkt aufruft

2. Verbindet euch mit der Instanz:

```bash
chmod 400 euer-key.pem
ssh -i euer-key.pem ubuntu@<EC2-PUBLIC-IP>
```

3. Installiert Docker und das Compose-Plugin auf der Instanz:

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-v2
sudo usermod -aG docker $USER
```

Meldet euch ab und wieder an (oder startet eine neue SSH-Sitzung), damit die Gruppenänderung wirksam wird.

4. Aktualisiert eure `docker-compose.yml` für das Deployment. Ersetzt die `build:` Abschnitte für `backend` und `frontend` durch `image:` mit den Tags, die ihr in Schritt 4 auf Docker Hub gepusht habt, damit die Instanz fertige Images zieht, statt sie aus dem Quellcode zu bauen.

<details>
<summary>Denkt an den Build-Zeit-Punkt aus Schritt 2b</summary>

Das zuvor gepushte Frontend-Image wurde mit `VITE_API_URL` auf `localhost` gebaut. Das funktioniert nicht, wenn ein Browser eure EC2-Instanz aufruft. Baut das Frontend-Image lokal neu mit `--build-arg VITE_API_URL=http://<EC2-PUBLIC-IP>:8000`, taggt es (zum Beispiel `v2`), pusht es erneut, und referenziert diesen neuen Tag in der Compose-Datei, die ihr auf EC2 deployt.

</details>

5. Kopiert eure aktualisierte `docker-compose.yml` und `.env` auf die Instanz (`scp` funktioniert dafür), und startet dann den Stack:

```bash
scp -i euer-key.pem docker-compose.yml .env ubuntu@<EC2-PUBLIC-IP>:~/
ssh -i euer-key.pem ubuntu@<EC2-PUBLIC-IP>
docker compose up -d
docker compose ps
```

---

## Schritt 7: Die Anwendung ansehen

Öffnet einen Browser und geht zu:

```
http://<EC2-PUBLIC-IP>:<frontend-port>
```

Bestätigt, dass die App lädt und dass ihr To-Do-Einträge hinzufügen, bearbeiten, abschließen und löschen könnt. Falls die Seite lädt, aber keine Einträge erscheinen, öffnet die Entwicklerkonsole eures Browsers, ein Aufruf an `localhost` dort ist ein sicheres Zeichen dafür, dass das Frontend-Image mit der falschen `VITE_API_URL` gebaut wurde.

---

## Aufräumen

Playground-Umgebungen sind temporär, trotzdem ist es gute Praxis, sauber herunterzufahren, statt die Sitzung mitten in der Aufgabe ablaufen zu lassen:

```bash
docker compose down
```

Beendet anschließend über die AWS Console die EC2-Instanz, bevor die KodeKloud Playground-Sitzung endet.

---

## Fehlerbehebung

- **Frontend lädt, aber es erscheinen keine Daten:** prüft in der Browserkonsole, welche URL aufgerufen wird, das ist fast immer das `VITE_API_URL` Build-Zeit-Problem aus Schritt 2b
- **Backend erreicht die Datenbank nicht:** stellt sicher, dass `POSTGRES_HOST` auf den Compose-Service-Namen (`db`) gesetzt ist, nicht auf `localhost`
- **Die App ist im Browser überhaupt nicht erreichbar:** prüft die eingehenden Regeln der EC2 Security Group und kontrolliert das Port-Mapping des Containers mit `docker compose ps`
- **`docker compose up` baut neu, statt zu pullen:** stellt sicher, dass der `build:` Schlüssel bei den Services, die `image:` nutzen sollen, vollständig entfernt wurde

## Abschluss-Checkliste

- [ ] PostgreSQL-Container lief eigenständig mit dem geforderten Namen, Port und den Umgebungsvariablen
- [ ] `backend/Dockerfile` baut ein funktionierendes Image gemäß der Checkliste in Schritt 2a
- [ ] `frontend/Dockerfile` verwendet einen Multi-Stage-Build gemäß der Checkliste in Schritt 2b
- [ ] `docker-compose.yml` startet den gesamten Stack lokal mit `docker compose up`
- [ ] Beide Images sind mit einem echten Versions-Tag auf eurem Docker Hub Account veröffentlicht
- [ ] Eine EC2-Instanz läuft mit dem Stack, unter Verwendung der von Docker Hub gezogenen Images
- [ ] Die App ist über die öffentliche IP der EC2-Instanz erreichbar und voll funktionsfähig
