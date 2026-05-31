from fastapi import APIRouter
from app.services.service import executar_carga_people_analytics

router = APIRouter()

@router.post("/people-analytics/processar")
def processar_people_analytics():

    return executar_carga_people_analytics()