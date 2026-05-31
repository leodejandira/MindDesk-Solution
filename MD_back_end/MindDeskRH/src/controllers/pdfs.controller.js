const supabase = require('../config/supabase');

exports.listarPdfs = async (req, res) => {
    const { tenant_id } = req.query;

    if (!tenant_id)
        return res.status(400).json({ error: 'tenant_id é obrigatório.' });

    const { data, error } = await supabase
        .from('pdfs')
        .select('*')
        .eq('tenant_id', tenant_id);

    if (error) return res.status(500).json({ error: error.message });

    return res.json(data);
};

exports.uploadPdf = async (req, res) => {
    const { tenant_id } = req.body;

    if (!req.file || !tenant_id)
        return res.status(400).json({ error: 'Arquivo e tenant_id são obrigatórios.' });

    const nomeArquivo = `${Date.now()}_${req.file.originalname}`;

    const { error: uploadError } = await supabase.storage
        .from('pdfs')
        .upload(nomeArquivo, req.file.buffer, { contentType: 'application/pdf' });

    if (uploadError) return res.status(500).json({ error: uploadError.message });

    const { data: urlData } = supabase.storage
        .from('pdfs')
        .getPublicUrl(nomeArquivo);

    const { error: dbError } = await supabase.from('pdfs').insert({
        tenant_id,
        nome: req.file.originalname,
        url: urlData.publicUrl
    });

    if (dbError) return res.status(500).json({ error: dbError.message });

    return res.status(201).json({ message: 'PDF enviado com sucesso!', url: urlData.publicUrl });
};

exports.deletarPdf = async (req, res) => {
    const { id } = req.params;

    const { data: doc, error: fetchError } = await supabase
        .from('pdfs')
        .select('*')
        .eq('id', id)
        .single();

    if (fetchError || !doc)
        return res.status(404).json({ error: 'Documento não encontrado.' });

    const nomeArquivo = doc.url.split('/').pop();

    await supabase.storage.from('pdfs').remove([nomeArquivo]);

    const { error: dbError } = await supabase
        .from('pdfs')
        .delete()
        .eq('id', id);

    if (dbError) return res.status(500).json({ error: dbError.message });

    return res.json({ message: 'PDF deletado com sucesso!' });
};