import logging
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

async def gerar_resposta_rag(query: str, history: list, contexts: list, api_key: str) -> str:
    client = AsyncOpenAI(api_key=api_key)

    context_text = "\n\n".join([f"Trecho {i+1}:\n{c['chunk_text']}" for i, c in enumerate(contexts)])

    system_prompt = """Você é um assistente virtual de RH da MindDesk.
Sua função é responder dúvidas dos colaboradores de forma clara, educada e direta.
REGRAS IMPORTANTES:
1. Responda baseando-se EXCLUSIVAMENTE nos trechos de contexto fornecidos.
2. Se a resposta não estiver clara no contexto, diga gentilmente que não possui essa informação.
3. Não invente políticas de RH, valores ou prazos que não estejam no texto."""

    messages = [{"role": "system", "content": system_prompt}]
    
    # Injeta a fofoca para a IA não perder o raciocínio
    if history:
        for msg in history:
            messages.append({"role": msg["role"], "content": msg["content"]})
            
    user_prompt = f"Contexto extraído dos manuais da empresa:\n{context_text}\n\nPergunta do colaborador: {query}"
    messages.append({"role": "user", "content": user_prompt})

    try:
        chat_response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=0.2
        )
        return chat_response.choices[0].message.content
    except Exception as e:
        logger.error(f"[LLM ERROR] Falha ao gerar resposta RAG: {e}")
        raise