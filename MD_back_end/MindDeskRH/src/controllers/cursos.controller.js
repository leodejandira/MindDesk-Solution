const supabase = require('../config/supabase');

// =========================================
// Listar cursos do usuário logado
// =========================================
exports.listarCursos = async (req, res) => {
    try {
        const usuario_id = String(req.user.id).trim();
        console.log(`[listarCursos] Iniciando busca para usuario_id: ${usuario_id}`);

        const { data, error } = await supabase
            .from('cursos')
            // O '*' já traz 'status' e 'prazo_dias' da tabela cursos.
            // Puxamos de usuarios apenas o que existe lá.
            .select('*, usuarios!cursos_usuario_id_fkey (nome, email, cargo)')
            .eq('usuario_id', usuario_id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error(`[listarCursos] Erro no Supabase: ${error.message}`);
            return res.status(500).json({ error: error.message });
        }

        console.log(`[listarCursos] Sucesso: ${data.length} curso(s) retornado(s).`);
        return res.json(data);
    } catch (err) {
        console.error(`[listarCursos] Erro interno:`, err);
        return res.status(500).json({ error: 'Erro interno.' });
    }
};

// =========================================
// Listar todos os cursos do Tenant (Admin/Gerente)
// =========================================
exports.listarTodosCursos = async (req, res) => {
    try {
        const tenant_id = Number(req.user.tenant_id);
        console.log(`[listarTodosCursos] Iniciando busca para tenant_id: ${tenant_id}`);

        const { data, error } = await supabase
            .from('cursos')
            // Mesma correção aplicada aqui
            .select(`*, usuarios!cursos_usuario_id_fkey (nome, email, cargo)`)
            .eq('tenant_id', tenant_id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error(`[listarTodosCursos] Erro no Supabase: ${error.message}`);
            return res.status(500).json({ error: error.message });
        }

        console.log(`[listarTodosCursos] Sucesso: ${data.length} curso(s) retornado(s).`);
        return res.json(data);
    } catch (err) {
        console.error(`[listarTodosCursos] Erro interno:`, err);
        return res.status(500).json({ error: 'Erro interno.' });
    }
};

// =========================================
// Gerente envia curso (Catálogo ou Atribuição)
// =========================================
exports.enviarCurso = async (req, res) => {
    try {
        const { usuarios_ids, titulo, link, descricao, status, prazo_dias } = req.body;
        const tenant_id = Number(req.user.tenant_id);
        const criado_por = String(req.user.id).trim();

        console.log(`[enviarCurso] Recebida solicitação para criar curso: "${titulo}" (tenant_id: ${tenant_id})`);

        if (!titulo || !link) {
            console.error(`[enviarCurso] Erro de validação: Título e link não fornecidos.`);
            return res.status(400).json({ error: 'Título e link são obrigatórios.' });
        }

        let cursosParaInserir = [];

        // SE NÃO SELECIONOU NINGUÉM -> Salva apenas no catálogo (usuario_id = null)
        if (!usuarios_ids || usuarios_ids.length === 0) {
            console.log(`[enviarCurso] Nenhum usuário selecionado. Inserindo apenas no catálogo.`);
            cursosParaInserir.push({
                tenant_id,
                usuario_id: null,
                titulo,
                link,
                descricao: descricao || null,
                criado_por,
                status: 'pendente',
                prazo_dias
            });
        } 
        // SE SELECIONOU FUNCIONÁRIOS -> Insere uma linha para cada
        else {
            console.log(`[enviarCurso] ${usuarios_ids.length} usuário(s) selecionado(s). Preparando inserção em lote.`);
            cursosParaInserir = usuarios_ids.map(id => ({
                tenant_id,
                usuario_id: String(id).trim(),
                titulo,
                link,
                descricao: descricao || null,
                criado_por,
                status: 'pendente',
                prazo_dias
            }));
        }

        const { data, error } = await supabase
            .from('cursos')
            .insert(cursosParaInserir)
            .select();

        if (error) {
            console.error(`[enviarCurso] Erro no Supabase ao inserir: ${error.message}`);
            return res.status(500).json({ error: error.message });
        }

        console.log(`[enviarCurso] Sucesso: ${cursosParaInserir.length} registro(s) inserido(s).`);
        return res.status(201).json({ message: `Ação realizada com sucesso!`, cursos: data });
    } catch (err) {
        console.error(`[enviarCurso] Erro interno:`, err);
        return res.status(500).json({ error: 'Erro interno.' });
    }
};

// =========================================
// Deletar curso (Remove o curso e todos os acessos)
// =========================================
exports.deletarCurso = async (req, res) => {
    try {
        const { id } = req.params;
        const tenant_id = Number(req.user.tenant_id);

        console.log(`[deletarCurso] Solicitada exclusão do registro ID: ${id} (tenant_id: ${tenant_id})`);

        // 1. Busca qual é o link do curso que está sendo deletado
        const { data: curso, error: fetchError } = await supabase
            .from('cursos')
            .select('link')
            .eq('id', id)
            .single();

        if (fetchError || !curso) {
            console.error(`[deletarCurso] Erro: Curso ID ${id} não encontrado ou erro na busca (${fetchError?.message || 'Nenhum dado'}).`);
            return res.status(404).json({ error: 'Curso não encontrado.' });
        }

        console.log(`[deletarCurso] Curso encontrado. Deletando todos os registros do tenant com o link: ${curso.link}`);

        // 2. Deleta TODOS os registros do tenant que tenham o mesmo link
        const { error: deleteError } = await supabase
            .from('cursos')
            .delete()
            .eq('link', curso.link)
            .eq('tenant_id', tenant_id);

        if (deleteError) {
            console.error(`[deletarCurso] Erro no Supabase ao deletar: ${deleteError.message}`);
            return res.status(500).json({ error: deleteError.message });
        }

        console.log(`[deletarCurso] Sucesso: Curso e suas atribuições foram totalmente removidos.`);
        return res.json({ message: 'Curso e todas as atribuições removidos com sucesso.' });
    } catch (err) {
        console.error(`[deletarCurso] Erro interno:`, err);
        return res.status(500).json({ error: 'Erro interno.' });
    }
};

// =========================================
// Funcionário marca curso como concluído
// =========================================
exports.concluirCurso = async (req, res) => {
    try {
        const { id } = req.params; // ID do registro na tabela 'cursos'
        const usuario_id = String(req.user.id).trim();
        const tenant_id = Number(req.user.tenant_id);

        console.log(`[concluirCurso] Usuário ${usuario_id} solicitando conclusão do curso ID: ${id}`);

        // 1. Busca os dados do curso atribuído para pegar prazo e título
        const { data: curso, error: fetchError } = await supabase
            .from('cursos')
            .select('*')
            .eq('id', id)
            .eq('usuario_id', usuario_id)
            .single();

        if (fetchError || !curso) {
            console.error(`[concluirCurso] Erro: Curso não encontrado.`);
            return res.status(404).json({ error: 'Curso não encontrado ou sem permissão.' });
        }

        // 2. Prepara as datas para o cálculo (padrão YYYY-MM-DD exigido pela sua coluna date)
        const dataAtualObj = new Date();
        const dataConclusaoStr = dataAtualObj.toISOString().split('T')[0]; 
        
        let prazoLimiteStr = null;
        let concluidoNoPrazo = true;

        // Se o curso tinha prazo, calcula se atrasou
        if (curso.prazo_dias) {
            const dataCriacaoObj = new Date(curso.created_at);
            dataCriacaoObj.setDate(dataCriacaoObj.getDate() + Number(curso.prazo_dias));
            
            prazoLimiteStr = dataCriacaoObj.toISOString().split('T')[0];

            // Compara ignorando horas para não dar falso positivo
            const limite = new Date(prazoLimiteStr + "T12:00:00");
            const entregue = new Date(dataConclusaoStr + "T12:00:00");
            
            concluidoNoPrazo = entregue <= limite;
        }

        // 3. INSERE NA TABELA DE AUDITORIA (Exatamente com as colunas da sua imagem!)
        const { error: insertError } = await supabase
            .from('historico_cursos') 
            .insert([{
                tenant_id: tenant_id,
                usuario_id: usuario_id,
                nome_curso: curso.titulo,
                obrigatorio: false, // Você pode ajustar essa regra de negócio futuramente
                prazo_limite: prazoLimiteStr,
                data_conclusao: dataConclusaoStr,
                concluido_no_prazo: concluidoNoPrazo
            }]);

        if (insertError) {
            console.error(`[concluirCurso] Erro ao inserir no histórico:`, insertError.message);
            return res.status(500).json({ error: 'Erro ao registrar histórico.' });
        }

        // 4. ATUALIZA A TABELA ORIGINAL para mudar o status visual 
        // ⚠️ Aqui estava o erro! Removemos a tentativa de inserir data numa tabela que não tem a coluna
        const { error: updateError } = await supabase
            .from('cursos')
            .update({ 
                status: 'concluido'
            })
            .eq('id', id);

        if (updateError) {
            console.error(`[concluirCurso] Erro ao atualizar status:`, updateError.message);
            return res.status(500).json({ error: 'Erro ao atualizar status.' });
        }

        console.log(`[concluirCurso] Sucesso! Registrado na tabela de auditoria.`);
        return res.json({ message: 'Curso concluído com sucesso!' });

    } catch (err) {
        console.error(`[concluirCurso] Erro interno:`, err);
        return res.status(500).json({ error: 'Erro interno.' });
    }
};

// =========================================
// Verifica permissões do usuário logado
// =========================================
exports.verificarPermissoes = async (req, res) => {
    try {
        // O req.user já vem do seu authMiddleware
        const user = req.user;
        const isAdmin = user.cargo === "admin" || user.cargo === "gerente";
        
        return res.json({ 
            isAdmin,
            cargo: user.cargo,
            nome: user.nome
        });
    } catch (err) {
        return res.status(500).json({ error: 'Erro ao verificar permissões.' });
    }
};