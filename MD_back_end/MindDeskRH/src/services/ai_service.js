const axios = require('axios');

// AGORA APONTA PARA O ORQUESTRADOR (Porta 8050)
const ORQUESTRADOR_URL = "http://host.docker.internal:8050/api/v1/orchestrate";

exports.askAI = async (messageData) => {
    try {
        const response = await axios.post(ORQUESTRADOR_URL, {
            query: messageData.query,
            tenant_id: messageData.tenant_id,
            
            // ATENÇÃO AQUI: Mudado para 'usuario_id' para bater com o Pydantic do Python
            usuario_id: messageData.usuario_id, 
            role: messageData.role,
            current_agent: messageData.current_agent,

            // Chaves secretas que vão trafegar "escondidas"
            openai_api_key: process.env.OPENAI_API_KEY,
            supabase_url: process.env.SUPABASE_URL,
            supabase_key: process.env.SUPABASE_SERVICE_KEY
        });

        // Retorna a resposta do Python (Que contém { answer, new_agent, action })
        return response.data;
    } catch (error) {
        console.error("====== ERRO COMPLETO DO AXIOS ======");
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Dados:", error.response.data);
        } else if (error.request) {
            console.error("Nenhuma resposta do Python. Request:", error.request);
        } else {
            console.error("Erro interno do Node:", error.message);
        }
        console.error("====================================");

        throw new Error("A IA está fora do ar ou o endereço está incorreto.");
    }
};