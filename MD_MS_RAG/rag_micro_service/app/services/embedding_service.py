import asyncio
import logging
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

logger.info("Carregando modelo GTE-Small na memória...")
model = SentenceTransformer('thenlper/gte-small')
logger.info("Modelo de embedding carregado com sucesso!")

async def gerar_embedding(texto: str) -> list:
    """
    Gera o vetor da string rodando em uma thread separada (run_in_executor).
    Isso impede que o cálculo matemático trave as outras requisições do servidor.
    """
    loop = asyncio.get_running_loop()
    vector = await loop.run_in_executor(None, lambda: model.encode(texto).tolist())
    return vector