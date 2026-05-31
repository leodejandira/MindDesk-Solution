const express = require('express')
const router = express.Router()
const supabase = require('../config/supabase')
const jwt = require('jsonwebtoken')
const { authMiddleware, adminMiddleware } = require('../middlewares/auth.middleware')

router.post('/register', async (req, res) => {
    const { email, password, nome } = req.body

    if (!email || !password || !nome)
        return res.status(400).json({ error: 'Nome, email e senha são obrigatórios.' })

    const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
    })

    if (error) return res.status(400).json({ error: error.message })

    await supabase.from('usuarios').update({ nome, role: 'viewer' }).eq('id', data.user.id)
    return res.status(201).json({ message: 'Usuário criado!', user: data.user })
})

// Registro protegido - só admin cria outro admin
router.post('/register/admin', authMiddleware, adminMiddleware, async (req, res) => {
    const { email, password, nome } = req.body

    if (!email || !password || !nome)
        return res.status(400).json({ error: 'Nome, email e senha são obrigatórios.' })

    const { data, error } = await supabase.auth.admin.createUser({
        email, password, email_confirm: true,
    })

    if (error) return res.status(400).json({ error: error.message })

    await supabase.from('usuarios').update({ nome, role: 'admin' }).eq('id', data.user.id)

    return res.status(201).json({ message: 'Admin criado com sucesso!' })
})

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password)
        return res.status(400).json({
            error: 'Email e senha são obrigatórios.'
        });

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error)
        return res.status(401).json({
            error: error.message
        });

    // Busca dados do usuário
    const { data: usuario, error: userError } = await supabase
        .from('usuarios')
        .select('role, tenant_id, nome')
        .eq('id', data.user.id)
        .single();

    if (userError || !usuario) {
        return res.status(404).json({
            error: 'Usuário não encontrado.'
        });
    }

    // JWT COMPLETO
    const token = jwt.sign(
        {
            id: data.user.id,
            email: data.user.email,
            role: usuario.role,
            tenant_id: usuario.tenant_id,
            nome: usuario.nome
        },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
    );

    return res.status(200).json({
        message: 'Login realizado!',
        token
    });
});

/* ===================================================
    NOVA ROTA: ALTERAÇÃO DE SENHA (PUT /senha)
    ===================================================
*/
router.put('/senha', authMiddleware, async (req, res) => {
    const { novaSenha } = req.body;

    if (!novaSenha || novaSenha.length < 6) {
        return res.status(400).json({ 
            error: 'A nova senha deve possuir ao menos 6 caracteres.' 
        });
    }

    try {
        // O authMiddleware injeta o ID decodificado do JWT em req.user.id
        const { error } = await supabase.auth.admin.updateUserById(
            req.user.id,
            { password: novaSenha }
        );

        if (error) {
            return res.status(400).json({ 
                error: 'Erro ao atualizar a senha no Supabase.', 
                detalhe: error.message 
            });
        }

        return res.status(200).json({ 
            message: 'Senha alterada com sucesso!' 
        });

    } catch (err) {
        return res.status(500).json({ 
            error: 'Erro interno no servidor.', 
            detalhe: err.message 
        });
    }
});

module.exports = router;