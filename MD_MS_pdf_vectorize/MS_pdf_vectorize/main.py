import os
import tempfile
import requests
import fitz  # PyMuPDF
import re
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from supabase import create_client, Client
from sentence_transformers import SentenceTransformer

# 1. Inicialização do App
app = FastAPI(title="MindDesk AI - Worker Service", version="2.0.0")

# 2. Carregamento do Modelo de IA na inicialização (Isso precisa ficar global para não travar a API)
print("Carregando modelo GTE-Small em memória...")
embedding_model = SentenceTransformer('thenlper/gte-small')
print("Modelo GTE-Small carregado com sucesso!")

# 3. Contrato de API (O JSON que o Node.js vai enviar)
class ProcessPDFPayload(BaseModel):
    pdf_url: str
    pdf_id: int
    tenant_id: int
    supabase_url: str  # Recebendo via payload conforme seu requisito
    supabase_key: str  # Recebendo via payload conforme seu requisito

# 4. Funções Auxiliares de Limpeza
def sanitize_text(text: str) -> str:
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'[^\x00-\x7F\u00C0-\u017F]+', '', text) # Mantém acentuação PT-BR
    return text.strip()

def chunk_text(text: str, chunk_size: int = 300, overlap: int = 50) -> list[str]:
    words = text.split()
    chunks = []
    for i in range(0, len(words), chunk_size - overlap):
        chunk = " ".join(words[i:i + chunk_size])
        chunks.append(chunk)
        if i + chunk_size >= len(words):
            break
    return chunks

# 5. A Rota Principal de Trabalho
@app.post("/api/process-pdf")
def process_pdf(payload: ProcessPDFPayload):
    temp_path = None
    try:
        # ETAPA 1: Download do PDF via URL
        print(f"[DEBUG] Baixando PDF temporário para o tenant {payload.tenant_id}...")
        response = requests.get(payload.pdf_url, stream=True, timeout=60)
        response.raise_for_status()

        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
        temp_path = temp_file.name
        for chunk in response.iter_content(chunk_size=8192):
            if chunk:
                temp_file.write(chunk)
        temp_file.close()

        # ETAPA 2: Extração de Texto com PyMuPDF
        print("[DEBUG] Extraindo texto do PDF...")
        text_parts = []
        with fitz.open(temp_path) as doc:
            for page in doc:
                text = page.get_text("text").replace("\r", "").strip()
                if text:
                    text_parts.append(text)
        full_text = "\n\n".join(text_parts)

        if not full_text.strip():
            raise ValueError("O PDF está vazio ou é uma imagem sem texto selecionável.")

        # ETAPA 3: Limpeza e Chunking
        print("[DEBUG] Fatiando o texto...")
        clean_text = sanitize_text(full_text)
        chunks = chunk_text(clean_text, chunk_size=300, overlap=50)

        # ETAPA 4: Vetorização (Embeddings)
        print("[DEBUG] Gerando Tensores...")
        embeddings = embedding_model.encode(chunks)

        # ETAPA 5: Conectar ao Supabase (Usando credenciais do Payload) e Salvar
        print("[DEBUG] Inserindo no Supabase...")
        
        # Cria a conexão dinamicamente para cada requisição
        supabase: Client = create_client(payload.supabase_url, payload.supabase_key)
        
        records_to_insert = []
        for index, (chunk_str, vector) in enumerate(zip(chunks, embeddings)):
            records_to_insert.append({
                "pdf_id": payload.pdf_id,
                "tenant_id": payload.tenant_id,
                "chunk_text": chunk_str,
                "embedding": vector.tolist(),
                "chunk_index": index,
                "embedding_model_used": "gte-small"
            })

        # Executa o insert na tabela vetorial
        supabase.table("pdf_vectors").insert(records_to_insert).execute()

        return {
            "status": "success",
            "message": f"PDF processado com sucesso.",
            "chunks_gerados": len(records_to_insert)
        }

    except Exception as e:
        print(f"[ERROR] Falha na esteira: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        # ETAPA 6: Faxina
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass
    