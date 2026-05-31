import pandas as pd
from supabase import create_client, Client
import warnings

from app.services.extract import supabase

def inserir_people_analytics(df):

    registros = df.to_dict(orient="records")

    resposta = (
        supabase
        .table("people_analytics")
        .insert(registros)
        .execute()
    )

    print(
        f"[INFO] {len(registros)} registros inseridos "
        f"em people_analytics"
    )

    return resposta