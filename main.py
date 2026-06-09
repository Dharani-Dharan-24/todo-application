
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from .models import Base
from .database import engine
from .routers import auth, todos, admin, users

app = FastAPI()
static_dir = Path(__file__).parent / "static"

Base.metadata.create_all(bind=engine)

if static_dir.exists():
    app.mount("/static", StaticFiles(directory=static_dir), name="static")


@app.get("/app", include_in_schema=False)
def frontend():
    return FileResponse(static_dir / "index.html")

@app.get("/health")
def health_check():
    return {"status": "Healthy"}

app.include_router(auth.router)
app.include_router(todos.router)
app.include_router(admin.router)
app.include_router(users.router)

