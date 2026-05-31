from fastapi import APIRouter, HTTPException
import logging
from core.schemas import QueryPayload, QueryResponse
from services.embedding_service import gerar_embedding
from services.db_service import buscar_contextos_vetoriais
from services.llm_service import gerar_resposta_rag

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/ask", response_model=QueryResponse)
async def ask_question(payload: QueryPayload):
    try:
        # 1. Transformar a pergunta em matemática (Thread Pool)
        query_vector = await gerar_embedding(payload.query)
        
        # 2. Pescar os parágrafos mais parecidos no banco
        contexts = await buscar_contextos_vetoriais(
            query_vector, payload.tenant_id, payload.supabase_url, payload.supabase_key
        )
        
        # 3. Proteção contra alucinação
        if not contexts:
            return QueryResponse(
                answer="Não encontrei informações sobre isso nos documentos oficiais da empresa.",
                sources=[]
            )
        
        # 4. Redigir a resposta final usando a IA
        answer = await gerar_resposta_rag(
            payload.query, payload.history, contexts, payload.openai_api_key
        )
        
        # 5. Mapear rastreabilidade
        sources = [{"pdf_id": str(c.get("pdf_id")), "similarity": round(c.get("similarity", 0), 2)} for c in contexts]
        
        return QueryResponse(answer=answer, sources=sources)
        
    except Exception as e:
        logger.error(f"[ROUTE ERROR] {e}")
        raise HTTPException(status_code=500, detail="Erro interno no Agente RAG.")

@router.get("/health")
def health_check():
    return {"status": "ok", "service": "query-rag"}