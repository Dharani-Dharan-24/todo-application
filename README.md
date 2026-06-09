# Todos App

A FastAPI todo application with JWT authentication, role-based admin access, a small browser UI, SQLAlchemy models, Alembic migrations, and pytest tests.

## Features

- User registration and login with bearer tokens
- Password hashing with Passlib bcrypt
- User-scoped todo CRUD endpoints
- Admin endpoints for viewing and deleting todos across users
- Profile endpoints for user details, password changes, and phone number updates
- Static frontend served from `/app`
- Database migrations managed with Alembic
- Basic automated tests with pytest

## Project Structure

```text
Todos_app/
  main.py              # FastAPI app entry point
  database.py          # SQLAlchemy engine/session configuration
  models.py            # User and todo database models
  routers/
    auth.py            # Registration, login, JWT helpers
    todos.py           # Authenticated todo CRUD routes
    admin.py           # Admin-only todo routes
    users.py           # User profile routes
  static/              # Browser UI assets
  alembic/             # Migration environment and revisions
  test/                # pytest test suite
```

## Requirements

- Python 3.10+
- PostgreSQL
- Python packages:
  - `fastapi`
  - `uvicorn`
  - `sqlalchemy`
  - `psycopg2-binary`
  - `alembic`
  - `python-jose`
  - `passlib[bcrypt]`
  - `python-multipart`
  - `pytest`
  - `httpx`

## Setup

Create and activate a virtual environment:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Install dependencies:

```powershell
pip install -r requirements.txt
```

Create a PostgreSQL database named `TodoApplicationDatabase`, then update the connection string in `database.py` and `alembic.ini` if your local username, password, host, or database name is different.

Run migrations:

```powershell
alembic upgrade head
```

## Run the App

From the parent directory of `Todos_app`, start the API:

```powershell
uvicorn Todos_app.main:app --reload
```

Open the browser UI:

```text
http://127.0.0.1:8000/app
```

Interactive API docs are available at:

```text
http://127.0.0.1:8000/docs
```

## Main Endpoints

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | Health check |
| `POST` | `/auth/` | Create a user |
| `POST` | `/auth/token` | Log in and receive a JWT |
| `GET` | `/` | List current user's todos |
| `POST` | `/todo` | Create a todo |
| `GET` | `/todo/{todo_id}` | Get one todo |
| `PUT` | `/todo/{todo_id}` | Update one todo |
| `DELETE` | `/todo/{todo_id}` | Delete one todo |
| `GET` | `/admin/todo` | Admin: list all todos |
| `DELETE` | `/admin/todo/{todo_id}` | Admin: delete any todo |
| `GET` | `/user/todo` | Get current user profile |
| `PUT` | `/user/todo/password` | Change password |
| `PUT` | `/user/todo/phone_number` | Change phone number |

## Run Tests

From the parent directory of `Todos_app`:

```powershell
pytest Todos_app/test
```

## Notes

- The current app configuration stores the database URL and JWT secret directly in source files. For production or shared environments, move those values into environment variables.
- The test suite overrides database and auth dependencies where needed, so tests can run without logging in through the UI.
