const supabase = require('../config/supabase');

exports.listarAtestados = async (req, res) => {
    const { tenant_id, usuario_id } = req.query;
    
    // Pega o cargo do usuário que fez a requisição (geralmente vem no req.user do seu authMiddleware)
    const isGerente = req.user.cargo === 'gerente' || req.user.role === 'admin'; 

    if (!tenant_id)
        return res.status(400).json({ error: 'tenant_id é obrigatório.' });

    let query = supabase
        .from('atestados')
        .select('*')
        .eq('tenant_id', tenant_id);

    // BLINDAGEM: Se NÃO for gerente, ele é obrigado a ver apenas os próprios dados, 
    // mesmo que tente passar o ID de outro colega na URL.
    if (!isGerente) {
        query = query.eq('usuario_id', req.user.id);
    } 
    // Se for gerente e quiser filtrar um funcionário específico:
    else if (usuario_id) {
        query = query.eq('usuario_id', usuario_id);
    }

    const { data, error } = await query;

    if (error) return res.status(500).json({ error: error.message });

    return res.json(data);
};

exports.uploadAtestado = async (req, res) => {
    const { tenant_id, usuario_id, data_emissao, dias_afastamento, motivo_cid } = req.body;

    if (!req.file || !tenant_id || !usuario_id || !data_emissao || !dias_afastamento)
        return res.status(400).json({ error: 'Arquivo, tenant_id, usuario_id, data_emissao e dias_afastamento são obrigatórios.' });

    // CORREÇÃO 3: Limpando espaços e caracteres especiais do nome do arquivo
    const nomeOriginalLimpo = req.file.originalname.replace(/\s+/g, '_');
    const nomeArquivo = `${Date.now()}_${nomeOriginalLimpo}`;

    // CORREÇÃO 2: Usando o mimetype dinâmico do arquivo (aceita PDF, JPG, PNG sem corromper)
    const { error: uploadError } = await supabase.storage
        .from('atestados')
        .upload(nomeArquivo, req.file.buffer, { contentType: req.file.mimetype });

    if (uploadError) return res.status(500).json({ error: uploadError.message });

    const { data: urlData } = supabase.storage
        .from('atestados')
        .getPublicUrl(nomeArquivo);

    const { error: dbError } = await supabase.from('atestados').insert({
        tenant_id,
        usuario_id,
        data_emissao,
        dias_afastamento,
        motivo_cid: motivo_cid || null,
        url_arquivo: urlData.publicUrl,
        // CORREÇÃO 1: Entra como 'pendente' aguardando validação do RH.
        // Se você não tiver uma tela de aprovação do RH ainda, mude para 'aprovado'
        status: 'pendente' 
    });

    if (dbError) return res.status(500).json({ error: dbError.message });

    return res.status(201).json({ message: 'Atestado enviado com sucesso!', url: urlData.publicUrl });
};

exports.deletarAtestado = async (req, res) => {
    const { id } = req.params;

    const { data: doc, error: fetchError } = await supabase
        .from('atestados')
        .select('*')
        .eq('id', id)
        .single();

    if (fetchError || !doc)
        return res.status(404).json({ error: 'Atestado não encontrado.' });

    // Pega o nome do arquivo da URL para deletar do bucket
    const nomeArquivo = doc.url_arquivo.split('/').pop();

    await supabase.storage.from('atestados').remove([nomeArquivo]);

    const { error: dbError } = await supabase
        .from('atestados')
        .delete()
        .eq('id', id);

    if (dbError) return res.status(500).json({ error: dbError.message });

    return res.json({ message: 'Atestado deletado com sucesso.' });
};

// Buscar todos os atestados com status 'pendente'
exports.listarPendentes = async (req, res) => {
    try {
        // Supondo que você use o cliente do Supabase no backend
        const { data, error } = await supabase
            .from('atestados')
            .select(`
                *,
                usuarios (nome, cargo) 
            `) // Faz um join para pegar o nome do Lucas!
            .eq('status', 'pendente')
            .order('data_emissao', { ascending: false });

        if (error) throw error;

        return res.status(200).json(data);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erro ao buscar atestados pendentes.' });
    }
};

// Aprovar ou Recusar o atestado
exports.atualizarStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // Vai receber 'aprovado' ou 'recusado'

    try {
        const { data, error } = await supabase
            .from('atestados')
            .update({ status })
            .eq('id', id)
            .select();

        if (error) throw error;

        return res.status(200).json({ message: `Atestado atualizado para ${status}!` });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erro ao atualizar o atestado.' });
    }
};