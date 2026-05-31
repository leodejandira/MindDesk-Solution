# MindDesk RH - Microserviço de Gestão de Recursos Humanos (API RESTful)

Este ecossistema em Node.js (Express) atua como o motor transacional (Backend Central) da plataforma MindDesk RH. A sua principal responsabilidade é gerenciar a lógica de negócio de operações de departamento pessoal, orquestrar integrações com o provedor de banco de dados e armazenamento (Supabase), e garantir o isolamento e validação de contratos estritos para todas as chamadas HTTP provenientes de instâncias front-end e sub-sistemas.

## Arquitetura do Ecossistema MindDesk

A aplicação adota uma arquitetura orientada a serviços (SOA), sem conservação de estado no servidor (stateless). A camada de roteamento atua como um Gateway de Regras de Negócio, interceptando requisições, validando sessões de autenticação, e encaminhando cargas de processamento intensivas (como upload de binários) e transações relacionais aos controladores apropriados.

## Estrutura de Pastas e SRP (Single Responsibility Principle)

A aplicação segue a separação estrita de conceitos em camadas isoladas:

```text
/backend
├── app.js                      # Entrypoint do servidor, middlewares globais e montagem de rotas
├── routes/                     # Camada de definição de endpoints REST e mapeamento de verbos HTTP
│   ├── atestados.routes.js     # Domínio de gestão documental médica
│   ├── auth.js                 # Domínio de identidade e emissão de tokens
│   └── usuarios.routes.js      # Domínio de administração de capital humano
└── controllers/                # Camada de Regras de Negócio e I/O com Banco de Dados
    ├── atestados.controller.js # Operações CRUD e processamento de arquivos físicos (Multer)
    └── auth.controller.js      # Rotinas de criptografia, validação e verificação de JWT
```

## Detalhamento de Módulos, Camadas e Funções

### 1. Camada de Roteamento Central e Middlewares (app.js)

Atua como a espinha dorsal do microserviço. Centraliza todas as chamadas, aplica os cabeçalhos de CORS (Cross-Origin Resource Sharing) e efetua o parse de payloads (JSON e Form-Data). As rotas são separadas por domínio para garantir coesão.

```javascript
const express = require('express');
const cors = require('cors');

// Mapeamento de Domínios
const usuariosRoutes = require('./routes/usuarios.routes');
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat.routes');
const atestadoRoutes = require('./routes/atestados.routes');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Injeção dos prefixos de rotas (Isolamento Semântico)
app.use('/auth', authRoutes);
app.use('/usuarios', usuariosRoutes);
app.use('/chat', chatRoutes);
app.use('/atestados', atestadoRoutes);

app.get('/', (req, res) => {
    res.send('API rodando');
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
```

### 2. Camada de I/O de Arquivos e Lógica Transacional (controllers/atestados.controller.js)

Remove a carga de processamento do roteador e concentra-se nas regras de negócio. Este controlador implementa funções exclusivas para recebimento de arquivos multipart/form-data, upload seguro para o storage do Supabase e gestão de estado transacional da tabela.

```javascript
const supabase = require('../config/supabase');

// Listagem Assíncrona de Pendências para Gerência
exports.listarPendentes = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('atestados')
            .select(`
                *,
                usuarios (nome, cargo) 
            `)
            .eq('status', 'pendente')
            .order('data_emissao', { ascending: false });

        if (error) throw error;
        return res.status(200).json(data);
    } catch (err) {
        console.error("[DB ERROR] Falha ao listar pendências:", err);
        return res.status(500).json({ error: 'Erro ao buscar atestados pendentes.' });
    }
};

// Delegação de Aprovação Hierárquica
exports.atualizarStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; 

    try {
        const { data, error } = await supabase
            .from('atestados')
            .update({ status })
            .eq('id', id)
            .select();

        if (error) throw error;
        return res.status(200).json({ message: `Atestado atualizado para ${status}!` });
    } catch (err) {
        console.error("[PATCH ERROR] Falha na atualização de status:", err);
        return res.status(500).json({ error: 'Erro ao atualizar o atestado.' });
    }
};
```

### 3. Contratos de Interface (APIs RESTful)

Garante que serviços consumidores mantenham contratos rigorosos e imutáveis durante a transmissão do payload.

* **POST /auth/login:** Requer `email` e `password` JSON. Retorna um JWT assinado pelo backend com hierarquia explícita (Role).
* **POST /atestados/upload:** Intercepta `multipart/form-data`. Requer `tenant_id`, `usuario_id`, `data_emissao`, `dias_afastamento`, `motivo_cid` e o arquivo binário validado pelo Multer. 
* **GET /atestados/pendentes:** Requer o cabeçalho `Authorization: Bearer <token>` para atestar integridade RBAC, retornando a árvore hierárquica do colaborador solicitante.
* **PATCH /atestados/:id/status:** Atualiza o fluxo de aprovação do documento. Requer um corpo JSON contendo o novo `status` ('aprovado' ou 'recusado').

## Segurança, Prontidão para Produção e Escalabilidade

A refatoração preparou este microserviço para os seguintes cenários operacionais:

1.  **Gestão de Estados Semânticos (Stateless JWT):** Como a API Node.js não preserva contexto de estado em memória (utilizando tokens JWT injetados no cabeçalho), a infraestrutura suporta escalabilidade horizontal sem a necessidade de sincronização de sessões entre réplicas.
2.  **Delegação de Segurança Perimetral (RLS Supabase):** O backend abstrai regras complexas de acesso delegando-as ao banco de dados PostgreSQL subjacente (Row-Level Security), onde tabelas e buckets operam sob restrições diretas associadas ao `tenant_id` e permissões lógicas de nível `authenticated`.
3.  **Mitigação de Bloqueio de Thread:** Rotinas pesadas, como transmissões em buffer para o object storage, empregam fluxos estritamente assíncronos (`async/await` no Express). Isso minimiza gargalos de concorrência e garante que o Event Loop processe outras requisições operacionais com alta disponibilidade.
