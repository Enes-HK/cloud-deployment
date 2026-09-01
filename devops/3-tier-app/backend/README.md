# Backend Installation

### Requirements

- Python 3.10+

### Setup

```bash
cd backend

# Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Environment Variables

Create a `.env` file inside the `backend/` folder:

```env
DATABASE_URL=postgresql://<username>:<password>@localhost:5432/<database_name>
```

Example:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/todos
```

### Run

```bash
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`

Interactive docs:

```txt
http://localhost:8000/docs
```

### Endpoints

| Method | Path          | Description    |
| ------ | ------------- | -------------- |
| GET    | `/todos`      | List all todos |
| POST   | `/todos`      | Create a todo  |
| PATCH  | `/todos/{id}` | Update a todo  |
| DELETE | `/todos/{id}` | Delete a todo  |