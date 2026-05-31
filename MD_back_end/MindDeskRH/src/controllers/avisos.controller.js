const supabase = require('../config/supabase');

// =========================================
// HELPER: Calcula situação de férias (Lógica Blindada)
// =========================================
function calcularSituacaoFerias(pendenteMaisAntiga) {
    if (!pendenteMaisAntiga || !pendenteMaisAntiga.data_ferias_prevista) {
        return null; // Sem pendências, sem avisos
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

    let situacao, aviso, aviso_funcionario, prioridade;

    if (hoje >= dataVencimento) {
        situacao = 'Crítica';
        prioridade = 'critica';
        aviso = 'Férias vencidas. Risco de marcação compulsória e pagamento em dobro.';
        aviso_funcionario = 'Atenção! Suas férias estão vencidas. Procure o RH urgentemente.';
    } else if (mesesDesdeInicio >= 20) {
        situacao = 'Atrasada';
        prioridade = 'alta';
        aviso = 'Férias a vencer em breve. Risco de compulsória nos próximos dias.';
        aviso_funcionario = 'Suas férias estão quase vencendo! Fale com seu gestor para agendar.';
    } else if (mesesDesdeInicio >= 16) {
        situacao = 'Atrasada';
        prioridade = 'alta';
        aviso = 'Férias pendentes com prazo curto para agendamento.';
        aviso_funcionario = 'Você tem férias pendentes. Que tal planejar seu descanso?';
    } else if (mesesDesdeInicio >= 12) {
        situacao = 'Disponível';
        prioridade = 'media';
        aviso = 'Férias disponíveis para agendamento.';
        aviso_funcionario = 'Oba! Suas férias já estão disponíveis para serem agendadas.';
    } else if (mesesDesdeInicio >= 10) {
        situacao = 'Disponível em breve';
        prioridade = 'baixa';
        aviso = `Férias disponíveis em ${12 - mesesDesdeInicio} mês(es).`;
        aviso_funcionario = `Faltam ${12 - mesesDesdeInicio} mês(es) para suas férias ficarem disponíveis.`;
    } else {
        return null; // Tudo super em dia, não poluir o mural
    }

    return {
        situacao,
        aviso, // Para o Gerente
        aviso_funcionario, // Para o Funcionário
        prioridade,
        meses_referencia: mesesDesdeInicio,
        data_vencimento: dataVencimento.toISOString().split('T')[0]
    };
}

// =========================================
// MURAL DO GERENTE
// =========================================
exports.listarAvisos = async (req, res) => {
    const gerente_id = req.user.id;
    const tenant_id = req.user.tenant_id;

    if (!tenant_id) return res.status(403).json({ error: 'Tenant inválido.' });

    try {
        const avisos = [];
        // Normaliza "hoje" para meia-noite, evitando bugs de fuso horário
        const hoje = new Date();
        const hojeDataStr = hoje.toISOString().split('T')[0];
        const hojeDataNormalizada = new Date(hojeDataStr);

        const { data: usuarios, error: userError } = await supabase
            .from('usuarios')
            .select('id, nome, cargo, gerente_id, tenant_id')
            .eq('tenant_id', tenant_id)
            .eq('gerente_id', gerente_id);

        if (userError) return res.status(500).json({ error: userError.message });

        const usuarioIds = usuarios?.map(u => u.id) || [];
        if (usuarioIds.length === 0) return res.json([]);

        // 1. PROCESSAR AVISOS DE FÉRIAS
        const { data: todasFerias, error: feriasError } = await supabase
            .from('ferias')
            .select('*, usuarios(nome, cargo, gerente_geral)')
            .eq('tenant_id', tenant_id)
            .in('usuario_id', usuarioIds)
            .eq('status_ferias', 'pendente'); // Trazemos só as pendentes para performance

        if (feriasError) return res.status(500).json({ error: feriasError.message });

        const feriasPorUsuario = {};
        todasFerias?.forEach(f => {
            if (!feriasPorUsuario[f.usuario_id]) {
                feriasPorUsuario[f.usuario_id] = { pendentes: [], usuario: f.usuarios };
            }
            feriasPorUsuario[f.usuario_id].pendentes.push(f);
        });

        Object.entries(feriasPorUsuario).forEach(([usuario_id, { pendentes, usuario }]) => {
            const pendenteMaisAntiga = pendentes.reduce((maisAntiga, atual) => {
                return new Date(atual.data_ferias_prevista) < new Date(maisAntiga.data_ferias_prevista)
                    ? atual
                    : maisAntiga;
            });

            const calc = calcularSituacaoFerias(pendenteMaisAntiga);

            if (calc && calc.aviso) {
                const nomeFunc = usuario?.nome || 'Funcionário';
                avisos.push({
                    tipo: 'férias',
                    prioridade: calc.prioridade,
                    status: calc.situacao,
                    usuario_id,
                    nome: nomeFunc,
                    cargo: usuario?.cargo || '-',
                    mensagem: `${nomeFunc}: ${calc.aviso}`,
                    meses_referencia: calc.meses_referencia,
                    data_vencimento: calc.data_vencimento
                });
            }
        });

        // 2. PROCESSAR AVISOS DE ATESTADOS
        const { data: atestados, error: atestadoError } = await supabase
            .from('atestados')
            .select('*, usuarios(nome, cargo)')
            .eq('tenant_id', tenant_id)
            .in('usuario_id', usuarioIds)
            .eq('status', 'aprovado'); // Filtra apenas atestados validados

        if (atestadoError) return res.status(500).json({ error: atestadoError.message });

        atestados?.forEach(atestado => {
            if (!atestado.data_emissao) return;

            const dataEmissao = new Date(atestado.data_emissao);
            const dataFim = new Date(dataEmissao);
            dataFim.setDate(dataFim.getDate() + Number(atestado.dias_afastamento || 0));
            
            const fimDataNormalizada = new Date(dataFim.toISOString().split('T')[0]);

            // Se o atestado ainda está vigente
            if (fimDataNormalizada >= hojeDataNormalizada) {
                const diasRestantes = Math.ceil((fimDataNormalizada - hojeDataNormalizada) / (1000 * 60 * 60 * 24));
                const nomeFunc = atestado.usuarios?.nome || 'Funcionário';

                avisos.push({
                    tipo: 'afastamento',
                    prioridade: 'alta', // Atestado sempre é tratado como prioridade alta para cobertura
                    usuario_id: atestado.usuario_id,
                    nome: nomeFunc,
                    cargo: atestado.usuarios?.cargo || '-',
                    mensagem: `${nomeFunc} está em licença médica por ${atestado.dias_afastamento} dia(s). Retorno previsto em ${diasRestantes} dia(s).`,
                    dias_restantes: diasRestantes,
                    data_fim: dataFim.toISOString().split('T')[0]
                });
            }
        });

        // Ordenação unificada por prioridade
        const ordemPrioridade = { critica: 0, alta: 1, media: 2, baixa: 3 };
        avisos.sort((a, b) => {
            const pa = ordemPrioridade[a.prioridade] ?? 99;
            const pb = ordemPrioridade[b.prioridade] ?? 99;
            if (pa !== pb) return pa - pb;
            return (b.meses_referencia || 0) - (a.meses_referencia || 0);
        });

        return res.json(avisos);
    } catch (err) {
        return res.status(500).json({ error: 'Erro interno.', detalhe: err.message });
    }
};

// =========================================
// MURAL DO FUNCIONÁRIO
// =========================================
exports.listarAvisosFuncionario = async (req, res) => {
    const usuario_id = req.user.id;
    const tenant_id = req.user.tenant_id;

    try {
        const avisos = [];
        const hoje = new Date();
        const hojeDataStr = hoje.toISOString().split('T')[0];
        const hojeDataNormalizada = new Date(hojeDataStr);

        // 1. FÉRIAS DO FUNCIONÁRIO
        const { data: pendentes, error: feriasError } = await supabase
            .from('ferias')
            .select('*')
            .eq('usuario_id', usuario_id)
            .eq('tenant_id', tenant_id)
            .eq('status_ferias', 'pendente');

        if (feriasError) return res.status(500).json({ error: feriasError.message });

        if (pendentes && pendentes.length > 0) {
            const pendenteMaisAntiga = pendentes.reduce((maisAntiga, atual) => {
                return new Date(atual.data_ferias_prevista) < new Date(maisAntiga.data_ferias_prevista)
                    ? atual
                    : maisAntiga;
            });

            const calc = calcularSituacaoFerias(pendenteMaisAntiga);

            if (calc && calc.aviso_funcionario) {
                avisos.push({
                    tipo: 'férias',
                    prioridade: calc.prioridade,
                    status: calc.situacao,
                    mensagem: calc.aviso_funcionario, // Usa o texto amigável focado no funcionário
                    meses_referencia: calc.meses_referencia,
                    data_vencimento: calc.data_vencimento
                });
            }
        }

        // 2. ATESTADOS DO FUNCIONÁRIO
        const { data: atestados, error: atestadoError } = await supabase
            .from('atestados')
            .select('*')
            .eq('tenant_id', tenant_id)
            .eq('usuario_id', usuario_id)
            .eq('status', 'aprovado');

        if (atestadoError) return res.status(500).json({ error: atestadoError.message });

        atestados?.forEach(atestado => {
            if (!atestado.data_emissao) return;

            const dataEmissao = new Date(atestado.data_emissao);
            const dataFim = new Date(dataEmissao);
            dataFim.setDate(dataFim.getDate() + Number(atestado.dias_afastamento || 0));
            
            const fimDataNormalizada = new Date(dataFim.toISOString().split('T')[0]);

            if (fimDataNormalizada >= hojeDataNormalizada) {
                const diasRestantes = Math.ceil((fimDataNormalizada - hojeDataNormalizada) / (1000 * 60 * 60 * 24));

                avisos.push({
                    tipo: 'afastamento',
                    prioridade: 'critica', // Ocultamos do dashboard principal colocando peso máximo se ele tentar acessar
                    mensagem: `Opa! Consta que você está de atestado médico. Seu foco agora deve ser a sua recuperação! Retorno previsto em ${diasRestantes} dia(s).`,
                    dias_restantes: diasRestantes,
                    data_fim: dataFim.toISOString().split('T')[0]
                });
            }
        });

        const ordemPrioridade = { critica: 0, alta: 1, media: 2, baixa: 3 };
        avisos.sort((a, b) => {
            const pa = ordemPrioridade[a.prioridade] ?? 99;
            const pb = ordemPrioridade[b.prioridade] ?? 99;
            if (pa !== pb) return pa - pb;
            return (b.meses_referencia || 0) - (a.meses_referencia || 0);
        });

        return res.json(avisos);
    } catch (err) {
        return res.status(500).json({ error: 'Erro interno.', detalhe: err.message });
    }
};