import pandas as pd
from openai import OpenAI

# Hardcoded key conforme solicitado
import os
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=OPENAI_API_KEY)

def gerar_analise_funcionario(row):
    """Monta o prompt e chama a IA para um funcionário específico."""
    prompt = f"""
    Analise o perfil do funcionário abaixo e forneça uma recomendação de gestão curta (máx 2 frases).
    Foque em riscos de turnover/burnout e engajamento.
    
    Nome: {row['nome']}
    Cargo: {row['cargo']}
    Score Burnout: {row['score_burnout']}
    Score Turnover: {row['score_turnover']}
    Score Engajamento: {row['score_engajamento']}
    Tempo desde última promoção: {row['tempo_ultima_promocao']} meses
    Sentimento: {row['sentimento_predominante']}
    
    Recomendação:
    """
    
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo", # Ou gpt-4o
            messages=[{"role": "user", "content": prompt}],
            max_tokens=100
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        return f"Erro na análise IA: {str(e)}"

def processar_analise_ia(df_score):
    """Itera o DF, chama a IA e preenche 'analise_pa'."""
    print("Iniciando processamento de IA...")
    
    # Aplica a função de IA em cada linha
    df_score['analise_pa'] = df_score.apply(gerar_analise_funcionario, axis=1)
    
    print("Análise IA concluída.")
    return df_score