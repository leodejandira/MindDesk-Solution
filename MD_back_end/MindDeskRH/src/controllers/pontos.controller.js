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