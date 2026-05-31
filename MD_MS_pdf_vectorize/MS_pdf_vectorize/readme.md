# Microsserviço de Ingestão e Vetorização

Este microsserviço atua como um *worker* isolado. Ele é responsável exclusivamente por processar documentos PDF (extração, limpeza, chunking e vetorização) e salvar os resultados diretamente no banco de dados.

## Tecnologias
- **FastAPI:** Framework web principal.
- **PyMuPDF (fitz):** Para extração de texto bruto de PDFs.
- **Sentence-Transformers (GTE-Small):** Modelo leve e performático para geração de vetores de 384 dimensões.
- **Supabase (pgvector):** Banco de dados relacional e vetorial.

---

## Setup do Banco de Dados

Antes de rodar a aplicação, é necessário preparar o banco de dados para receber os tensores. Execute o script abaixo no SQL Editor do seu projeto Supabase:

```sql
-- Habilitar a extensão pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Criar a tabela de vetores
CREATE TABLE IF NOT EXISTS pdf_vectors (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    pdf_id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    chunk_text text NOT NULL,
    embedding vector(384) NOT NULL,
    chunk_index integer NOT NULL,
    embedding_model_used text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Criar índice de performance para busca semântica
CREATE INDEX ON pdf_vectors USING hnsw (embedding vector_cosine_ops);
```


## Como rodar localmente (via Docker)

O ambiente foi configurado para rodar de forma conteinerizada, garantindo que o modelo GTE-Small e as bibliotecas C++ do PyMuPDF funcionem sem conflitos na sua máquina.


1. Na raiz do projeto (onde está o `docker-compose.yml`), execute:
   ```bash
   docker-compose up --build


A estrutura do payload deve seguir o formato:


```
{
  "pdf_url": "COLE_AQUI_A_URL_GERADA_NO_PASSO_ANTERIOR",
  "pdf_id": 1,
  "tenant_id": 100,
  "supabase_url": "[https://seu-projeto.supabase.co](https://seu-projeto.supabase.co)",
  "supabase_key": "sua-service-role-key-com-permissao-de-escrita",
  "table_name": "pdf_vectors"
}```


