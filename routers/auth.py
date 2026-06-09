from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from ..models import Users
from passlib.context import CryptContext
from typing import Annotated
from sqlalchemy.orm import Session
from ..database import SessionLocal
from starlette import status
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError


router = APIRouter(
    prefix="/auth",
    tags=['auth']
)

SECRET_KEY = "4494f1d7a280f8738e36b50688dd83d97ee612e38830147840238cc4bafcd3b7"
ALGORITHM = 'HS256'

bcrypt_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
oauth2_bearer = OAuth2PasswordBearer(tokenUrl='auth/token')
VALID_ROLES = {'admin', 'user'}

class CreateUserRequest(BaseModel):

    email : str
    username : str
    first_name : str
    last_name : str
    password : str
    role : str
    phone_number : str

class Token(BaseModel):
    access_token : str
    token_type : str

def get_db():

    db = SessionLocal()
    try:
        yield db
    
    finally:
        db.close()

db_dependency = Annotated[Session, Depends(get_db)]

def normalize_role(role: str):

    normalized_role = role.strip().lower()
    if normalized_role not in VALID_ROLES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Role must be 'admin' or 'user'")
    return normalized_role

def authenticate_user(username : str, password : str, db):

    user = db.query(Users).filter(Users.username == username).first()
    if not user:
        return False
    if not bcrypt_context.verify(password, user.hashed_password):
        return False
    return user

def create_access_token(username : str, userid : int, role : str, expires_delta : timedelta):

    encode = {'sub':username, 'id':userid, 'role' : role}
    expires = datetime.now(timezone.utc) + expires_delta
    encode.update({'exp' : expires})
    return jwt.encode(encode, key=SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token : Annotated[str, Depends(oauth2_bearer)]):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get('sub')
        user_id  = payload.get('id')
        user_role  = payload.get('role')
        if username is None or user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate user")
        
        return {'username' : username, 'id' : user_id, 'role' : user_role}
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate user")


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_user(create_user_request : CreateUserRequest, db : db_dependency):
    
    create_user_model = Users(
        email = create_user_request.email,
        username = create_user_request.username,
        first_name = create_user_request.first_name,
        last_name = create_user_request.last_name,
        hashed_password = bcrypt_context.hash(create_user_request.password),
        phone_number = create_user_request.phone_number,
        role = normalize_role(create_user_request.role),
        is_active = True
    )

    db.add(create_user_model)
    db.commit()


@router.post("/token", response_model=Token)
async def login_access_token(form_data: Annotated[OAuth2PasswordRequestForm, Depends()], db: db_dependency):

    user = authenticate_user(form_data.username, form_data.password, db)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate user")
    
    token = create_access_token(user.username, user.id, normalize_role(user.role), timedelta(minutes=20))
    print(type(user.username))
    print(user.username)

    return {"access_token" : token, 'token_type' : 'bearer'}
