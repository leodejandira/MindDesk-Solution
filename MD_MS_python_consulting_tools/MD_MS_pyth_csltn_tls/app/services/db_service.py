import httpx
import logging

logger = logging.getLogger(__name__)

async def consultar_funcionario_db(nome: str, tenant_id: int, supa_url: str, supa_key: str) -> str:
    logger.info(f"[DB] Buscando funcionário: '{nome}' (Tenant: {tenant_id})")
    try:
        endpoint = f"{supa_url}/rest/v1/usuarios"
        headers = {"apikey": supa_key, "Authorization": f"Bearer {supa_key}"}
        params = {"tenant_id": f"eq.{tenant_id}", "nome": f"ilike.%{nome}%"}

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(endpoint, headers=headers, params=params)
            resp.raise_for_status()
            dados = resp.json()

        if not dados:
            return f"Nenhum funcionário encontrado com o nome '{nome}'."

        resultado = f"Encontrei {len(dados)} registro(s) no banco:\n"
        for user in dados:
            resultado += f"- Nome: {user.get('nome')}\n  Cargo: {user.get('cargo', 'N/A')}\n  Admissão: {user.get('data_contratacao', 'N/A')}\n  Saldo de Férias: {user.get('saldo_ferias', 0)} dias\n\n"
        return resultado
    except Exception as e:
        logger.error(f"[DB ERROR] {e}")
        return "Erro técnico ao tentar ler a tabela de usuários."

async def consultar_ferias_db(nome: str, tenant_id: int, supa_url: str, supa_key: str) -> str:
    logger.info(f"[DB] Buscando férias de: '{nome}' (Tenant: {tenant_id})")
    try:
        headers = {"apikey": supa_key, "Authorization": f"Bearer {supa_key}"}
        
        # 1. Busca o ID do usuário
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp_user = await client.get(
                f"{supa_url}/rest/v1/usuarios", 
                headers=headers, 
                params={"tenant_id": f"eq.{tenant_id}", "nome": f"ilike.%{nome}%", "select": "id,nome"}
            )
            resp_user.raise_for_status()
            users = resp_user.json()
            
            if not users:
                return f"Funcionário '{nome}' não encontrado para buscar as férias."
                
            user_id = users[0]['id']
            nome_real = users[0]['nome']

            # 2. Busca as férias
            resp_ferias = await client.get(
                f"{supa_url}/rest/v1/ferias", 
                headers=headers, 
                params={"tenant_id": f"eq.{tenant_id}", "usuario_id": f"eq.{user_id}"}
            )
            resp_ferias.raise_for_status()
            ferias = resp_ferias.json()

        if not ferias:
            return f"O funcionário {nome_real} não possui histórico de férias cadastrado."

        resultado = f"Histórico de Férias de {nome_real}:\n"
        for f in ferias:
            resultado += f"- De {f.get('data_inicio')} até {f.get('data_fim')} | Status: {f.get('status')}\n"
        return resultado
    except Exception as e:
        logger.error(f"[DB ERROR] {e}")
        return "Erro técnico ao consultar férias."

async def consultar_atestados_db(nome: str, tenant_id: int, supa_url: str, supa_key: str) -> str:
    logger.info(f"[DB] Buscando atestados de: '{nome}' (Tenant: {tenant_id})")
    try:
        headers = {"apikey": supa_key, "Authorization": f"Bearer {supa_key}"}
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp_user = await client.get(
                f"{supa_url}/rest/v1/usuarios", 
                headers=headers, 
                params={"tenant_id": f"eq.{tenant_id}", "nome": f"ilike.%{nome}%", "select": "id,nome"}
            )
            resp_user.raise_for_status()
            users = resp_user.json()
            
            if not users:
                return f"Funcionário '{nome}' não encontrado para buscar atestados."
                
            user_id = users[0]['id']
            nome_real = users[0]['nome']

            resp_atestados = await client.get(
                f"{supa_url}/rest/v1/atestados", 
                headers=headers, 
                params={"tenant_id": f"eq.{tenant_id}", "usuario_id": f"eq.{user_id}"}
            )
            resp_atestados.raise_for_status()
            atestados = resp_atestados.json()

        if not atestados:
            return f"O funcionário {nome_real} não possui atestados entregues."

        resultado = f"Atestados de {nome_real}:\n"
        for a in atestados:
            resultado += f"- {a.get('dias_afastamento')} dias em {a.get('data_emissao')} | CID: {a.get('motivo_cid', 'N/A')} | Status: {a.get('status')}\n"
        return resultado
    except Exception as e:
        logger.error(f"[DB ERROR] {e}")
        return "Erro técnico ao consultar atestados."
    
    
async def salvar_atestado_db(dados: dict, tenant_id: int, user_id: str, supa_url: str, supa_key: str) -> str:
    logger.info(f"[DB] Salvando atestado para o usuário: '{user_id}' (Tenant: {tenant_id})")
    try:
        endpoint = f"{supa_url}/rest/v1/atestados"
        headers = {
            "apikey": supa_key,
            "Authorization": f"Bearer {supa_key}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
        }
        
        payload = {
            "tenant_id": tenant_id,
            "usuario_id": user_id,
            "data_emissao": dados.get("data_emissao"),
            "dias_afastamento": dados.get("dias_afastamento"),
            "motivo_cid": dados.get("motivo_cid"),
            "url_arquivo": dados.get("url_arquivo"),
            "status": "aprovado" # Ou pendente, de acordo com a sua regra
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(endpoint, headers=headers, json=payload)
            resp.raise_for_status()

        return "Atestado salvo com sucesso no banco de dados!"
    except Exception as e:
        logger.error(f"[DB ERROR] Falha ao salvar atestado: {e}")
        return f"Erro técnico ao tentar salvar o atestado no banco."