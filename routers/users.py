
from typing import Annotated

from starlette import status
from models import Todos, Users
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from database import SessionLocal
from routers.auth import get_current_user
from passlib.context import CryptContext

bcrypt_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

router = APIRouter(
    prefix="/user",
    tags=['user']
)


def get_db():

    db = SessionLocal()
    try:
        yield db
    
    finally:
        db.close()


user_dependency = Annotated[dict, Depends(get_current_user)]
db_dependency = Annotated[Session, Depends(get_db)]

class UserVerification(BaseModel):
    password : str
    new_password : str = Field(min_length=8)

@router.get("/todo", status_code=status.HTTP_200_OK)
async def get_user(user : user_dependency, db : db_dependency):

    if user is None:
        raise HTTPException(status_code=401, detail="Authorization Failed")
    
    return db.query(Users).filter(Users.id == user.get('id')).first()

@router.put("/todo/password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(user : user_dependency, db : db_dependency, verification : UserVerification):

    if user is None:
        raise HTTPException(status_code=401, detail="Authorization Failed")
    
    user_model = db.query(Users).filter(Users.id == user.get('id')).first()
    if user_model is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not bcrypt_context.verify(verification.password, user_model.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect password")
    user_model.hashed_password = bcrypt_context.hash(verification.new_password)
    db.add(user_model)
    db.commit()

@router.put("/todo/phone_number", status_code=status.HTTP_204_NO_CONTENT)
async def change_phone_number(user : user_dependency, db : db_dependency, phone_number : str = Query(min_length=10, max_length=15)):

    if user is None:
        raise HTTPException(status_code=401, detail="Authorization Failed")
    
    user_model = db.query(Users).filter(Users.id == user.get('id')).first()
    if user_model is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_model.phone_number = phone_number
    db.add(user_model)
    db.commit()