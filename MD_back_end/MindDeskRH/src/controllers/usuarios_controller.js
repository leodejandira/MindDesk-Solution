const supabase = require('../config/supabase');
const { createClient } = require('@supabase/supabase-js');

// Cliente só com a service_role, sem sessão de usuário, para a API admin do Auth.
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
});

/*
    GET
    Retorna apenas funcionários do gerente logado
*/
exports.getUsuarios = async (req, res) => {
    try {

        // gerente logado
        const { data: gerente, error: gerenteError } = await supabase
            .from('usuarios')
            .select('nome, role')
            .eq('id', req.user.id)
            .single();

        if (gerenteError || !gerente) {
            return res.status(401).json({
                erro: 'Usuário não autorizado'
            });
        }

        // apenas admin pode listar
        if (gerente.role !== 'admin') {
            return res.status(403).json({
                erro: 'Sem permissão'
            });
        }

        const { data, error } = await supabase
            .from('usuarios')
            .select('*')
            .eq('gerente_geral', gerente.nome);

        if (error) {
            return res.status(500).json({
                erro: 'Erro ao buscar usuários',
                detalhe: error.message
            });
        }

        res.json(data);

    } catch (err) {
        res.status(500).json({
            erro: 'Erro interno',
            detalhe: err.message
        });
    }
};

/*
    REGISTER
    Cria novo funcionário vinculado ao gerente logado
*/
exports.registerUsuario = async (req, res) => {

    let {
        nome,
        email,
        password,
        role,
        cargo
    } = req.body;

    // sanitização
    nome = nome?.trim();
    email = email?.trim().toLowerCase();
    cargo = cargo?.trim();

    if (!nome || !email || !password || !cargo) {
        return res.status(400).json({
            erro: 'Nome, email, senha e cargo são obrigatórios'
        });
    }

    // validações
    if (nome.length < 3) {
        return res.status(400).json({
            erro: 'Nome inválido'
        });
    }

    if (password.length < 6) {
        return res.status(400).json({
            erro: 'Senha deve possuir ao menos 6 caracteres'
        });
    }

    const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
        return res.status(400).json({
            erro: 'Email inválido'
        });
    }

    try {

        // gerente logado
        const { data: gerente, error: gerenteError } = await supabase
            .from('usuarios')
            .select('nome, role')
            .eq('id', req.user.id)
            .single();

        if (gerenteError || !gerente) {
            return res.status(401).json({
                erro: 'Usuário não autorizado'
            });
        }

        // apenas admin pode criar
        if (gerente.role !== 'admin') {
            return res.status(403).json({
                erro: 'Sem permissão'
            });
        }

        // admin.createUser com email_confirm: o funcionário já consegue logar (o signUp exigia
        // confirmação por e-mail, que nunca chega para e-mails corporativos fictícios).
        const { data: authData, error: authError } =
            await supabaseAdmin.auth.admin.createUser({
                email,
                password,
                email_confirm: true
            });

        if (authError) {
            const jaExiste = /already|registered|exists/i.test(authError.message || '');
            return res.status(400).json({
                erro: jaExiste ? 'E-mail já cadastrado' : 'Erro ao criar usuário',
                detalhe: authError.message
            });
        }

        if (!authData?.user) {
            return res.status(400).json({
                erro: 'Usuário não retornado pelo auth'
            });
        }

        const userId = authData.user.id;

        const data_contratacao =
            new Date().toISOString().split('T')[0];

        await new Promise(resolve =>
            setTimeout(resolve, 500)
        );

        const { data, error } = await supabase
            .from('usuarios')
            .update({
                nome,
                role: role || 'viewer',
                cargo,
                data_contratacao,
                gerente_geral: gerente.nome
            })
            .eq('id', userId)
            .select();

        if (error) {
            return res.status(500).json({
                erro: 'Erro ao atualizar usuário',
                detalhe: error.message
            });
        }

        res.json(data);

    } catch (err) {
        res.status(500).json({
            erro: 'Erro interno',
            detalhe: err.message
        });
    }
};

/*
    GET BY EMAIL
    Retorna apenas funcionário do gerente logado
*/
exports.getUsuarioByEmail = async (req, res) => {

    const email =
        req.query.email?.trim().toLowerCase();

    if (!email) {
        return res.status(400).json({
            erro: 'Email é obrigatório'
        });
    }

    try {

        // gerente logado
        const { data: gerente } = await supabase
            .from('usuarios')
            .select('nome, role')
            .eq('id', req.user.id)
            .single();

        if (!gerente || gerente.role !== 'admin') {
            return res.status(403).json({
                erro: 'Sem permissão'
            });
        }

        const { data, error } = await supabase
            .from('usuarios')
            .select('*')
            .eq('email', email)
            .eq('gerente_geral', gerente.nome)
            .single();

        if (error) {
            return res.status(500).json({
                erro: 'Erro ao buscar usuário',
                detalhe: error.message
            });
        }

        if (!data) {
            return res.status(404).json({
                erro: 'Usuário não encontrado'
            });
        }

        res.json(data);

    } catch (err) {
        res.status(500).json({
            erro: 'Erro interno',
            detalhe: err.message
        });
    }
};

/*
    UPDATE
    Atualiza apenas funcionário do gerente logado
*/
exports.updateUsuario = async (req, res) => {

    const email =
        req.query.email?.trim().toLowerCase();

    let {
        nome,
        novoEmail,
        cargo
    } = req.body;

    nome = nome?.trim();
    novoEmail = novoEmail?.trim().toLowerCase();
    cargo = cargo?.trim();

    if (!email) {
        return res.status(400).json({
            erro: 'Informe o email do usuário na query'
        });
    }

    if (!nome && !novoEmail && !cargo) {
        return res.status(400).json({
            erro: 'Informe ao menos um campo para atualizar'
        });
    }

    try {

        // gerente logado
        const { data: gerente } = await supabase
            .from('usuarios')
            .select('nome, role')
            .eq('id', req.user.id)
            .single();

        if (!gerente || gerente.role !== 'admin') {
            return res.status(403).json({
                erro: 'Sem permissão'
            });
        }

        // funcionário alvo
        const { data: usuario } = await supabase
            .from('usuarios')
            .select('*')
            .eq('email', email)
            .single();

        if (!usuario) {
            return res.status(404).json({
                erro: 'Usuário não encontrado'
            });
        }

        // impede editar funcionário de outro gerente
        if (usuario.gerente_geral !== gerente.nome) {
            return res.status(403).json({
                erro: 'Você não pode editar este usuário'
            });
        }

        const campos = {};

        if (nome) {
            if (nome.length < 3) {
                return res.status(400).json({
                    erro: 'Nome inválido'
                });
            }

            campos.nome = nome;
        }

        if (novoEmail) {

            const emailRegex =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!emailRegex.test(novoEmail)) {
                return res.status(400).json({
                    erro: 'Email inválido'
                });
            }

            campos.email = novoEmail;
        }

        if (cargo) {
            campos.cargo = cargo;
        }

        const { data, error } = await supabase
            .from('usuarios')
            .update(campos)
            .eq('email', email)
            .select();

        if (error) {
            return res.status(500).json({
                erro: 'Erro ao atualizar usuário',
                detalhe: error.message
            });
        }

        res.json(data);

    } catch (err) {
        res.status(500).json({
            erro: 'Erro interno',
            detalhe: err.message
        });
    }
};

/*
    DELETE
    Remove apenas funcionário do gerente logado
*/
exports.deleteUsuario = async (req, res) => {

    const email =
        req.query.email?.trim().toLowerCase();

    if (!email) {
        return res.status(400).json({
            erro: 'Informe o email do usuário na query'
        });
    }

    try {

        // gerente logado
        const { data: gerente } = await supabase
            .from('usuarios')
            .select('nome, role')
            .eq('id', req.user.id)
            .single();

        if (!gerente || gerente.role !== 'admin') {
            return res.status(403).json({
                erro: 'Sem permissão'
            });
        }

        // usuário alvo
        const { data: usuario } = await supabase
            .from('usuarios')
            .select('*')
            .eq('email', email)
            .single();

        if (!usuario) {
            return res.status(404).json({
                erro: 'Usuário não encontrado'
            });
        }

        // impede deletar funcionário de outro gerente
        if (usuario.gerente_geral !== gerente.nome) {
            return res.status(403).json({
                erro: 'Você não pode excluir este usuário'
            });
        }

        const { data, error } = await supabase
            .from('usuarios')
            .delete()
            .eq('email', email)
            .select();

        if (error) {
            return res.status(500).json({
                erro: 'Erro ao excluir usuário',
                detalhe: error.message
            });
        }

        res.json({
            mensagem: 'Usuário deletado com sucesso',
            usuario: data
        });

    } catch (err) {
        res.status(500).json({
            erro: 'Erro interno',
            detalhe: err.message
        });
    }
};