from datetime import datetime
import pandas as pd

from app.services.extract import *
from app.services.transform import *
from app.services.load import *
from app.services.analise_ia import processar_analise_ia

def obter_mes_referencia():

    meses = {
        1: "janeiro",
        2: "fevereiro",
        3: "março",
        4: "abril",
        5: "maio",
        6: "junho",
        7: "julho",
        8: "agosto",
        9: "setembro",
        10: "outubro",
        11: "novembro",
        12: "dezembro"
    }

    hoje = datetime.today()

    if hoje.month == 1:
        mes_num = 12
        ano_ref = hoje.year - 1
    else:
        mes_num = hoje.month - 1
        ano_ref = hoje.year

    return meses[mes_num], ano_ref


def verificar_mes_referencia_people_analytics():

    mes_referencia, ano_ref = obter_mes_referencia()

    resposta = (
        supabase
        .table("people_analytics")
        .select("id")
        .eq("mes_referencia", mes_referencia)
        .limit(1)
        .execute()
    )

    if resposta.data:
        print(
            f"[INFO] Já existem registros para "
            f"{mes_referencia}/{ano_ref}"
        )
        return True

    print(
        f"[INFO] Não existem registros para "
        f"{mes_referencia}/{ano_ref}"
    )

    return False



def executar_carga_people_analytics():

    if verificar_mes_referencia_people_analytics():

        return {
            "status": "skipped",
            "message": "Mês já processado"
        }

    mes_referencia, ano_ref = obter_mes_referencia()

    tabelas_brutas = carregar_tabelas()

    df_ferias = tabelas_brutas['ferias']

    tabelas_transformadas = orquestrar_etl_transformacao(
        tabelas_brutas
    )

    df_score_final = orquestrar_feature_engineering(
        tabelas_brutas["usuarios"],
        tabelas_transformadas
    )

    df_analise_final = calcular_scores_heuristicos(
        df_score_final
    )

    # df_analise_final["analise_pa"] = None

    df_analise_final = processar_analise_ia(df_analise_final)

    
    df_analise_final["mes_referencia"] = mes_referencia

    df_analise_final = df_analise_final.where(
        pd.notnull(df_analise_final),
        None
    )

    for col in df_analise_final.columns:

        if pd.api.types.is_datetime64_any_dtype(
            df_analise_final[col]
        ):
            df_analise_final[col] = (
                df_analise_final[col]
                .dt.strftime("%Y-%m-%d")
            )

    df_analise_final = df_analise_final.rename(
        columns={"id": "usuario_id"}
    )

    inserir_people_analytics(
        df_analise_final
    )

    return {
        "status": "processed",
        "mes_referencia": mes_referencia,
        "ano": ano_ref,
        "registros": len(df_analise_final)
    }