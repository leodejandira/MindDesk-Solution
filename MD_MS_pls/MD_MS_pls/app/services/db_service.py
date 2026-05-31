import httpx
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

async def buscar_subordinados(gerente_id: str, tenant_id: int, supa_url: str, supa_key: str) -> list:
    """Simula a busca de funcionários atrelados a um gerente."""
    # Para o MVP, se não houver coluna de hierarquia, vamos puxar todos os usuários do tenant.
    endpoint = f"{supa_url}/rest/v1/usuarios"
    headers = {"apikey": supa_key, "Authorization": f"Bearer {supa_key}", "Content-Type": "application/json"}
    params = {"tenant_id": f"eq.{tenant_id}", "select": "id,nome"}
    
    async with httpx.AsyncClient() as client:
        resp = await client.get(endpoint, headers=headers, params=params)
        resp.raise_for_status()
        return resp.json()

async def buscar_historico_recente(usuario_id: str, tenant_id: int, supa_url: str, supa_key: str) -> list:
    """Busca as mensagens dos últimos 30 dias do usuário."""
    trinta_dias_atras = (datetime.utcnow() - timedelta(days=30)).isoformat()
    endpoint = f"{supa_url}/rest/v1/historico_conversas"
    headers = {"apikey": supa_key, "Authorization": f"Bearer {supa_key}", "Content-Type": "application/json"}
    params = {
        "usuario_id": f"eq.{usuario_id}",
        "tenant_id": f"eq.{tenant_id}",
        "created_at": f"gte.{trinta_dias_atras}",
        "order": "created_at.asc", # Ordem cronológica para a IA entender a história
        "select": "role,content"
    }
    
    async with httpx.AsyncClient() as client:
        resp = await client.get(endpoint, headers=headers, params=params)
        resp.raise_for_status()
        return resp.json()

async def upsert_pulse(usuario_id: str, tenant_id: int, analise: dict, supa_url: str, supa_key: str):
    """Atualiza a tabela Pulse. Se o usuário já tiver um registro, atualiza. Se não, cria."""
    endpoint = f"{supa_url}/rest/v1/pulse"
    headers = {
        "apikey": supa_key,
        "Authorization": f"Bearer {supa_key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates" # Essa flag faz o mágico UPSERT no Supabase
    }
    
    payload = {
        "usuario_id": usuario_id,
        "tenant_id": tenant_id,
        "score_humor": analise.get("score_humor"),
        "sentimento_predominante": analise.get("sentimento_predominante"),
        "resumo_ia": analise.get("resumo_ia"),
        "updated_at": datetime.utcnow().isoformat()
    }
    
    async with httpx.AsyncClient() as client:
        resp = await client.post(endpoint, headers=headers, json=payload)
        resp.raise_for_status()