from pydantic import BaseModel, EmailStr
from typing import Optional


class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: Optional[str] = None
    dob: Optional[str] = None


class UserLogin(BaseModel):
    identifier: str
    password: str


class OtpVerify(BaseModel):
    email: EmailStr
    otp: str
