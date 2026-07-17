from typing import Annotated

from starlette import status
from models import Todos
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, HTTPException, Path
from database import SessionLocal
from routers.auth import get_current_user

router = APIRouter(
    prefix="/admin",
    tags=['admin']
)


def get_db():

    db = SessionLocal()
    try:
        yield db
    
    finally:
        db.close()

db_dependency = Annotated[Session, Depends(get_db)]
user_dependency = Annotated[dict, Depends(get_current_user)]

def user_is_admin(user: dict):

    return user is not None and str(user.get('role', '')).strip().lower() == 'admin'

@router.get("/todo", status_code=status.HTTP_200_OK)
async def read_all_user(user : user_dependency, db : db_dependency):

    if not user_is_admin(user):
        raise HTTPException(status_code=401, detail="Authorization Failed")
    
    return db.query(Todos).all()


@router.delete("/todo/{todo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user : user_dependency, db : db_dependency, todo_id : int = Path(gt=0)):

    if not user_is_admin(user):
        raise HTTPException(status_code=401, detail="Authorization Failed")
    
    todo_model = db.query(Todos).filter(Todos.id == todo_id).first()
    if todo_model is None:
        raise HTTPException(status_code=404, detail="Todo not found")
    
    db.query(Todos).filter(Todos.id == todo_id).delete()
    db.commit()
