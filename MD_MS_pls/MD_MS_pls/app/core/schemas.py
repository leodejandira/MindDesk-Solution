from pydantic import BaseModel

class PulseRequest(BaseModel):
    gerente_id: str
    tenant_id: int
    openai_api_key: str
    supabase_url: str
    supabase_key: str

class PulseResponse(BaseModel):
    status: str
    mensagem: str