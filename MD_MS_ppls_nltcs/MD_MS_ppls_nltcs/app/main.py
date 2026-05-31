from app.services.service import executar_carga_people_analytics
from app.routes.people_analytics import router
from fastapi import FastAPI
from app.routes.people_analytics import router

app = FastAPI()

app.include_router(router)

@router.post("/people-analytics/processar")
def processar_people_analytics():

    return executar_carga_people_analytics()