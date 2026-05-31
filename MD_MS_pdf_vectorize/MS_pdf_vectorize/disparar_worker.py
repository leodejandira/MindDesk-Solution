import requests

WORKER_URL = "http://localhost:8005/api/process-pdf"
SUPABASE_URL = "https://bwspyzsllpmrskrecaen.supabase.co/"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3c3B5enNsbHBtcnNrcmVjYWVuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDY0NzQ5NSwiZXhwIjoyMDkwMjIzNDk1fQ.Q4jytUe39UJjOfzJZLosRlI7B1xDqP5_bpXHpiR19JI"
LINK_VIEW = "https://drive.google.com/file/d/1Kq-R6eWTYbq2KuNRu8kqCYiBz8cQPyVm/view?usp=sharing"

# Extrai o ID e monta o link de download direto
file_id = LINK_VIEW.split("/d/")[1].split("/")[0]
direct_download_url = f"https://drive.google.com/uc?export=download&id={file_id}"

payload = {
    "pdf_url": direct_download_url,
    "pdf_id": 101,
    "tenant_id": 1,
    "supabase_url": SUPABASE_URL,
    "supabase_key": SUPABASE_KEY
}

try:
    response = requests.post(WORKER_URL, json=payload, timeout=90)
    response.raise_for_status()
    print("Sucesso:", response.json())
except Exception as e:
    print("Erro na execução:", e)