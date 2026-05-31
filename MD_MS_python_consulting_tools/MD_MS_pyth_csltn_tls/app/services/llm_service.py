import json
import logging
from openai import AsyncOpenAI
from core.schemas import ToolPayload, TOOLS_SCHEMA
from services.db_service import consultar_funcionario_db, consultar_ferias_db, consultar_atestados_db
from services.db_service import consultar_funcionario_db, consultar_ferias_db, consultar_atestados_db, salvar_atestado_db

logger = logging.getLogger(__name__)

async def executar_raciocinio_tools(payload: ToolPayload) -> str:
    client = AsyncOpenAI(api_key=payload.openai_api_key)

    # 1. Atualize o prompt do sistema para dar o contexto de salvamento
    prompt_sistema = """Você é um assistente de RH focado em ações de banco de dados. 
    Use as ferramentas para buscar dados OU SALVAR dados. 
    REGRA: Se o usuário estiver confirmando que as informações de um atestado estão corretas, use o histórico para encontrar a data, dias, CID e a URL do arquivo, e chame a ferramenta 'salvar_atestado_db'."""

    messages = [
        {"role": "system", "content": prompt_sistema}
    ]

    if payload.history:
        for msg in payload.history:
            messages.append({"role": msg["role"], "content": msg["content"]})
    else:
        messages.append({"role": "user", "content": payload.query})

    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini", 
            messages=messages,
            tools=TOOLS_SCHEMA,
            tool_choice="auto"
        )
        
        response_message = response.choices[0].message

        if response_message.tool_calls:
            messages.append(response_message) 
            
            for tool_call in response_message.tool_calls:
                args = json.loads(tool_call.function.arguments)
                dados_do_banco = ""

                # 2. Adicione o roteamento da nova ferramenta
                if tool_call.function.name == "consultar_funcionario_db":
                    nome_buscado = args.get("nome")
                    dados_do_banco = await consultar_funcionario_db(nome_buscado, payload.tenant_id, payload.supabase_url, payload.supabase_key)
                elif tool_call.function.name == "consultar_ferias_db":
                    nome_buscado = args.get("nome")
                    dados_do_banco = await consultar_ferias_db(nome_buscado, payload.tenant_id, payload.supabase_url, payload.supabase_key)
                elif tool_call.function.name == "consultar_atestados_db":
                    nome_buscado = args.get("nome")
                    dados_do_banco = await consultar_atestados_db(nome_buscado, payload.tenant_id, payload.supabase_url, payload.supabase_key)
                elif tool_call.function.name == "salvar_atestado_db":
                    # Passamos o dict completo (args) e o user_id real de quem está no chat
                    dados_do_banco = await salvar_atestado_db(args, payload.tenant_id, payload.user_id, payload.supabase_url, payload.supabase_key)
                
                messages.append({
                    "tool_call_id": tool_call.id,
                    "role": "tool",
                    "name": tool_call.function.name,
                    "content": dados_do_banco,
                })
            
            final_response = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages
            )
            return final_response.choices[0].message.content

        return response_message.content

    except Exception as e:
        logger.error(f"[LLM ERROR] Falha no raciocínio do Agente Tools: {e}")
        raise