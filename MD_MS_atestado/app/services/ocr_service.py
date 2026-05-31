import json
import logging
import re  # Importe o pacote de Regex
from openai import AsyncOpenAI
from core.schemas import DocumentPayload, ExtracaoResponse

logger = logging.getLogger(__name__)

async def extrair_dados_atestado(payload: DocumentPayload) -> ExtracaoResponse:
    client = AsyncOpenAI(api_key=payload.openai_api_key)
    
    # 🕵️‍♂️ Pega qualquer URL http ou https de dentro do texto da query
    urls = re.findall(r'(https?://[^\s]+)', payload.query)
    if not urls:
        return ExtracaoResponse(sucesso=False, answer="Nenhum link de documento válido foi encontrado na mensagem.")
    
    document_url = urls[0] # Usa a primeira URL encontrada
    logger.info(f"URL extraída para processamento visual: {document_url}")

    prompt = """Você é um especialista em auditoria médica de RH.
    Analise a imagem deste atestado médico e extraia as seguintes informações obrigatórias.
    Retorne APENAS um objeto JSON com as chaves exatas abaixo, sem formatação markdown (não use ```json):
    {
        "nome_medico": "Nome completo do médico ou null",
        "crm": "Apenas os números do CRM e estado (ex: 123456-SP) ou null",
        "cid": "O código CID-10 encontrado (ex: J01.9) ou null",
        "data_emissao": "A data em que o atestado foi assinado no formato YYYY-MM-DD ou null",
        "dias_afastamento": Número inteiro de dias de repouso concedidos ou null
    }
    Se você não conseguir ler ou a imagem não for um atestado, defina os campos como null."""

    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {"url": document_url}
                        }
                    ]
                }
            ],
            max_tokens=300,
            temperature=0.0
        )
        
        texto_resposta = response.choices[0].message.content.strip()
        dados = json.loads(texto_resposta)
        
        # Formatamos um texto amigável na resposta para retornar ao chat
        texto_retorno = f"📝 **Dados extraídos do Atestado:**\n" \
                        f"- Médico: {dados.get('nome_medico') or 'Não identificado'}\n" \
                        f"- CRM: {dados.get('crm') or 'Não identificado'}\n" \
                        f"- CID: {dados.get('cid') or 'Não identificado'}\n" \
                        f"- Data de Emissão: {dados.get('data_emissao') or 'Não identificado'}\n" \
                        f"- Dias de Afastamento: {dados.get('dias_afastamento') or 'Não identificado'} dias.\n" \
                        f"- Arquivo: {document_url}\n\n" \
                        f" **Estas informações estão corretas?** Responda 'Sim' para salvar ou 'Não' para cancelar."
        
        return ExtracaoResponse(
            sucesso=True,
            nome_medico=dados.get("nome_medico"),
            crm=dados.get("crm"),
            cid=dados.get("cid"),
            data_emissao=dados.get("data_emissao"),
            dias_afastamento=dados.get("dias_afastamento"),
            answer=texto_retorno
        )
        
    except Exception as e:
        logger.error(f"[OCR ERROR] {e}")
        return ExtracaoResponse(sucesso=False, answer=f"Falha técnica ao ler o documento: {str(e)}")