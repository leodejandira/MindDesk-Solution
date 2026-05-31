from fastapi import APIRouter, HTTPException, BackgroundTasks
import logging

from core.schemas import PulseRequest, PulseResponse
from services.db_service import buscar_subordinados, buscar_historico_recente, upsert_pulse
from services.llm_service import analisar_sentimento_historico

router = APIRouter()
logger = logging.getLogger(__name__)

async def rotina_processamento_pulse(req: PulseRequest):
    """Função pesada que roda em background."""
    logger.info("Iniciando processamento em lote do Humanograma...")
    try:
        funcionarios = await buscar_subordinados(req.gerente_id, req.tenant_id, req.supabase_url, req.supabase_key)
        
        for func in funcionarios:
            usuario_id = func['id']
            logger.info(f"Analisando Pulse do funcionário: {func['nome']} ({usuario_id})")
            
            historico = await buscar_historico_recente(usuario_id, req.tenant_id, req.supabase_url, req.supabase_key)
            analise = await analisar_sentimento_historico(historico, req.openai_api_key)
            
            await upsert_pulse(usuario_id, req.tenant_id, analise, req.supabase_url, req.supabase_key)
            
        logger.info("Processamento do Humanograma concluído com sucesso!")
    except Exception as e:
        logger.error(f"Erro fatal na rotina Pulse em background: {e}")

@router.post("/processar_humanograma", response_model=PulseResponse)
async def processar_humanograma(request: PulseRequest, background_tasks: BackgroundTasks):
    if not request.openai_api_key:
        raise HTTPException(status_code=400, detail="Chave da OpenAI ausente.")
    
    # 🎯 Adiciona a rotina pesada na fila de tarefas em segundo plano do FastAPI
    background_tasks.add_task(rotina_processamento_pulse, request)
    
    # Responde imediatamente pro Front-end liberar a tela do gerente
    return PulseResponse(
        status="sucesso", 
        mensagem="A análise do Humanograma foi iniciada em segundo plano. Os dados do painel serão atualizados em breve."
    )