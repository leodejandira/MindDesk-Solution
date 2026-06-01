-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.atestados (
  id integer NOT NULL DEFAULT nextval('atestados_id_seq'::regclass),
  tenant_id integer NOT NULL,
  usuario_id uuid,
  data_emissao date NOT NULL,
  dias_afastamento integer NOT NULL,
  motivo_cid text,
  url_arquivo text,
  status text DEFAULT 'em_analise'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT atestados_pkey PRIMARY KEY (id),
  CONSTRAINT atestados_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id)
);
CREATE TABLE public.banco_horas (
  id integer NOT NULL DEFAULT nextval('banco_horas_id_seq'::regclass),
  usuario_id uuid NOT NULL,
  tenant_id integer NOT NULL,
  saldo_minutos integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT banco_horas_pkey PRIMARY KEY (id),
  CONSTRAINT banco_horas_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id)
);
CREATE TABLE public.cursos (
  id integer NOT NULL DEFAULT nextval('cursos_id_seq'::regclass),
  tenant_id integer,
  usuario_id uuid,
  titulo text NOT NULL,
  link text NOT NULL,
  descricao text,
  criado_por uuid,
  created_at timestamp with time zone DEFAULT now(),
  status text,
  prazo_dias integer,
  CONSTRAINT cursos_pkey PRIMARY KEY (id),
  CONSTRAINT cursos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id),
  CONSTRAINT cursos_criado_por_fkey FOREIGN KEY (criado_por) REFERENCES public.usuarios(id)
);
CREATE TABLE public.ferias (
  id integer NOT NULL DEFAULT nextval('ferias_id_seq1'::regclass),
  usuario_id uuid NOT NULL,
  tenant_id integer NOT NULL,
  data_registro timestamp with time zone DEFAULT now(),
  data_ferias_prevista date NOT NULL,
  status_ferias text NOT NULL CHECK (status_ferias = ANY (ARRAY['pendente'::text, 'cumprida'::text])),
  data_inicio date,
  data_fim date,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ferias_pkey PRIMARY KEY (id),
  CONSTRAINT ferias_usuario_id_fkey1 FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id)
);
CREATE TABLE public.historico_conversas (
  id integer NOT NULL DEFAULT nextval('historico_conversas_id_seq'::regclass),
  tenant_id integer NOT NULL,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  usuario_id uuid,
  CONSTRAINT historico_conversas_pkey PRIMARY KEY (id),
  CONSTRAINT historico_conversas_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id)
);
CREATE TABLE public.historico_cursos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id integer NOT NULL,
  usuario_id uuid NOT NULL,
  nome_curso character varying NOT NULL,
  obrigatorio boolean DEFAULT false,
  prazo_limite date,
  data_conclusao date NOT NULL,
  concluido_no_prazo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT historico_cursos_pkey PRIMARY KEY (id)
);
CREATE TABLE public.historico_promocoes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id integer NOT NULL,
  usuario_id uuid NOT NULL,
  cargo_anterior character varying,
  cargo_novo character varying NOT NULL,
  data_alteracao timestamp with time zone NOT NULL,
  motivo character varying DEFAULT 'Promoção'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT historico_promocoes_pkey PRIMARY KEY (id)
);
CREATE TABLE public.legado_ferias (
  id integer NOT NULL DEFAULT nextval('ferias_id_seq'::regclass),
  tenant_id integer NOT NULL,
  usuario_id uuid,
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  status text DEFAULT 'pendente'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT legado_ferias_pkey PRIMARY KEY (id),
  CONSTRAINT ferias_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id)
);
CREATE TABLE public.new_pontos (
  id integer NOT NULL DEFAULT nextval('new_pontos_id_seq'::regclass),
  tenant_id integer NOT NULL,
  usuario_id uuid NOT NULL,
  horario timestamp with time zone NOT NULL DEFAULT now(),
  tipo text,
  observacao text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT new_pontos_pkey PRIMARY KEY (id),
  CONSTRAINT pontos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id)
);
CREATE TABLE public.niveis_carreira (
  id integer NOT NULL,
  nome_nivel character varying NOT NULL UNIQUE,
  CONSTRAINT niveis_carreira_pkey PRIMARY KEY (id)
);
CREATE TABLE public.pdf_vectors (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pdf_id bigint NOT NULL,
  tenant_id bigint NOT NULL,
  chunk_text text NOT NULL,
  embedding USER-DEFINED NOT NULL,
  chunk_index integer NOT NULL,
  embedding_model_used text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT pdf_vectors_pkey PRIMARY KEY (id)
);
CREATE TABLE public.pdfs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id integer NOT NULL,
  nome text,
  url text,
  criado_em timestamp without time zone DEFAULT now(),
  CONSTRAINT pdfs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.people_analytics (
  usuario_id uuid NOT NULL,
  nome text,
  created_at timestamp with time zone,
  data_contratacao date,
  gerente_geral text,
  tenant_id integer,
  cargo text,
  gerente_id uuid,
  nivel_cargo integer,
  faltas_ultimo_mes integer,
  horas_extras_ultimo_mes numeric,
  qtd_atrasos_ultimo_mes integer,
  horas_atraso_ultimo_mes numeric,
  media_atrasos_trimestre numeric,
  ausencias_atestado_ultimo_mes integer,
  media_ausencia_atestado_trimestre numeric,
  tempo_meses_ultimas_férias numeric,
  qtt_promocoes integer,
  tempo_ultima_promocao numeric,
  cursos_obg_vencidos integer,
  cursos_obg_no_prazo integer,
  cursos_obg_adiantados integer,
  qtt_cursos_opcioanis_2anos integer,
  score_humor integer,
  sentimento_predominante text,
  resumo_ia text,
  score_burnout integer,
  score_turnover integer,
  score_engajamento integer,
  score_elegibilidade_promocao integer,
  posicao_burnout text,
  posicao_turnover text,
  posicao_engajamento text,
  posicao_elegibilidade_promocao text,
  analise_pa text,
  mes_referencia text,
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  CONSTRAINT people_analytics_pkey PRIMARY KEY (id)
);
CREATE TABLE public.pontos (
  id integer NOT NULL DEFAULT nextval('pontos_id_seq'::regclass),
  tenant_id integer NOT NULL,
  usuario_id uuid NOT NULL,
  horario timestamp with time zone NOT NULL DEFAULT now(),
  tipo text,
  observacao text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT pontos_pkey PRIMARY KEY (id),
  CONSTRAINT pontos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id)
);
CREATE TABLE public.predicoes_humanograma (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id integer NOT NULL,
  usuario_id uuid NOT NULL UNIQUE,
  risco_turnover integer,
  risco_burnout integer,
  chance_promocao integer,
  recomendacao_acao character varying,
  resumo_ia text,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT predicoes_humanograma_pkey PRIMARY KEY (id)
);
CREATE TABLE public.pulse (
  id integer NOT NULL DEFAULT nextval('pulse_id_seq'::regclass),
  tenant_id integer NOT NULL,
  usuario_id uuid NOT NULL UNIQUE,
  score_humor integer,
  sentimento_predominante text,
  resumo_ia text,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT pulse_pkey PRIMARY KEY (id)
);
CREATE TABLE public.usuarios (
  id uuid NOT NULL,
  nome text,
  email text,
  created_at timestamp without time zone DEFAULT now(),
  role text DEFAULT 'viewer'::text,
  data_contratacao date,
  gerente_geral text,
  tenant_id integer DEFAULT 1,
  cargo text,
  saldo_ferias integer DEFAULT 30,
  gerente_id uuid,
  nivel_cargo integer DEFAULT 3,
  CONSTRAINT usuarios_pkey PRIMARY KEY (id),
  CONSTRAINT usuarios_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT usuarios_gerente_id_fkey FOREIGN KEY (gerente_id) REFERENCES public.usuarios(id),
  CONSTRAINT fk_usuarios_nivel FOREIGN KEY (nivel_cargo) REFERENCES public.niveis_carreira(id)
);