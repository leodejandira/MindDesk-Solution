# extract.py

import pandas as pd
from supabase import create_client, Client
import warnings

warnings.filterwarnings('ignore')

SUPABASE_URL = "https://bwspyzsllpmrskrecaen.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3c3B5enNsbHBtcnNrcmVjYWVuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDY0NzQ5NSwiZXhwIjoyMDkwMjIzNDk1fQ.Q4jytUe39UJjOfzJZLosRlI7B1xDqP5_bpXHpiR19JI" 


supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


def fetch_table_as_df(table_name):
    """
    Busca TODOS os registros de uma tabela lidando com paginação do Supabase.
    """
    
    try:
        all_data = []
        chunk_size = 1000
        start = 0

        while True:
            end = start + chunk_size - 1

            response = (
                supabase
                .table(table_name)
                .select("*")
                .range(start, end)
                .execute()
            )

            data = response.data

            if not data:
                break

            all_data.extend(data)

            if len(data) < chunk_size:
                break

            start += chunk_size

        df = pd.DataFrame(all_data)

        if not df.empty:

            cols_data = [
                col for col in df.columns
                if (
                    'data' in col
                    or 'created_at' in col
                    or 'updated_at' in col
                )
            ]

            for col in cols_data:
                df[col] = pd.to_datetime(df[col], errors='ignore')

        print(
            f"Tabela '{table_name}' carregada: "
            f"{df.shape[0]} linhas x {df.shape[1]} colunas"
        )

        return df

    except Exception as e:

        print(f"Erro ao buscar '{table_name}': {e}")

        return pd.DataFrame()


def carregar_tabelas():
    """
    Extrai todas as tabelas do projeto.
    """

    tabelas = {
        'usuarios': fetch_table_as_df("usuarios"),
        'pulse': fetch_table_as_df("pulse"),
        'historico_cursos': fetch_table_as_df("historico_cursos"),
        'historico_promocoes': fetch_table_as_df("historico_promocoes"),
        'pontos': fetch_table_as_df("pontos"),
        'banco_horas': fetch_table_as_df("banco_horas"),
        'ferias': fetch_table_as_df("ferias"),
        'atestados': fetch_table_as_df("atestados")
    }

    return tabelas

