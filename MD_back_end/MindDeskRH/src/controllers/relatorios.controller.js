const supabase = require('../config/supabase');

// =========================================
// HELPER: calcula situação de férias
//
// LÓGICA CORRETA E BLINDADA PELA CLT:
// A coluna "data_ferias_prevista" do banco marca o FIM do período aquisitivo.
// O vencimento legal (fim do período concessivo) é EXATAMENTE 12 meses 
// após a "data_ferias_prevista".
// =========================================
function calcularSituacaoFerias(pendenteMaisAntiga) {
    if (!pendenteMaisAntiga || !pendenteMaisAntiga.data_ferias_prevista) {
        return {
            situacao: 'Em dia',
            aviso: 'Funcionário com situação regular. Não há férias pendentes.',
            prioridade: 'ok',
            meses_referencia: 0,
            data_vencimento: null
        };
    }

    const hoje = new Date();
    
    // Fim do período aquisitivo (ex: a data 2024-12-03 do seu banco)
    const fimAquisitivo = new Date(pendenteMaisAntiga.data_ferias_prevista);

    // O limite máximo (vencimento) é 12 meses após o fim do período aquisitivo
    const dataVencimento = new Date(fimAquisitivo);
    dataVencimento.setMonth(dataVencimento.getMonth() + 12);

    // O início do ciclo aquisitivo foi 12 meses ANTES do fimAquisitivo.
    // Usamos isso para manter a sua régua de alertas (12, 16, 20 meses)
    const inicioAquisitivo = new Date(fimAquisitivo);
    inicioAquisitivo.setMonth(inicioAquisitivo.getMonth() - 12);

    // Calculando meses decorridos DESDE O INÍCIO DO CICLO 
    let mesesDesdeInicio =
        (hoje.getFullYear() - inicioAquisitivo.getFullYear()) * 12 +
        (hoje.getMonth() - inicioAquisitivo.getMonth());

    let situacao, aviso, prioridade;

    if (hoje >= dataVencimento) {
        situacao = 'Crítica';
        prioridade = 'critica';
        aviso = 'Férias vencidas. Risco de marcação compulsória imediata e pagamento em dobro.';
    } else if (mesesDesdeInicio >= 20) {
        // Faltam até 4 meses para o limite
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
// RELATÓRIO DE FALTAS
// =========================================
exports.relatorioFaltas = async (req, res) => {
    const { tenant_id, data_inicio, data_fim } = req.query;

    if (!tenant_id || !data_inicio || !data_fim) {
        return res.status(400).json({
            error: 'tenant_id, data_inicio e data_fim são obrigatórios.'
        });
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

        const { data: pontos, error: pontosError } = await supabase
            .from('pontos')
            .select('usuario_id, horario, tipo')
            .eq('tenant_id', tenant_id)
            .in('usuario_id', usuariosIds)
            .gte('horario', `${data_inicio}T00:00:00`)
            .lte('horario', `${data_fim}T23:59:59`);

        if (pontosError) {
            return res.status(500).json({ error: pontosError.message });
        }

        const diasUteis = [];
        const atual = new Date(data_inicio);
        const fim = new Date(data_fim);

        while (atual <= fim) {
            const diaSemana = atual.getDay();
            if (diaSemana !== 0 && diaSemana !== 6) {
                diasUteis.push(atual.toISOString().split('T')[0]);
            }
            atual.setDate(atual.getDate() + 1);
        }

        const relatorio = usuarios
            .map(usuario => {
                const faltas = diasUteis.filter(dia => {
                    const temEntrada = pontos?.some(
                        p =>
                            p.usuario_id === usuario.id &&
                            p.tipo === 'entrada' &&
                            p.horario.startsWith(dia)
                    );
                    return !temEntrada;
                });

                return {
                    usuario_id: usuario.id,
                    nome: usuario.nome,
                    email: usuario.email,
                    cargo: usuario.cargo,
                    total_faltas: faltas.length,
                    dias_falta: faltas
                };
            })
            .filter(u => u.total_faltas > 0);

        return res.json(relatorio);
    } catch (err) {
        return res.status(500).json({ error: 'Erro interno.', detalhe: err.message });
    }
};

// =========================================
// RELATÓRIO DE ATRASOS
// =========================================
exports.relatorioAtrasos = async (req, res) => {
    const { tenant_id, data_inicio, data_fim } = req.query;

    if (!tenant_id || !data_inicio || !data_fim) {
        return res.status(400).json({
            error: 'tenant_id, data_inicio e data_fim são obrigatórios.'
        });
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

        const { data: pontos, error: pontosError } = await supabase
            .from('pontos')
            .select('usuario_id, horario, tipo')
            .eq('tenant_id', tenant_id)
            .eq('tipo', 'entrada')
            .in('usuario_id', usuariosIds)
            .gte('horario', `${data_inicio}T00:00:00`)
            .lte('horario', `${data_fim}T23:59:59`);

        if (pontosError) {
            return res.status(500).json({ error: pontosError.message });
        }

        const HORARIO_LIMITE = 8 * 60 + 5;
        const atrasos = [];

        pontos?.forEach(ponto => {
            const data = new Date(ponto.horario);
            const minutosEntrada = data.getHours() * 60 + data.getMinutes();

            if (minutosEntrada > HORARIO_LIMITE) {
                const usuario = usuarios.find(u => u.id === ponto.usuario_id);
                const minutosAtraso = minutosEntrada - (8 * 60);

                atrasos.push({
                    usuario_id: ponto.usuario_id,
                    nome: usuario?.nome,
                    email: usuario?.email,
                    cargo: usuario?.cargo,
                    data: data.toISOString().split('T')[0],
                    horario_entrada: data.toTimeString().slice(0, 5),
                    minutos_atraso: minutosAtraso
                });
            }
        });

        return res.json(atrasos);
    } catch (err) {
        return res.status(500).json({ error: 'Erro interno.', detalhe: err.message });
    }
};

// =========================================
// RELATÓRIO BANCO DE HORAS
// =========================================
exports.relatorioBancoHoras = async (req, res) => {
    const { tenant_id } = req.query;

    if (!tenant_id) {
        return res.status(400).json({ error: 'tenant_id é obrigatório.' });
    }

    try {
        const gerente_id = req.user.id;

        // 1. Busca os usuários do gerente
        const { data: usuarios, error: usuariosError } = await supabase
            .from('usuarios')
            .select('id, nome, email, cargo')
            .eq('tenant_id', tenant_id)
            .eq('gerente_id', gerente_id);

        if (usuariosError) return res.status(500).json({ error: usuariosError.message });

        const usuariosIds = usuarios.map(u => u.id);

        // 2. Busca direto da nova tabela banco_horas
        const { data: bancoHoras, error: bancoError } = await supabase
            .from('banco_horas')  // <-- nova tabela
            .select('usuario_id, saldo_minutos, updated_at')
            .eq('tenant_id', tenant_id)
            .in('usuario_id', usuariosIds);

        if (bancoError) return res.status(500).json({ error: bancoError.message });

        // 3. Monta o relatório juntando com os dados do usuário
        const relatorio = bancoHoras.map(banco => {
            const usuario = usuarios.find(u => u.id === banco.usuario_id);
            const saldo = banco.saldo_minutos;

            return {
                usuario_id: banco.usuario_id,
                nome: usuario?.nome,
                email: usuario?.email,
                cargo: usuario?.cargo,
                saldo_minutos: saldo,
                saldo: saldo >= 0
                    ? `+${Math.floor(saldo / 60)}h${String(saldo % 60).padStart(2, '0')}m`
                    : `-${Math.floor(Math.abs(saldo) / 60)}h${String(Math.abs(saldo) % 60).padStart(2, '0')}m`,
                status: saldo >= 0 ? 'positivo' : 'negativo',
                atualizado_em: banco.updated_at
            };
        });

        // 4. Ordena: negativos primeiro (mais críticos)
        relatorio.sort((a, b) => a.saldo_minutos - b.saldo_minutos);

        return res.json(relatorio);

    } catch (err) {
        return res.status(500).json({ error: 'Erro interno.', detalhe: err.message });
    }
};

// =========================================
// RELATÓRIO DE FÉRIAS (REVISADO)
// =========================================
exports.relatorioFerias = async (req, res) => {
    const { tenant_id } = req.query;

    if (!tenant_id) {
        return res.status(400).json({ error: 'tenant_id é obrigatório.' });
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

            // Identifica a férias PENDENTE mais antiga usando a data_ferias_prevista
            const pendenteMaisAntiga = pendentes.length > 0
                ? pendentes.reduce((maisAntiga, atual) => {
                    return new Date(atual.data_ferias_prevista) < new Date(maisAntiga.data_ferias_prevista)
                        ? atual
                        : maisAntiga;
                })
                : null;

            // Identifica a última férias cumprida apenas para exibir a data no front-end
            const ultimaCumprida = cumpridas.length > 0
                ? cumpridas.reduce((maisRecente, atual) => {
                    return new Date(atual.data_fim || atual.data_inicio) >
                        new Date(maisRecente.data_fim || maisRecente.data_inicio)
                        ? atual
                        : maisRecente;
                })
                : null;

            // Passamos APENAS a pendente mais antiga para a função de cálculo
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
// RELATÓRIO DE AFASTAMENTOS
// =========================================
exports.relatorioAfastamentos = async (req, res) => {
    const { tenant_id } = req.query;

    if (!tenant_id) {
        return res.status(400).json({ error: 'tenant_id é obrigatório.' });
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
// Funções auxiliares para calcular as cores
// =========================================
const calcularCorRisco = (score) => {
    if (score == null) return 'cinza'; // Caso não tenha nota
    if (score < 50) return 'verde';
    if (score < 80) return 'amarelo';
    return 'vermelho'; // 80 ou mais
};

const calcularCorEngajamento = (score) => {
    if (score == null) return 'cinza';
    if (score < 40) return 'vermelho';
    if (score <= 60) return 'amarelo'; // Entre 40 e 60
    return 'verde'; // Maior que 60
};

const calcularCorPromocao = (score) => {
    if (score == null) return 'cinza';
    if (score > 50) return 'verde';
    return 'cinza'; // 50 ou menos
};

// =========================================
// Listar Relatórios de People Analytics
// =========================================
exports.listarRelatoriosPA = async (req, res) => {
    try {
        const tenant_id = Number(req.user.tenant_id);
        const gerente_id = String(req.user.id);

        // Busca apenas as colunas necessárias para o front-end
        const { data, error } = await supabase
            .from('people_analytics')
            .select(`
                id,
                nome,
                cargo,
                mes_referencia,
                score_burnout,
                score_turnover,
                score_engajamento,
                score_elegibilidade_promocao,
                analise_pa,
                sentimento_predominante
            `)
            .eq('tenant_id', tenant_id)
            .eq('gerente_id', gerente_id)
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        // Mapeia os dados do banco adicionando as cores calculadas
        const relatoriosProcessados = data.map(funcionario => {
            return {
                ...funcionario,
                cores: {
                    burnout: calcularCorRisco(funcionario.score_burnout),
                    turnover: calcularCorRisco(funcionario.score_turnover),
                    engajamento: calcularCorEngajamento(funcionario.score_engajamento),
                    promocao: calcularCorPromocao(funcionario.score_elegibilidade_promocao)
                }
            };
        });

        return res.status(200).json(relatoriosProcessados);
    } catch (err) {
        return res.status(500).json({ error: 'Erro interno ao buscar relatórios de People Analytics.' });
    }
};