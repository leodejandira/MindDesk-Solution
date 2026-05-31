from fastapi import FastAPI
import logging
from api.routes import router as pulse_router

logging.basicConfig(level=logging.INFO)
app = FastAPI(title="MindDesk - Agente Pulse (Humanograma)", version="1.0.0")
app.include_router(pulse_router, prefix="/api/v1")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)