
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from models import Base, Users
from database import engine, SessionLocal
from routers import auth, todos, admin, users
from passlib.context import CryptContext

bcrypt_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Check and create admin user
    db = SessionLocal()
    admin_user = db.query(Users).filter(Users.username == 'admin').first()
    if not admin_user:
        admin_model = Users(
            email='admin@todos.local',
            username='admin',
            first_name='System',
            last_name='Admin',
            hashed_password=bcrypt_context.hash('admin123'),
            role='admin',
            is_active=True
        )
        db.add(admin_model)
        db.commit()
    db.close()
    yield

app = FastAPI(lifespan=lifespan)
static_dir = Path(__file__).parent / "static"

Base.metadata.create_all(bind=engine)

if static_dir.exists():
    app.mount("/static", StaticFiles(directory=static_dir), name="static")


@app.get("/")
def root():
    return RedirectResponse(url="/app", status_code=302)

@app.get("/app", include_in_schema=False)
def frontend():
    response = FileResponse(static_dir / "index.html")
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

@app.get("/health")
def health_check():
    return {"status": "Healthy"}

app.include_router(auth.router)
app.include_router(todos.router)
app.include_router(admin.router)
app.include_router(users.router)

