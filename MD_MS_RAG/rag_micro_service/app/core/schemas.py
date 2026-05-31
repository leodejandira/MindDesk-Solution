from pydantic import BaseModel
from typing import List

class QueryPayload(BaseModel):
    query: str
    tenant_id: int
    openai_api_key: str
    supabase_url: str
    supabase_key: str
    history: list = [] # O RAG agora também lembra das mensagens anteriores!

class Source(BaseModel):
    pdf_id: str
    similarity: float

class QueryResponse(BaseModel):
    answer: str
    sources: List[Source]