# transform.py

import pandas as pd
import itertools


# --- A. Tratamento de Jornada (Pontos) ---
def calcular_saldo_seis_meses(pontos):
    df = pontos.copy()
    df['horario'] = pd.to_datetime(df['horario'], format='mixed', utc=True)
    
    hoje = pd.Timestamp.today(tz='UTC').normalize()
    inicio_mes_atual = hoje.replace(day=1) 
    inicio_periodo = inicio_mes_atual - pd.DateOffset(months=6)
    
    filtro_data = (df['horario'] >= inicio_periodo) & (df['horario'] < inicio_mes_atual)
    filtro_obs = (df['observacao'] != 'Atestado entregue - Marcação manual do RH')
    df_filtrado = df[filtro_data & filtro_obs].copy()
    
    df_filtrado['data'] = df_filtrado['horario'].dt.date
    
    df_pivot = df_filtrado.pivot_table(
        index=['usuario_id', 'data'], columns='tipo', values='horario', aggfunc='first'
    ).reset_index()
    
    for col in ['entrada', 'almoco', 'retorno_almoco', 'saida']:
        if col not in df_pivot.columns: df_pivot[col] = pd.NaT
            
    turno_manha = df_pivot['almoco'] - df_pivot['entrada']
    turno_tarde = df_pivot['saida'] - df_pivot['retorno_almoco']
    df_pivot['saldo_minutos'] = (turno_manha + turno_tarde).dt.total_seconds() / 60
    
    usuarios = df['usuario_id'].unique()
    dias_uteis = pd.bdate_range(start=inicio_periodo.date(), end=(inicio_mes_atual - pd.Timedelta(days=1)).date(), freq='B').date
    
    grade_completa = pd.DataFrame(list(itertools.product(usuarios, dias_uteis)), columns=['usuario_id', 'data'])
    
    df_final = pd.merge(grade_completa, df_pivot[['usuario_id', 'data', 'saldo_minutos']], on=['usuario_id', 'data'], how='left')
    
    dias_com_marcacao = df_filtrado[['usuario_id', 'data']].drop_duplicates()
    dias_com_marcacao['teve_marcacao'] = True
    
    df_final = pd.merge(df_final, dias_com_marcacao, on=['usuario_id', 'data'], how='left')
    df_final.loc[df_final['teve_marcacao'].isna(), 'saldo_minutos'] = -480.0
    
    return df_final.drop(columns=['teve_marcacao'])

def filtrar_e_calcular_diferenca_pontos(df_resultado):
    """Junta a filtragem de tolerância e o cálculo de diferença em um único passo."""
    df = df_resultado.copy()
    # Filtra fora da tolerância (exceções)
    filtro_fora_tolerancia = ~df['saldo_minutos'].between(470, 490, inclusive='both')
    df_excecoes = df[filtro_fora_tolerancia].reset_index(drop=True)
    
    # Calcula a diferença do banco de horas
    mascara_dias_trabalhados = (df_excecoes['saldo_minutos'] != -480.0) & df_excecoes['saldo_minutos'].notna()
    df_excecoes.loc[mascara_dias_trabalhados, 'saldo_minutos'] -= 480.0
    
    return df_excecoes.rename(columns={'saldo_minutos': 'diferenca_minutos'})


# --- B. Tratamento de Saúde (Atestados) ---
def mapear_atestados_seis_meses(df_atestados):
    df = df_atestados.copy()
    df['data_emissao'] = pd.to_datetime(df['data_emissao']).dt.date
    df['dias_afastamento'] = df['dias_afastamento'].astype(int)
    
    linhas_expandidas = []
    for _, row in df.iterrows():
        for i in range(row['dias_afastamento']):
            linhas_expandidas.append({
                'usuario_id': row['usuario_id'],
                'data': row['data_emissao'] + pd.Timedelta(days=i),
                'teve_atestado': True
            })
            
    df_atestados_diario = pd.DataFrame(linhas_expandidas).drop_duplicates()
    
    hoje = pd.Timestamp.today().normalize()
    inicio_mes_atual = hoje.replace(day=1)
    inicio_periodo = inicio_mes_atual - pd.DateOffset(months=6)
    fim_periodo = inicio_mes_atual - pd.Timedelta(days=1)
    
    todos_os_dias = pd.date_range(start=inicio_periodo.date(), end=fim_periodo.date()).date
    usuarios = df['usuario_id'].unique()
    
    grade_completa = pd.DataFrame(list(itertools.product(usuarios, todos_os_dias)), columns=['usuario_id', 'data'])
    
    df_final = pd.merge(grade_completa, df_atestados_diario, on=['usuario_id', 'data'], how='left')
    df_final['teve_atestado'] = df_final['teve_atestado'].fillna(False)
    
    return df_final[df_final["teve_atestado"]][['usuario_id', 'data', 'teve_atestado']]


# --- C. Tratamento de Férias ---
def analisar_historico_ferias(df_ferias):
    """Calcula o resumo de férias para o merge posterior."""
    hoje = pd.Timestamp.today().normalize()
    
    # 1. Preparação (garantindo datetime)
    df = df_ferias.copy()
    df['data_registro'] = pd.to_datetime(df['data_registro'])
    
    # 2. Data de contratação (min)
    df_contratacao = df.groupby('usuario_id')['data_registro'].min().reset_index()
    df_contratacao = df_contratacao.rename(columns={'data_registro': 'data_contratacao'})
    
    # 3. Férias concluídas (somente status 'cumprida')
    df_cumpridas = (
        df[df['status_ferias'] == 'cumprida']
        .groupby('usuario_id')
        .size()
        .reset_index(name='qtd_ferias_concluidas')
    )
    
    # 4. Merge e Cálculo
    df_final = df_contratacao.merge(df_cumpridas, on='usuario_id', how='left')
    df_final['qtd_ferias_concluidas'] = df_final['qtd_ferias_concluidas'].fillna(0).astype(int)
    
    # Cálculo de meses
    df_final['meses_empresa'] = (
        (hoje.year - df_final['data_contratacao'].dt.year) * 12 +
        (hoje.month - df_final['data_contratacao'].dt.month)
    )
    
    # Cálculo do saldo
    df_final['tempo_meses_ultimas_férias'] = (
        df_final['meses_empresa'] - (12 * df_final['qtd_ferias_concluidas'])
    )
    
    # Retorna o resumo pronto para ser usado no merge
    return df_final[['usuario_id', 'tempo_meses_ultimas_férias']]

# --- D. Tratamento de Promoções ---
def calcular_tempo_para_promocao(df_historico_promocoes):
    df = df_historico_promocoes.copy()
    df['data_alteracao'] = pd.to_datetime(df['data_alteracao'], format='mixed', utc=True).dt.tz_localize(None)
    df = df.sort_values(by=['usuario_id', 'data_alteracao']).reset_index(drop=True)
    
    df['data_cargo_anterior'] = df.groupby('usuario_id')['data_alteracao'].shift(1)
    df['dias_para_alteracao'] = (df['data_alteracao'] - df['data_cargo_anterior']).dt.days
    
    def formatar_tempo(dias):
        if pd.isna(dias): return "Cargo Inicial"
        anos, meses = int(dias // 365), int((dias % 365) // 30.41)
        partes = []
        if anos > 0: partes.append(f"{anos} ano{'s' if anos > 1 else ''}")
        if meses > 0: partes.append(f"{meses} mê{'ses' if meses > 1 else 's'}")
        return " e ".join(partes) if partes else "Menos de 1 mês"

    df['tempo_decorrido_texto'] = df['dias_para_alteracao'].apply(formatar_tempo)
    return df[['usuario_id', 'cargo_anterior', 'cargo_novo', 'data_alteracao', 'motivo', 'dias_para_alteracao', 'tempo_decorrido_texto']]


# --- E. Tratamento de Cursos ---
def separar_analise_cursos(df_historico_cursos):
    df = df_historico_cursos.copy()
    df['prazo_limite'] = pd.to_datetime(df['prazo_limite'], format='mixed').dt.tz_localize(None)
    df['data_conclusao'] = pd.to_datetime(df['data_conclusao'], format='mixed').dt.tz_localize(None)
    
    if 'concluido_no_prazo' in df.columns:
        df = df.rename(columns={'concluido_no_prazo': 'concluido_no_prazocreated_at'})

    # Tabela 1: Obrigatórios
    df_obrigatorios = df[df['obrigatorio'] == True].copy()
    df_obrigatorios['dias_relativo_ao_prazo'] = (df_obrigatorios['data_conclusao'] - df_obrigatorios['prazo_limite']).dt.days
    
    def categorizar_urgencia(dias):
        if pd.isna(dias): return "Sem informação de prazo"
        if dias < -10: return f"Muito rápido ({abs(dias)} dias antes)"
        elif -10 <= dias <= 0: return f"Perto de vencer ({abs(dias)} dias antes)"
        else: return f"Deixou vencer (Atrasado {dias} dias)"
            
    df_obrigatorios['comportamento_prazo'] = df_obrigatorios['dias_relativo_ao_prazo'].apply(categorizar_urgencia)
    df_compromisso = df_obrigatorios[['usuario_id', 'nome_curso', 'prazo_limite', 'data_conclusao', 'concluido_no_prazocreated_at', 'dias_relativo_ao_prazo', 'comportamento_prazo']].sort_values(by=['usuario_id', 'data_conclusao']).reset_index(drop=True)

    # Tabela 2: Opcionais
    df_opcionais = df[df['obrigatorio'] == False].copy()
    hoje = pd.Timestamp.today().normalize()
    df_opcionais['dias_desde_conclusao'] = (hoje - df_opcionais['data_conclusao']).dt.days
    df_proatividade = df_opcionais[['usuario_id', 'nome_curso', 'data_conclusao', 'dias_desde_conclusao']].sort_values(by=['usuario_id', 'data_conclusao']).reset_index(drop=True)
    
    return df_compromisso, df_proatividade


# ==========================================
# 2. ORQUESTRADOR DO ETL (A FUNÇÃO MACRO)
# ==========================================

def orquestrar_etl_transformacao(tabelas_brutas: dict):
    """
    Recebe um dicionário com os DataFrames crus e executa todo o pipeline de transformação,
    retornando um dicionário com as tabelas prontas para a geração do Score.
    """
    print("Iniciando ETL de People Analytics...")
    
    # 1. Transformar Jornada
    print("Transformando dados de Ponto...")
    df_saldo_pontos = calcular_saldo_seis_meses(tabelas_brutas['pontos'])
    df_diferenca = filtrar_e_calcular_diferenca_pontos(df_saldo_pontos)
    
    # 2. Transformar Atestados
    print("Mapeando histórico de Atestados...")
    df_atestados_final = mapear_atestados_seis_meses(tabelas_brutas['atestados'])
    
    # 3. Transformar Férias
    print("Processando histórico de Férias...")
    df_historico_ferias = analisar_historico_ferias(tabelas_brutas['ferias'])
    
    # 4. Transformar Promoções
    print("Calculando tempos de Cargo/Promoção...")
    df_tempo_promocoes = calcular_tempo_para_promocao(tabelas_brutas['historico_promocoes'])
    
    # 5. Transformar Cursos
    print("Separando métricas de Educação Corporativa...")
    df_compromisso, df_proatividade = separar_analise_cursos(tabelas_brutas['historico_cursos'])
    
    print("ETL concluído com sucesso! \n")
    
    # Retorna todas as peças do quebra-cabeça prontas para uso
    return {
        'df_diferenca': df_diferenca,
        'df_atestados_final': df_atestados_final,
        'df_historico_ferias': df_historico_ferias,
        'df_tempo_promocoes': df_tempo_promocoes,
        'df_compromisso': df_compromisso,
        'df_proatividade': df_proatividade,
        'df_pulse': tabelas_brutas['pulse'] # Pass-through direto, não precisa de transformação pesada aqui
    }


# ==========================================
# 1. MÓDULOS DE FEATURE ENGINEERING
# ==========================================

def iniciar_df_score(df_usuarios):
    """Cria a base do Score a partir da tabela de usuários limpa."""
    # errors='ignore' evita falhas caso alguma dessas colunas já não exista
    return df_usuarios.drop(columns=['role', 'email', 'saldo_ferias'], errors='ignore').copy()


def adicionar_features_jornada(df_score, df_diferenca, data_ref):
    """Calcula horas extras, faltas e atrasos do último mês e trimestre."""
    df = df_diferenca.copy()
    df['data'] = pd.to_datetime(df['data'])
    
    # Recortes de tempo dinâmicos
    primeiro_dia_mes_atual = data_ref.replace(day=1)
    ultimo_dia_mes_anterior = primeiro_dia_mes_atual - pd.Timedelta(days=1)
    primeiro_dia_mes_anterior = ultimo_dia_mes_anterior.replace(day=1)
    primeiro_dia_trimestre = primeiro_dia_mes_atual - pd.DateOffset(months=3)
    
    df_mes = df[(df['data'] >= primeiro_dia_mes_anterior) & (df['data'] <= ultimo_dia_mes_anterior)]
    df_tri = df[(df['data'] >= primeiro_dia_trimestre) & (df['data'] <= ultimo_dia_mes_anterior)]

    # Cálculos
    faltas = df_mes[df_mes['diferenca_minutos'] == -480].groupby('usuario_id').size()
    extras = df_mes[df_mes['diferenca_minutos'] > 0].groupby('usuario_id')['diferenca_minutos'].sum() / 60

    cond_atraso_mes = (df_mes['diferenca_minutos'] <= -15) & (df_mes['diferenca_minutos'] != -480)
    qtd_atrasos = df_mes[cond_atraso_mes].groupby('usuario_id').size()
    horas_atraso = df_mes[cond_atraso_mes].groupby('usuario_id')['diferenca_minutos'].sum().abs() / 60

    cond_atraso_tri = (df_tri['diferenca_minutos'] <= -15) & (df_tri['diferenca_minutos'] != -480)
    media_atrasos_tri = df_tri[cond_atraso_tri].groupby('usuario_id').size() / 3

    # Mapeamento
    df_score['faltas_ultimo_mes'] = df_score['id'].map(faltas).fillna(0).astype(int)
    df_score['horas_extras_ultimo_mes'] = df_score['id'].map(extras).fillna(0).round(2)
    df_score['qtd_atrasos_ultimo_mes'] = df_score['id'].map(qtd_atrasos).fillna(0).astype(int)
    df_score['horas_atraso_ultimo_mes'] = df_score['id'].map(horas_atraso).fillna(0).round(2)
    df_score['media_atrasos_trimestre'] = df_score['id'].map(media_atrasos_tri).fillna(0).round(2)
    
    return df_score


def adicionar_features_saude(df_score, df_atestados_final, data_ref):
    """Calcula frequência de atestados no mês e trimestre."""
    df = df_atestados_final.copy()
    df['data'] = pd.to_datetime(df['data'])
    
    primeiro_dia_mes_atual = data_ref.replace(day=1)
    ultimo_dia_mes_anterior = primeiro_dia_mes_atual - pd.Timedelta(days=1)
    primeiro_dia_mes_anterior = ultimo_dia_mes_anterior.replace(day=1)
    primeiro_dia_trimestre = primeiro_dia_mes_atual - pd.DateOffset(months=3)
    
    df_mes = df[(df['data'] >= primeiro_dia_mes_anterior) & (df['data'] <= ultimo_dia_mes_anterior)]
    df_tri = df[(df['data'] >= primeiro_dia_trimestre) & (df['data'] <= ultimo_dia_mes_anterior)]

    contagem_mes = df_mes.groupby('usuario_id').size()
    contagem_tri = df_tri.groupby('usuario_id').size()

    df_score['ausencias_atestado_ultimo_mes'] = df_score['id'].map(contagem_mes).fillna(0).astype(int)
    df_score['media_ausencia_atestado_trimestre'] = (df_score['id'].map(contagem_tri).fillna(0) / 3).round(2)
    
    return df_score


def adicionar_features_ferias(df_score, df_historico):
    """Faz o merge do saldo de férias calculado no df_score."""
    
    # df_historico_resumo é o retorno da função acima (df_final[['usuario_id', 'tempo_meses_ultimas_férias']])
    
    # 1. Merge
    df_score = df_score.merge(
        df_historico, 
        left_on='id', 
        right_on='usuario_id', 
        how='left', 
        suffixes=('', '_novo')
    )
    
    # 2. Limpeza e atribuição
    # Se por acaso o merge gerou NaN (funcionário novo que não estava no df_ferias), preenche com 0
    df_score['tempo_meses_ultimas_férias'] = df_score['tempo_meses_ultimas_férias'].fillna(0)
    
    # 3. Remove coluna redundante caso o merge tenha criado
    if 'usuario_id' in df_score.columns:
        df_score = df_score.drop(columns=['usuario_id'])
    
    return df_score



def adicionar_features_promocoes(df_score, df_tempo_promocoes, data_ref):
    """Calcula quantidade de promoções e tempo estagnado no cargo atual."""
    df = df_tempo_promocoes.copy()
    df['data_alteracao'] = pd.to_datetime(df['data_alteracao'])
    
    df_apenas_promocoes = df[df['motivo'] == 'Promoção']
    contagem_promocoes = df_apenas_promocoes.groupby('usuario_id').size()
    df_score['qtt_promocoes'] = df_score['id'].map(contagem_promocoes).fillna(0).astype(int)

    df_prom_ordenado = df.sort_values(by=['usuario_id', 'data_alteracao'])
    ultima_movimentacao = df_prom_ordenado.drop_duplicates(subset=['usuario_id'], keep='last').copy()
    ultima_movimentacao['meses_no_cargo_atual'] = ((data_ref - ultima_movimentacao['data_alteracao']).dt.days / 30.4).round(1)

    df_score['tempo_ultima_promocao' \
    ''] = df_score['id'].map(
        ultima_movimentacao.set_index('usuario_id')['meses_no_cargo_atual']
    )
    return df_score


def adicionar_features_educacao(df_score, df_compromisso, df_proatividade, data_ref):
    """Agrupa o comportamento de estudo (obrigatório e opcional)."""
    dois_anos_atras = data_ref - pd.DateOffset(years=2)
    
    # Obrigatórios
    df_comp = df_compromisso.copy()
    df_comp['data_conclusao'] = pd.to_datetime(df_comp['data_conclusao'])
    df_comp_2anos = df_comp[df_comp['data_conclusao'] >= dois_anos_atras]

    vencidos = df_comp_2anos[df_comp_2anos['comportamento_prazo'].str.contains('Deixou vencer', na=False)].groupby('usuario_id').size()
    no_prazo = df_comp_2anos[df_comp_2anos['comportamento_prazo'].str.contains('Perto de vencer', na=False)].groupby('usuario_id').size()
    adiantados = df_comp_2anos[df_comp_2anos['comportamento_prazo'].str.contains('Muito rápido', na=False)].groupby('usuario_id').size()

    df_score['cursos_obg_vencidos'] = df_score['id'].map(vencidos).fillna(0).astype(int)
    df_score['cursos_obg_no_prazo'] = df_score['id'].map(no_prazo).fillna(0).astype(int)
    df_score['cursos_obg_adiantados'] = df_score['id'].map(adiantados).fillna(0).astype(int)

    # Opcionais (Proatividade)
    df_proat = df_proatividade.copy()
    df_proat['data_conclusao'] = pd.to_datetime(df_proat['data_conclusao'])
    df_proat_2anos = df_proat[df_proat['data_conclusao'] >= dois_anos_atras]
    
    contagem_opcionais = df_proat_2anos.groupby('usuario_id').size()
    df_score['qtt_cursos_opcioanis_2anos'] = df_score['id'].map(contagem_opcionais).fillna(0).astype(int)
    
    return df_score


def adicionar_features_pulse(df_score, df_pulse):
    """Traz o contexto qualitativo (humor e sentimento)."""
    colunas_pulse = ['usuario_id', 'score_humor', 'sentimento_predominante', 'resumo_ia']
    df_pulse_reduzido = df_pulse[colunas_pulse].copy()
    
    df_score = df_score.merge(df_pulse_reduzido, left_on='id', right_on='usuario_id', how='left')
    if 'usuario_id' in df_score.columns:
        df_score = df_score.drop(columns=['usuario_id'])
        
    return df_score


# ==========================================
# 2. ORQUESTRADOR DE FEATURE ENGINEERING
# ==========================================

def orquestrar_feature_engineering(df_usuarios, dict_tabelas_transformadas):
    """
    Recebe os dados dos usuários e o dicionário de tabelas transformadas gerado
    pelo 'orquestrar_etl_transformacao'. Retorna a Matriz de Features (df_score) pronta.
    """
    print("Iniciando construção da Feature Matrix (df_score)...")
    data_referencia = pd.to_datetime('2026-05-29') # Garantindo o recorte do seu cenário
    
    # 0. Base
    df_score = iniciar_df_score(df_usuarios)
    
    # 1. Jornada
    df_score = adicionar_features_jornada(df_score, dict_tabelas_transformadas['df_diferenca'], data_referencia)
    
    # 2. Saúde
    df_score = adicionar_features_saude(df_score, dict_tabelas_transformadas['df_atestados_final'], data_referencia)
    
    # 3. Férias
    df_score = adicionar_features_ferias(df_score, dict_tabelas_transformadas['df_historico_ferias'])
    
    # 4. Promoções
    df_score = adicionar_features_promocoes(df_score, dict_tabelas_transformadas['df_tempo_promocoes'], data_referencia)
    
    # 5. Educação (Cursos)
    df_score = adicionar_features_educacao(
        df_score, 
        dict_tabelas_transformadas['df_compromisso'], 
        dict_tabelas_transformadas['df_proatividade'], 
        data_referencia
    )
    
    # 6. Pulse
    df_score = adicionar_features_pulse(df_score, dict_tabelas_transformadas['df_pulse'])
    
    print(f"Feature Matrix construída com sucesso! ({df_score.shape[0]} funcionários x {df_score.shape[1]} features)")
    
    return df_score


import pandas as pd
import numpy as np

def calcular_scores_heuristicos(df_score_input):
    df = df_score_input.copy()
    
    # Listas para armazenar os scores calculados
    burnout_scores = []
    turnover_scores = []
    engajamento_scores = []
    promocao_scores = []
    
    for _, row in df.iterrows():
        # --- 1. SCORE DE BURNOUT ---
        b_score = 0
        
        # Férias
        if row['tempo_meses_ultimas_férias'] > 19: b_score += 40
        elif row['tempo_meses_ultimas_férias'] > 16: b_score += 20
        
        # Atestados
        if row['ausencias_atestado_ultimo_mes'] >= 5: b_score += 40
        elif 3 <= row['media_ausencia_atestado_trimestre'] <= 5: b_score += 20
        
        # Horas Extras
        if row['horas_extras_ultimo_mes'] > 22: b_score += 30
        elif row['horas_extras_ultimo_mes'] > 12: b_score += 15
        
        # Pulse (Tratando possíveis nulos com o .get ou condicionais simples)
        sentimento = str(row['sentimento_predominante']).lower()
        if sentimento in ['frustrado', 'cansado', 'exausto'] or row['score_humor'] < 40:
            b_score += 20
            
        b_score = min(100, max(0, b_score))
        burnout_scores.append(b_score)
        
        # --- 2. SCORE DE TURNOVER ---
        t_score = 0
        
        # Atrasos e Faltas
        if row['horas_atraso_ultimo_mes'] > 8: t_score += 30
        if row['faltas_ultimo_mes'] >= 2: t_score += 30
        if row['media_atrasos_trimestre'] > 10: t_score += 20
        
        # Cursos Obrigatórios Vencidos
        if row['cursos_obg_vencidos'] > 0: t_score += 30
        
        # Estagnação (Usando a métrica de meses calculada)
        if row['tempo_ultima_promocao'] > 36: t_score += 40
        elif row['tempo_ultima_promocao'] > 24: t_score += 20
        
        # Pulse
        if row['score_humor'] < 40: t_score += 20
            
        t_score = min(100, max(0, t_score))
        turnover_scores.append(t_score)
        
        # --- 3. SCORE DE ENGAJAMENTO ---
        e_score = 0
        
        # Cursos Obrigatórios
        if row['cursos_obg_adiantados'] > 0: e_score += 30
        if row['cursos_obg_vencidos'] > 0: e_score -= 30
        
        # Cursos Opcionais
        if row['qtt_cursos_opcioanis_2anos'] >= 1: e_score += 40
        
        # Pontualidade
        if row['qtd_atrasos_ultimo_mes'] == 0: e_score += 20
        
        # Pulse
        if sentimento == 'animado' or row['score_humor'] > 70: e_score += 20
            
        e_score = min(100, max(0, e_score))
        engajamento_scores.append(e_score)
        
        # --- 4. SCORE DE ELEGIBILIDADE PARA PROMOÇÃO ---
        # Regra de Trava: Menos de 12 meses no cargo atual = Chance Zero
        if row['tempo_ultima_promocao'] < 12:
            p_score = 0
        else:
            p_score = 0
            # Tempo de Maturidade (Sweet Spot)
            if 18 <= row['tempo_ultima_promocao'] <= 30: p_score += 40
            
            # Proatividade (Cursos opcionais)
            if row['qtt_cursos_opcioanis_2anos'] > 0: p_score += 30
            
            # Engajamento Base (Pega o score calculado na mesma linha)
            if e_score > 70: p_score += 30
            
            # Redutores (Penalidade por falhar no básico)
            if row['cursos_obg_vencidos'] > 0: p_score -= 20
            
            # Penalidade se Turnover ou Burnout estiverem críticos (> 70)
            if b_score > 70 or t_score > 70:
                p_score -= 30  # Penalização pesada por risco organizacional
                
        p_score = min(100, max(0, p_score))
        promocao_scores.append(p_score)
        
    # Injetando as colunas calculadas de volta no DataFrame
    df['score_burnout'] = burnout_scores
    df['score_turnover'] = turnover_scores
    df['score_engajamento'] = engajamento_scores
    df['score_elegibilidade_promocao'] = promocao_scores
    
    return df