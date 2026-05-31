from pydantic import BaseModel
from typing import Optional, List

class DocumentPayload(BaseModel):
    query: str  # Alterado de document_url para query para aceitar o padrão do Orquestrador
    tenant_id: int
    user_id: str = "N/A"
    openai_api_key: str
    supabase_url: str
    supabase_key: str
    history: List = []

class ExtracaoResponse(BaseModel):
    sucesso: bool
    nome_medico: Optional[str] = None
    crm: Optional[str] = None
    cid: Optional[str] = None
    data_emissao: Optional[str] = None
    dias_afastamento: Optional[int] = None
    answer: str  # Mudamos para 'answer' para o Orquestrador saber ler o texto de retorno