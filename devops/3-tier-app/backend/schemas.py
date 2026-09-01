from pydantic import BaseModel


class TodoCreate(BaseModel):
    title: str
    completed: bool = False


class TodoUpdate(BaseModel):
    title: str | None = None
    completed: bool | None = None


class TodoOut(BaseModel):
    id: int
    title: str
    completed: bool

    model_config = {"from_attributes": True}
