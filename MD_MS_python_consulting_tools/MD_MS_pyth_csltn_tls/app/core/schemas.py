from pydantic import BaseModel

class ToolPayload(BaseModel):
    query: str
    tenant_id: int
    user_id: str = "N/A"
    role: str = "N/A"
    openai_api_key: str = ""
    supabase_url: str = ""
    supabase_key: str = ""
    history: list = []

# O Manual que ensina o GPT a usar o banco de dados
TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "consultar_funcionario_db",
            "description": "Busca dados gerais (admissão, cargo, saldo de férias atual) de um funcionário.",
            "parameters": {
                "type": "object",
                "properties": {"nome": {"type": "string", "description": "Nome do funcionário"}},
                "required": ["nome"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "consultar_ferias_db",
            "description": "Busca as datas e o histórico de férias marcadas ou tiradas de um funcionário.",
            "parameters": {
                "type": "object",
                "properties": {"nome": {"type": "string", "description": "Nome do funcionário"}},
                "required": ["nome"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "consultar_atestados_db",
            "description": "Busca o histórico de atestados médicos, dias de afastamento e CID de um funcionário.",
            "parameters": {
                "type": "object",
                "properties": {"nome": {"type": "string", "description": "Nome do funcionário"}},
                "required": ["nome"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "salvar_atestado_db",
            "description": "Salva um novo atestado médico no banco de dados DEPOIS que o usuário confirmar que os dados lidos estão corretos.",
            "parameters": {
                "type": "object",
                "properties": {
                    "data_emissao": {"type": "string", "description": "Data de emissão no formato YYYY-MM-DD"},
                    "dias_afastamento": {"type": "integer", "description": "Quantidade de dias de repouso concedidos"},
                    "motivo_cid": {"type": "string", "description": "O código CID encontrado ou null"},
                    "url_arquivo": {"type": "string", "description": "A URL (link) do arquivo do atestado presente no histórico"}
                },
                "required": ["data_emissao", "dias_afastamento", "url_arquivo"]
            }
        }
    }
]