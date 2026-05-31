from fastapi import APIRouter, HTTPException
import logging
from core.schemas import DocumentPayload, ExtracaoResponse
from services.ocr_service import extrair_dados_atestado

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/processar", response_model=ExtracaoResponse)
async def processar_documento(payload: DocumentPayload):
    if not payload.openai_api_key:
        raise HTTPException(status_code=400, detail="Chave da OpenAI ausente.")
        
    resultado = await extrair_dados_atestado(payload)
    return resultado