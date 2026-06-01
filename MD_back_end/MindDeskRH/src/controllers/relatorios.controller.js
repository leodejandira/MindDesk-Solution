const supabase = require('../config/supabase');

// =========================================
// HELPER: verifica se e dia util (ignora apenas fins de semana)
// =========================================
function isDiaUtil(dataStr) {
    const data = new Date(`${dataStr}T12:00:00`);
    const diaSemana = data.getDay();
    return diaSemana !== 0 && diaSemana !== 6;
}

// =========================================
// HELPER: calcula situacao de ferias
// =========================================
function calcularSituacaoFerias(pendenteMaisAntiga) {
    if (!pendenteMaisAntiga || !pendenteMaisAntiga.data_ferias_prevista) {
        return {
            situacao: 'Em dia',
            aviso: 'Funcionario com situacao regular. Nao ha ferias pendentes.',
            prioridade: 'ok',
            meses_referencia: 0,
            data_vencimento: null
        };
    }

    const hoje = new Date();

    const fimAquisitivo = new Date(pendenteMaisAntiga.data_ferias_prevista);

    const dataVencimento = new Date(fimAquisitivo);
    dataVencimento.setMonth(dataVencimento.getMonth() + 12);

    const inicioAquisitivo = new Date(fimAquisitivo);
    inicioAquisitivo.setMonth(inicioAquisitivo.getMonth() - 12);

    let mesesDesdeInicio =
        (hoje.getFullYear() - inicioAquisitivo.getFullYear()) * 12 +
        (hoje.getMonth() - inicioAquisitivo.getMonth());

    let situacao, aviso, prioridade;

    if (hoje >= dataVencimento) {
        situacao = 'Crítica';
        prioridade = 'critica';
        aviso = 'Férias vencidas. Risco de marcação compulsória imediata e pagamento em dobro.';
    } else if (mesesDesdeInicio >= 20) {
        situacao = 'Crítica';
        prioridade = 'critica';
        aviso = 'Você possui férias a vencer. Caso não marque nos próximos 30 dias, será realizada marcação de férias compulsórias.';
    } else if (mesesDesdeInicio >= 16) {
        situacao = 'Atrasada';
        prioridade = 'alta';
        aviso = 'Você tem férias pendentes de agendamento com prazo curto, favor agendar suas férias.';
    } else if (mesesDesdeInicio >= 12) {
        situacao = 'Disponível';
        prioridade = 'media';
        aviso = 'Você está com férias disponíveis para agendar.';
    } else if (mesesDesdeInicio >= 10) {
        situacao = 'Disponível em breve';
        prioridade = 'baixa';
        aviso = `Férias disponíveis em ${12 - mesesDesdeInicio} mês(es). Já pode planejar.`;
    } else {
        situacao = 'Em dia';
        prioridade = 'ok';
        aviso = 'Funcionário com situação regular.';
    }

    return {
        situacao,
        aviso,
        prioridade,
        meses_referencia: mesesDesdeInicio,
        data_vencimento: dataVencimento.toISOString().split('T')[0]
    };
}

// =========================================
// RELATORIO DE FALTAS
// =========================================
exports.relatorioFaltas = async (req, res) => {
    const { tenant_id, data_inicio, data_fim } = req.query;

    if (!tenant_id || !data_inicio || !data_fim) {
        return res.status(400).json({ error: 'tenant_id, data_inicio e data_fim são obrigatórios.' });
    }

    try {
        const gerente_id = req.user.id;

        // 1. Busca os usuários vinculados ao gerente e tenant
        const { data: usuarios, error: usuariosError } = await supabase
            .from('usuarios')
            .select('id, nome, cargo')
            .eq('tenant_id', tenant_id)
            .eq('gerente_id', gerente_id);

        if (usuariosError) return res.status(500).json({ error: usuariosError.message });
        const usuariosIds = usuarios.map(u => u.id);

        // 2. Busca os registros de ponto no período
        const { data: pontos, error: pontosError } = await supabase
            .from('pontos')
            .select('usuario_id, horario')
            .eq('tenant_id', tenant_id)
            .in('usuario_id', usuariosIds)
            .gte('horario', `${data_inicio}T00:00:00`)
            .lte('horario', `${data_fim}T23:59:59`);

        if (pontosError) return res.status(500).json({ error: pontosError.message });

        // 3. Gera a lista de dias úteis (Segunda a Sexta)
        const diasUteis = [];
        let d = new Date(`${data_inicio}T12:00:00`);
        const fim = new Date(`${data_fim}T12:00:00`);
        
        while (d <= fim) {
            const dataStr = d.toISOString().split('T')[0];
            // 0 = Domingo, 6 = Sábado
            if (d.getDay() !== 0 && d.getDay() !== 6) {
                diasUteis.push(dataStr);
            }
            d.setDate(d.getDate() + 1);
        }

        // 4. Calcula as faltas para cada usuário
        const relatorio = usuarios.map(usuario => {
            const diasFalta = diasUteis.filter(dia => {
                // Conta quantos registros o usuário possui no dia atual
                const registrosNoDia = (pontos || []).filter(p => {
                    const dataPonto = p.horario.split('T')[0];
                    return p.usuario_id === usuario.id && dataPonto === dia;
                }).length;

                // Falta é definida como menos de 4 registros no dia útil
                return registrosNoDia < 4;
            });

            return {
                usuario_id: usuario.id,
                nome: usuario.nome,
                cargo: usuario.cargo,
                total_faltas: diasFalta.length,
                dias_falta: diasFalta
            };
        });

        return res.json(relatorio);
    } catch (err) {
        return res.status(500).json({ error: 'Erro interno.', detalhe: err.message });
    }
};
// =========================================
// RELATORIO DE ATRASOS
// =========================================
// =========================================
// RELATORIO DE ATRASOS (Baseado na tabela banco_horas)
// =========================================
exports.relatorioAtrasos = async (req, res) => {
    const { tenant_id, data_inicio, data_fim } = req.query;

    if (!tenant_id || !data_inicio || !data_fim) {
        return res.status(400).json({ error: 'tenant_id, data_inicio e data_fim são obrigatórios.' });
    }

    try {
        // 1. Dispara o gatilho (RPC) para garantir que os dados estejam atualizados
        await supabase.rpc('get_banco_horas'); 

        // 2. Busca na tabela de banco_horas filtrando pelo período e tenant
        // A tabela tem a coluna 'data' e 'saldo_minutos' conforme sua imagem
        const { data: registros, error } = await supabase
            .from('banco_horas')
            .select(`
                usuario_id, 
                saldo_minutos, 
                data, 
                usuarios (nome, cargo)
            `)
            .eq('tenant_id', tenant_id)
            .gte('data', data_inicio)
            .lte('data', data_fim)
            .order('data', { ascending: true });

        if (error) throw error;

        // 3. Processa os dados (Atraso = saldo_minutos positivo na sua lógica)
        // Se saldo_minutos positivo = atraso, então filtramos apenas esses
        const atrasos = registros
            .filter(r => r.saldo_minutos > 0) // Filtra apenas o que é saldo positivo (atraso)
            .map(r => ({
                usuario_id: r.usuario_id,
                nome: r.usuarios?.nome || '—',
                cargo: r.usuarios?.cargo || 'Funcionário',
                data: r.data,
                minutos_atraso: r.saldo_minutos // O valor que está na sua tabela
            }));

        // 4. Agrupa e soma tudo para o front-end
        const consolidado = atrasos.reduce((acc, curr) => {
            if (!acc[curr.usuario_id]) {
                acc[curr.usuario_id] = {
                    usuario_id: curr.usuario_id,
                    nome: curr.nome,
                    cargo: curr.cargo,
                    total_atraso_acumulado_mes: 0,
                    atrasos: []
                };
            }
            acc[curr.usuario_id].total_atraso_acumulado_mes += curr.minutos_atraso;
            acc[curr.usuario_id].atrasos.push({
                data: curr.data,
                minutos_atraso: curr.minutos_atraso
            });
            return acc;
        }, {});

        return res.json(Object.values(consolidado));

    } catch (err) {
        return res.status(500).json({ error: 'Erro ao gerar relatório.', detalhe: err.message });
    }
};

// =========================================
// RELATORIO BANCO DE HORAS
// =========================================
exports.relatorioBancoHoras = async (req, res) => {
    const { tenant_id } = req.query;

    if (!tenant_id) return res.status(400).json({ error: 'tenant_id e obrigatorio.' });

    try {
        const gerente_id = req.user.id;

        const { data: usuarios, error: usuariosError } = await supabase
            .from('usuarios')
            .select('id, nome, email, cargo')
            .eq('tenant_id', tenant_id)
            .eq('gerente_id', gerente_id);

        if (usuariosError) return res.status(500).json({ error: usuariosError.message });

        const usuariosIds = usuarios.map(u => u.id);

        const { data: bancoHoras, error: bancoError } = await supabase
            .from('banco_horas')
            .select('usuario_id, saldo_minutos, updated_at')
            .eq('tenant_id', tenant_id)
            .in('usuario_id', usuariosIds);

        if (bancoError) return res.status(500).json({ error: bancoError.message });

        const relatorio = bancoHoras.map(banco => {
            const usuario = usuarios.find(u => u.id === banco.usuario_id);
            const saldo = banco.saldo_minutos || 0;
            
            // Calcula o débito (minutos negativos)
            const totalNegativo = saldo < 0 ? Math.abs(saldo) : 0;

            return {
                usuario_id: banco.usuario_id,
                nome: usuario?.nome,
                email: usuario?.email,
                cargo: usuario?.cargo,
                saldo_minutos: saldo,
                total_minutos_negativos: totalNegativo, // Novo campo para identificar o débito total
                saldo: saldo >= 0
                    ? `+${Math.floor(saldo / 60)}h${String(saldo % 60).padStart(2, '0')}m`
                    : `-${Math.floor(Math.abs(saldo) / 60)}h${String(Math.abs(saldo) % 60).padStart(2, '0')}m`,
                status: saldo >= 0 ? 'positivo' : 'negativo',
                atualizado_em: banco.updated_at
            };
        });

        relatorio.sort((a, b) => a.saldo_minutos - b.saldo_minutos);
        return res.json(relatorio);
    } catch (err) {
        return res.status(500).json({ error: 'Erro interno.', detalhe: err.message });
    }
};
// =========================================
// RELATORIO DE FERIAS
// =========================================
exports.relatorioFerias = async (req, res) => {
    const { tenant_id } = req.query;

    if (!tenant_id) {
        return res.status(400).json({ error: 'tenant_id e obrigatorio.' });
    }

    try {
        const gerente_id = req.user.id;

        const { data: usuarios, error: usuariosError } = await supabase
            .from('usuarios')
            .select('id, nome, email, cargo')
            .eq('tenant_id', tenant_id)
            .eq('gerente_id', gerente_id);

        if (usuariosError) {
            return res.status(500).json({ error: usuariosError.message });
        }

        const usuariosIds = usuarios.map(u => u.id);

        const { data: ferias, error: feriasError } = await supabase
            .from('ferias')
            .select('*')
            .eq('tenant_id', tenant_id)
            .in('usuario_id', usuariosIds)
            .order('data_registro', { ascending: true });

        if (feriasError) {
            return res.status(500).json({ error: feriasError.message });
        }

        const relatorio = usuarios.map(usuario => {
            const feriasUsuario = ferias.filter(f => f.usuario_id === usuario.id);
            const pendentes = feriasUsuario.filter(f => f.status_ferias === 'pendente');
            const cumpridas = feriasUsuario.filter(f => f.status_ferias === 'cumprida');

            const pendenteMaisAntiga = pendentes.length > 0
                ? pendentes.reduce((maisAntiga, atual) => {
                    return new Date(atual.data_ferias_prevista) < new Date(maisAntiga.data_ferias_prevista)
                        ? atual
                        : maisAntiga;
                })
                : null;

            const ultimaCumprida = cumpridas.length > 0
                ? cumpridas.reduce((maisRecente, atual) => {
                    return new Date(atual.data_fim || atual.data_inicio) >
                        new Date(maisRecente.data_fim || maisRecente.data_inicio)
                        ? atual
                        : maisRecente;
                })
                : null;

            const calc = calcularSituacaoFerias(pendenteMaisAntiga);

            return {
                usuario_id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
                cargo: usuario.cargo,
                data_ultima_ferias:
                    ultimaCumprida?.data_fim ||
                    ultimaCumprida?.data_inicio ||
                    null,
                data_vencimento_ferias: calc.data_vencimento,
                ferias_pendentes: pendentes.length,
                ferias_cumpridas: cumpridas.length,
                meses_referencia: calc.meses_referencia,
                situacao: calc.situacao,
                aviso: calc.aviso,
                prioridade: calc.prioridade
            };
        });

        const ordemPrioridade = { critica: 0, alta: 1, media: 2, baixa: 3, ok: 4 };

        relatorio.sort((a, b) => {
            const pa = ordemPrioridade[a.prioridade] ?? 99;
            const pb = ordemPrioridade[b.prioridade] ?? 99;

            if (pa !== pb) return pa - pb;
            return (b.meses_referencia || 0) - (a.meses_referencia || 0);
        });

        return res.json(relatorio);
    } catch (err) {
        return res.status(500).json({ error: 'Erro interno.', detalhe: err.message });
    }
};

// =========================================
// RELATORIO DE AFASTAMENTOS
// =========================================
exports.relatorioAfastamentos = async (req, res) => {
    const { tenant_id } = req.query;

    if (!tenant_id) {
        return res.status(400).json({ error: 'tenant_id e obrigatorio.' });
    }

    try {
        const gerente_id = req.user.id;

        const { data: usuarios } = await supabase
            .from('usuarios')
            .select('id')
            .eq('tenant_id', tenant_id)
            .eq('gerente_id', gerente_id);

        const usuariosIds = usuarios.map(u => u.id);
        const hoje = new Date().toISOString().split('T')[0];

        const { data, error } = await supabase
            .from('atestados')
            .select('*, usuarios(nome, email, cargo)')
            .eq('tenant_id', tenant_id)
            .eq('status', 'ativo')
            .in('usuario_id', usuariosIds)
            .gte('data_emissao', hoje);

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        const relatorio = data.map(atestado => {
            const dataFim = new Date(atestado.data_emissao);
            dataFim.setDate(dataFim.getDate() + atestado.dias_afastamento);
            return {
                ...atestado,
                data_fim_afastamento: dataFim.toISOString().split('T')[0]
            };
        });

        return res.json(relatorio);
    } catch (err) {
        return res.status(500).json({ error: 'Erro interno.', detalhe: err.message });
    }
};

// =========================================
// Funcoes auxiliares para calcular as cores
// =========================================
const calcularCorRisco = (score) => {
    if (score == null) return 'cinza';
    if (score < 50) return 'verde';
    if (score < 80) return 'amarelo';
    return 'vermelho';
};

const calcularCorEngajamento = (score) => {
    if (score == null) return 'cinza';
    if (score < 40) return 'vermelho';
    if (score <= 60) return 'amarelo';
    return 'verde';
};

const calcularCorPromocao = (score) => {
    if (score == null) return 'cinza';
    if (score > 50) return 'verde';
    return 'cinza';
};

// =========================================
// Listar Relatorios de People Analytics
// =========================================
exports.listarRelatoriosPA = async (req, res) => {
    try {
        const tenant_id = Number(req.user.tenant_id);
        const gerente_id = String(req.user.id);

        const meses = [
            "janeiro", "fevereiro", "marco", "abril", "maio", "junho",
            "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
        ];

        const agora = new Date();
        const mesIndex = agora.getMonth();

        const mesAlvo = meses[(mesIndex - 1 + 12) % 12];
        const mesFallback = meses[(mesIndex - 2 + 12) % 12];

        let { data, error } = await supabase
            .from('people_analytics')
            .select(`
                id, nome, cargo, mes_referencia,
                score_burnout, score_turnover, score_engajamento,
                score_elegibilidade_promocao, score_humor,
                analise_pa, sentimento_predominante
            `)
            .eq('tenant_id', tenant_id)
            .eq('gerente_id', gerente_id)
            .eq('mes_referencia', mesAlvo)
            .order('created_at', { ascending: false });

        if (error) return res.status(500).json({ error: error.message });

        if (!data || data.length === 0) {
            const resultado = await supabase
                .from('people_analytics')
                .select(`
                    id, nome, cargo, mes_referencia,
                    score_burnout, score_turnover, score_engajamento,
                    score_elegibilidade_promocao, score_humor,
                    analise_pa, sentimento_predominante
                `)
                .eq('tenant_id', tenant_id)
                .eq('gerente_id', gerente_id)
                .eq('mes_referencia', mesFallback)
                .order('created_at', { ascending: false });

            if (resultado.error) return res.status(500).json({ error: resultado.error.message });
            data = resultado.data;
        }

        const relatoriosProcessados = (data || []).map(funcionario => ({
            ...funcionario,
            cores: {
                burnout: calcularCorRisco(funcionario.score_burnout),
                turnover: calcularCorRisco(funcionario.score_turnover),
                engajamento: calcularCorEngajamento(funcionario.score_engajamento),
                promocao: calcularCorPromocao(funcionario.score_elegibilidade_promocao)
            }
        }));

        return res.status(200).json(relatoriosProcessados);
    } catch (err) {
        return res.status(500).json({ error: 'Erro interno ao buscar relatorios de People Analytics.' });
    }
};