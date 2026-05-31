from fastapi import APIRouter, HTTPException
import logging
from core.schemas import ToolPayload
from services.llm_service import executar_raciocinio_tools

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/executar")
async def executar_acao(payload: ToolPayload):
    if not payload.openai_api_key:
        raise HTTPException(status_code=400, detail="Chave da OpenAI ausente.")

    try:
        answer = await executar_raciocinio_tools(payload)
        return {"answer": answer}
    except Exception as e:
        logger.error(f"[ROUTE ERROR] {e}")
        raise HTTPException(status_code=500, detail="Erro interno no Agente de Tools.")