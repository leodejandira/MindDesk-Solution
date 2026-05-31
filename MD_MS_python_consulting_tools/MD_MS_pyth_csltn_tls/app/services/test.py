from supabase import create_client, Client

def consultar_funcionario_db(nome: str, tenant_id: int, supa_url: str, supa_key: str) -> str:
    print(f"[DB] Buscando funcionário: '{nome}' (Tenant: {tenant_id})")
    try:
        supabase: Client = create_client(supa_url, supa_key)
        response = supabase.table('usuarios').select('*').eq('tenant_id', tenant_id).ilike('nome', f'%{nome}%').execute()

        dados = response.data
        if not dados:
            return f"Nenhum funcionário encontrado com o nome '{nome}'."

        resultado = f"Encontrei {len(dados)} registro(s) no banco:\n"
        for user in dados:
            # Atualizado para trazer os campos novos que criamos no banco
            resultado += f"- Nome: {user.get('nome')}\n  Cargo: {user.get('cargo', 'N/A')}\n  Admissão: {user.get('data_contratacao', 'N/A')}\n  Saldo de Férias: {user.get('saldo_ferias', 0)} dias\n\n"

        return resultado
    except Exception as e:
        print(f"[DB ERROR] {e}")
        return "Erro técnico ao tentar ler a tabela de usuários."


def consultar_ferias_db(nome: str, tenant_id: int, supa_url: str, supa_key: str) -> str:
    print(f"[DB] Buscando férias de: '{nome}' (Tenant: {tenant_id})")
    try:
        supabase: Client = create_client(supa_url, supa_key)
        # 1. Acha o ID do funcionário primeiro
        users = supabase.table('usuarios').select('id, nome').eq('tenant_id', tenant_id).ilike('nome', f'%{nome}%').execute().data
        
        if not users:
            return f"Funcionário '{nome}' não encontrado para buscar as férias."
            
        user_id = users[0]['id']
        nome_real = users[0]['nome']

        # 2. Busca as férias usando o ID
        ferias = supabase.table('ferias').select('*').eq('tenant_id', tenant_id).eq('usuario_id', user_id).execute().data
        
        if not ferias:
            return f"O funcionário {nome_real} não possui histórico de férias cadastrado."

        resultado = f"Histórico de Férias de {nome_real}:\n"
        for f in ferias:
            resultado += f"- De {f.get('data_inicio')} até {f.get('data_fim')} | Status: {f.get('status')}\n"
            
        return resultado
    except Exception as e:
        print(f"[DB ERROR] {e}")
        return "Erro técnico ao consultar férias."


def consultar_atestados_db(nome: str, tenant_id: int, supa_url: str, supa_key: str) -> str:
    print(f"[DB] Buscando atestados de: '{nome}' (Tenant: {tenant_id})")
    try:
        supabase: Client = create_client(supa_url, supa_key)
        users = supabase.table('usuarios').select('id, nome').eq('tenant_id', tenant_id).ilike('nome', f'%{nome}%').execute().data
        
        if not users:
            return f"Funcionário '{nome}' não encontrado para buscar atestados."
            
        user_id = users[0]['id']
        nome_real = users[0]['nome']

        atestados = supabase.table('atestados').select('*').eq('tenant_id', tenant_id).eq('usuario_id', user_id).execute().data
        
        if not atestados:
            return f"O funcionário {nome_real} não possui atestados entregues."

        resultado = f"Atestados de {nome_real}:\n"
        for a in atestados:
            resultado += f"- {a.get('dias_afastamento')} dias em {a.get('data_emissao')} | CID: {a.get('motivo_cid', 'N/A')} | Status: {a.get('status')}\n"
            
        return resultado
    except Exception as e:
        print(f"[DB ERROR] {e}")
        return "Erro técnico ao consultar atestados."