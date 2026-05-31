import json
import logging
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

async def analisar_sentimento_historico(historico: list, api_key: str) -> dict:
    if not historico:
        # Se não falou nada no mês, humor neutro
        return {"score_humor": 50, "sentimento_predominante": "Neutro", "resumo_ia": "Sem interações recentes."}

    client = AsyncOpenAI(api_key=api_key)
    
    # Filtra apenas as mensagens do usuário (a IA foca em como o humano falou, não como o bot respondeu)
    mensagens_usuario = [msg['content'] for msg in historico if msg['role'] == 'user']
    texto_compilado = "\n".join(mensagens_usuario)

    prompt = """Você é um Psicólogo Organizacional analisando o histórico de conversas de um funcionário com um chatbot corporativo.
    Analise o nível de estresse, frustração, animação ou engajamento nas seguintes mensagens.
    
    Responda EXCLUSIVAMENTE com um objeto JSON contendo:
    {
        "score_humor": Número de 0 a 100 (onde 0 é risco alto de burnout/raiva e 100 é engajado/feliz),
        "sentimento_predominante": "Apenas UMA palavra definindo a emoção principal (Ex: Frustrado, Animado, Ansioso, Neutro)",
        "resumo_ia": "Um parágrafo de até 2 linhas explicando o motivo do score."
    }"""

    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": f"Mensagens:\n{texto_compilado}"}
            ],
            temperature=0.1
        )
        
        texto_resposta = response.choices[0].message.content.strip()
        # Tratamento de segurança caso o modelo insira markdown
        if texto_resposta.startswith("```json"):
            texto_resposta = texto_resposta[7:-3]
            
        return json.loads(texto_resposta)
        
    except Exception as e:
        logger.error(f"[LLM ERROR] Erro na análise de sentimento: {e}")
        return {"score_humor": 50, "sentimento_predominante": "Neutro", "resumo_ia": "Falha ao processar análise."}