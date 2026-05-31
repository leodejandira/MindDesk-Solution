import logging
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

AGENT_DESCRIPTIONS = {
    "rag": "Use para dúvidas teóricas, manuais em PDF, kits corporativos, cultura da empresa e políticas de RH escritas.",
    "tools": "Use OBRIGATORIAMENTE para CONSULTAR, BUSCAR, VERIFICAR ou SALVAR dados reais de funcionários no sistema (como férias e atestados).",
    "docs": "Use EXCLUSIVAMENTE quando o usuário enviar um link/URL de imagem ou documento informando que é um atestado médico."
}

async def classificar_intencao(historico: list, api_key: str) -> str:
    try:
        client = AsyncOpenAI(api_key=api_key)
        contexto_str = "\n".join([f"{'Usuário' if msg['role'] == 'user' else 'Assistente'}: {msg['content']}" for msg in historico])
        
        prompt = f"""Você é o roteador de tráfego de um sistema de RH.
        Sua única função é analisar a ÚLTIMA mensagem do usuário e decidir qual agente vai processá-la.
        
        REGRAS DE OURO:
        1. Se a mensagem tiver uma URL (http/https), roteie para 'docs'.
        2. Se o usuário estiver confirmando que dados estão corretos ('sim', 'pode salvar'), roteie para 'tools'.
        3. Se o usuário usar verbos como "consultar", "ver" ou "buscar" relacionados a "atestados", "férias" ou "funcionários", roteie IMEDIATAMENTE para 'tools'.
        
        Agentes disponíveis:
        {AGENT_DESCRIPTIONS}
        
        Histórico recente da conversa:
        {contexto_str}
        
        Responda APENAS com a chave do agente escolhido (rag, tools ou docs). Nenhuma palavra a mais."""
        
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "system", "content": prompt}],
            temperature=0.0 
        )
        
        rota = response.choices[0].message.content.strip().lower()
        return rota if rota in ["rag", "tools", "docs"] else "rag"
        
    except Exception as e:
        logger.error(f"[LLM ERROR] Erro no Roteador Semântico: {e}")
        return "rag"