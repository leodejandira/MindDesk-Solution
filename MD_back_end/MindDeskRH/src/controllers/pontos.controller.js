const supabase = require('../config/supabase');
const jwt = require('jsonwebtoken');

// Gera o código temporário para o QR Code
exports.getTicketPonto = async (req, res) => {
    try {
        const usuario_id = req.user.id;
        const ticket = jwt.sign(
            { usuario_id, type: 'ponto' }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1m' } 
        );
        return res.json({ ticket });
    } catch (err) {
        return res.status(500).json({ error: 'Erro ao gerar ticket.' });
    }
};

// Registra ponto validando o ticket
exports.registrarPonto = async (req, res) => {
    const { ticket } = req.body;
    if (!ticket) return res.status(400).json({ error: 'Ticket é obrigatório.' });

    try {
        const decoded = jwt.verify(ticket, process.env.JWT_SECRET);
        const usuario_id = decoded.usuario_id;
        
        // ... (Aqui entra sua lógica de busca de usuário e inserção que você já tem)
        return res.status(201).json({ message: "Ponto registrado com sucesso" });
    } catch (err) {
        return res.status(401).json({ error: 'QR Code inválido ou expirado.' });
    }
};

// ESSA FUNÇÃO ESTAVA FALTANDO NO SEU ARQUIVO DE CONTROLLER
exports.listarPontos = async (req, res) => {
    const { usuario_id } = req.query;
    if (!usuario_id) return res.status(400).json({ error: 'usuario_id é obrigatório.' });

    const { data, error } = await supabase
        .from('pontos')
        .select('*')
        .eq('usuario_id', usuario_id)
        .order('horario', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
};

// =====================================================================
// PONTO COM SELFIE + GEOLOCALIZAÇÃO (auditoria pelo gerente)
// =====================================================================

const { createClient } = require('@supabase/supabase-js');

// Cliente próprio para estas rotas: o cliente compartilhado (config/supabase.js) recebe a sessão
// do último login (auth.signInWithPassword) e passa a agir como aquele usuário, o que faz o
// Storage privado recusar o upload por RLS. Este cliente nunca faz login: age sempre como service_role.
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
});

const TIPOS_PONTO = ['entrada', 'almoco', 'retorno_almoco', 'saida'];
const BUCKET_PONTOS = 'pontos';
const PRECISAO_MAXIMA_METROS = 100;

// Distância em metros entre duas coordenadas (fórmula de Haversine).
function distanciaMetros(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const rad = (g) => (g * Math.PI) / 180;
    const dLat = rad(lat2 - lat1);
    const dLon = rad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
}

// Início e fim do dia atual no fuso de Brasília (sem horário de verão desde 2019).
function intervaloHojeBrasilia() {
    const dia = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
    return { inicio: `${dia}T00:00:00-03:00`, fim: `${dia}T23:59:59.999-03:00` };
}

// POST /pontos/selfie  (multipart: foto, latitude, longitude, precisao, mocked)
exports.registrarPontoSelfie = async (req, res) => {
    const usuario_id = req.user.id;
    const tenant_id = req.user.tenant_id;
    const latitude = Number(req.body.latitude);
    const longitude = Number(req.body.longitude);
    const precisao = req.body.precisao !== undefined ? Number(req.body.precisao) : null;
    const localizacaoFalsa = req.body.mocked === 'true';

    if (!req.file) return res.status(400).json({ error: 'A selfie é obrigatória.' });
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180)
        return res.status(400).json({ error: 'Localização inválida.' });

    try {
        // 1. Qual marcação é esta? (entrada → almoço → retorno → saída)
        const { inicio, fim } = intervaloHojeBrasilia();
        const { count, error: countError } = await supabaseAdmin
            .from('pontos')
            .select('id', { count: 'exact', head: true })
            .eq('usuario_id', usuario_id)
            .neq('status_validacao', 'rejeitado')
            .gte('horario', inicio)
            .lte('horario', fim);
        if (countError) throw countError;
        if (count >= TIPOS_PONTO.length)
            return res.status(409).json({ error: 'Todas as marcações de hoje já foram registradas.' });
        const tipo = TIPOS_PONTO[count];

        // 2. Local de trabalho mais próximo do tenant.
        const { data: locais, error: locaisError } = await supabaseAdmin
            .from('locais_trabalho')
            .select('id, nome, latitude, longitude, raio_metros')
            .eq('tenant_id', tenant_id)
            .eq('ativo', true);
        if (locaisError) throw locaisError;

        let local = null;
        let distancia = null;
        for (const l of locais || []) {
            const d = distanciaMetros(latitude, longitude, l.latitude, l.longitude);
            if (distancia === null || d < distancia) { local = l; distancia = d; }
        }

        // 3. Regras: qualquer dúvida vai para revisão do gerente (nada é recusado automaticamente).
        const motivos = [];
        if (!local) motivos.push('Nenhum local de trabalho cadastrado');
        else if (distancia > local.raio_metros) motivos.push(`Fora do raio de ${local.nome} (${Math.round(distancia)} m)`);
        if (precisao !== null && precisao > PRECISAO_MAXIMA_METROS) motivos.push(`GPS impreciso (±${Math.round(precisao)} m)`);
        if (localizacaoFalsa) motivos.push('Localização possivelmente falsa');
        const status_validacao = motivos.length ? 'pendente_revisao' : 'aprovado';

        // 4. Selfie no bucket privado.
        const caminhoFoto = `${tenant_id}/${usuario_id}/${Date.now()}.jpg`;
        const { error: uploadError } = await supabaseAdmin.storage
            .from(BUCKET_PONTOS)
            .upload(caminhoFoto, req.file.buffer, { contentType: req.file.mimetype || 'image/jpeg' });
        if (uploadError) throw uploadError;

        // 5. Registro do ponto.
        const { data: ponto, error: insertError } = await supabaseAdmin
            .from('pontos')
            .insert({
                tenant_id,
                usuario_id,
                horario: new Date().toISOString(),
                tipo,
                observacao: motivos.join('; ') || null,
                latitude,
                longitude,
                precisao_metros: precisao,
                local_trabalho_id: local ? local.id : null,
                distancia_metros: distancia !== null ? Math.round(distancia) : null,
                localizacao_falsa: localizacaoFalsa,
                metodo: 'selfie',
                foto_url: caminhoFoto,
                status_validacao,
            })
            .select('id, horario, tipo, status_validacao, distancia_metros, observacao')
            .single();
        if (insertError) {
            await supabaseAdmin.storage.from(BUCKET_PONTOS).remove([caminhoFoto]); // não deixa foto órfã
            throw insertError;
        }

        return res.status(201).json({ ...ponto, local: local ? local.nome : null });
    } catch (err) {
        console.error('Erro ao registrar ponto com selfie:', err.message);
        return res.status(500).json({ error: 'Erro ao registrar ponto.' });
    }
};

// GET /pontos/locais
exports.listarLocais = async (req, res) => {
    const { data, error } = await supabaseAdmin
        .from('locais_trabalho')
        .select('*')
        .eq('tenant_id', req.user.tenant_id)
        .eq('ativo', true)
        .order('nome');
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
};

// POST /pontos/locais  (admin)  { nome, latitude, longitude, raio_metros }
exports.criarLocal = async (req, res) => {
    const { nome } = req.body;
    const latitude = Number(req.body.latitude);
    const longitude = Number(req.body.longitude);
    const raio_metros = Number(req.body.raio_metros) || 150;

    if (!nome || !String(nome).trim()) return res.status(400).json({ error: 'Nome do local é obrigatório.' });
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180)
        return res.status(400).json({ error: 'Localização inválida.' });
    if (raio_metros < 10 || raio_metros > 5000) return res.status(400).json({ error: 'O raio deve ficar entre 10 e 5000 metros.' });

    const { data, error } = await supabaseAdmin
        .from('locais_trabalho')
        .insert({ tenant_id: req.user.tenant_id, nome: String(nome).trim(), latitude, longitude, raio_metros })
        .select()
        .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
};

// DELETE /pontos/locais/:id  (admin) — desativa, para não quebrar o histórico de pontos
exports.desativarLocal = async (req, res) => {
    const { error } = await supabaseAdmin
        .from('locais_trabalho')
        .update({ ativo: false })
        .eq('id', req.params.id)
        .eq('tenant_id', req.user.tenant_id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ message: 'Local removido.' });
};

// GET /pontos/revisao?status=pendente_revisao  (admin)
exports.listarRevisao = async (req, res) => {
    const status = req.query.status || 'pendente_revisao';
    if (!['aprovado', 'pendente_revisao', 'rejeitado'].includes(status))
        return res.status(400).json({ error: 'Status inválido.' });

    const { data, error } = await supabaseAdmin
        .from('pontos')
        .select('id, usuario_id, horario, tipo, observacao, latitude, longitude, precisao_metros, distancia_metros, localizacao_falsa, foto_url, status_validacao, usuarios(nome, cargo), locais_trabalho(nome)')
        .eq('tenant_id', req.user.tenant_id)
        .eq('metodo', 'selfie')
        .eq('status_validacao', status)
        .order('horario', { ascending: false })
        .limit(100);
    if (error) return res.status(500).json({ error: error.message });

    // Links temporários (1h) para as selfies do bucket privado.
    const caminhos = data.map((p) => p.foto_url).filter(Boolean);
    let links = {};
    if (caminhos.length) {
        const { data: assinados, error: signError } = await supabaseAdmin.storage
            .from(BUCKET_PONTOS)
            .createSignedUrls(caminhos, 3600);
        if (signError) return res.status(500).json({ error: signError.message });
        links = Object.fromEntries(assinados.filter((s) => s.signedUrl).map((s) => [s.path, s.signedUrl]));
    }

    return res.json(data.map(({ foto_url, ...p }) => ({ ...p, foto: links[foto_url] || null })));
};

// PATCH /pontos/:id/validacao  (admin)  { status: 'aprovado' | 'rejeitado' }
exports.validarPonto = async (req, res) => {
    const { status } = req.body;
    if (!['aprovado', 'rejeitado'].includes(status))
        return res.status(400).json({ error: 'Status deve ser "aprovado" ou "rejeitado".' });

    const { data, error } = await supabaseAdmin
        .from('pontos')
        .update({ status_validacao: status })
        .eq('id', req.params.id)
        .eq('tenant_id', req.user.tenant_id)
        .eq('metodo', 'selfie')
        .select('id, status_validacao');
    if (error) return res.status(500).json({ error: error.message });
    if (!data.length) return res.status(404).json({ error: 'Ponto não encontrado.' });
    return res.json(data[0]);
};

exports._distanciaMetros = distanciaMetros; // exportado só para teste
