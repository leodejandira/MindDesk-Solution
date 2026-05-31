# Usa uma imagem oficial e leve do Python
FROM python:3.9-slim

# Define o diretório de trabalho dentro do contêiner
WORKDIR /app

# Instala as dependências do sistema necessárias para compilar algumas bibliotecas
RUN apt-get update && apt-get install -y gcc g++ && rm -rf /var/lib/apt/lists/*

# Copia os arquivos de dependência e instala
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia o resto do código
COPY . .

# Expõe a porta do FastAPI
EXPOSE 8000

# hadolint ignore=DL3033,DL3018,DL3013
RUN pip3 install --no-cache-dir opentelemetry-distro opentelemetry-exporter-otlp && \
    opentelemetry-bootstrap -a install

ENV OTEL_PYTHON_LOGGING_AUTO_INSTRUMENTATION_ENABLED=true \
    OTEL_SERVICE_NAME=pmo-anomalias-orquestrador-flower-regular \
    OTEL_PYTHON_EXCLUDED_URLS="health,metrics"

CMD ["opentelemetry-instrument", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]