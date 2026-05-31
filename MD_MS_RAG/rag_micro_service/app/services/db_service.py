import httpx
import logging

logger = logging.getLogger(__name__)

async def buscar_contextos_vetoriais(query_vector: list, tenant_id: int, supa_url: str, supa_key: str) -> list:
    """Dispara a RPC de similaridade vetorial no Supabase de forma 100% assíncrona."""
    endpoint = f"{supa_url}/rest/v1/rpc/match_pdf_vectors"
    headers = {
        "apikey": supa_key,
        "Authorization": f"Bearer {supa_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "query_embedding": query_vector,
        "match_threshold": 0.70,
        "match_count": 5,
        "p_tenant_id": tenant_id
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(endpoint, headers=headers, json=payload)
            response.raise_for_status()
            return response.json()
    except Exception as e:
        logger.error(f"[DB ERROR] Falha na busca vetorial: {e}")
        return []