CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('aguardando_pagamento', 'processando', 'pago', 'cancelado', 'rejeitado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE registration_status AS ENUM ('rascunho', 'aguardando_pagamento', 'confirmada', 'cancelada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.inscricoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  tipo_inscricao TEXT NOT NULL CHECK (tipo_inscricao IN ('pra_mim', 'para_jovem')),
  nome_participante TEXT NOT NULL,
  nome_inscrito_por TEXT,
  idade INTEGER CHECK (idade IS NULL OR idade BETWEEN 0 AND 120),
  classificacao_idade TEXT NOT NULL CHECK (classificacao_idade IN ('Menor de idade', 'Maior de idade', 'Não informado')),
  nome_responsavel TEXT,
  telefone_responsavel TEXT,
  telefone_contato TEXT NOT NULL,
  email_contato TEXT,
  pais TEXT DEFAULT 'Brasil',
  uf TEXT,
  cidade TEXT NOT NULL,
  bairro TEXT NOT NULL,
  sede_regional TEXT NOT NULL,
  lider_responsavel TEXT NOT NULL,
  igreja TEXT,
  area_desejada TEXT,
  instrumentos TEXT,
  tem_experiencia TEXT,
  tempo_experiencia TEXT,
  serve_ministerio TEXT,
  disponibilidade TEXT,
  ajuda_financeira TEXT,
  observacoes TEXT,
  status_pagamento payment_status NOT NULL DEFAULT 'aguardando_pagamento',
  status_inscricao registration_status NOT NULL DEFAULT 'aguardando_pagamento',
  payment_id TEXT,
  external_reference UUID UNIQUE,
  valor NUMERIC(10,2) NOT NULL DEFAULT 29.00,
  data_pagamento TIMESTAMPTZ,
  webhook_recebido_em TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);


CREATE TABLE IF NOT EXISTS public.inscricao_pagamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inscricao_id UUID NOT NULL REFERENCES public.inscricoes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payment_id TEXT NOT NULL,
  external_reference UUID NOT NULL,
  status TEXT NOT NULL,
  status_detail TEXT,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_inscricoes_nome ON public.inscricoes USING gin (to_tsvector('portuguese', coalesce(nome_participante, '') || ' ' || coalesce(nome_inscrito_por, '')));
CREATE INDEX IF NOT EXISTS idx_inscricoes_telefone ON public.inscricoes (telefone_contato);
CREATE INDEX IF NOT EXISTS idx_inscricoes_cidade ON public.inscricoes (cidade);
CREATE INDEX IF NOT EXISTS idx_inscricoes_sede ON public.inscricoes (sede_regional);
CREATE INDEX IF NOT EXISTS idx_inscricoes_status_pagamento ON public.inscricoes (status_pagamento);
CREATE INDEX IF NOT EXISTS idx_inscricoes_status_inscricao ON public.inscricoes (status_inscricao);
CREATE INDEX IF NOT EXISTS idx_inscricoes_created_at ON public.inscricoes (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inscricoes_external_reference ON public.inscricoes (external_reference);
CREATE INDEX IF NOT EXISTS idx_inscricoes_payment_id ON public.inscricoes (payment_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_inscricao ON public.inscricao_pagamentos (inscricao_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pagamentos_payment_id ON public.inscricao_pagamentos (payment_id);

CREATE OR REPLACE FUNCTION public.set_inscricoes_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  NEW.external_reference = NEW.id;
  IF NEW.idade IS NULL THEN NEW.classificacao_idade = 'Não informado';
  ELSIF NEW.idade < 18 THEN NEW.classificacao_idade = 'Menor de idade';
  ELSE NEW.classificacao_idade = 'Maior de idade';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_inscricoes_updated_at ON public.inscricoes;
CREATE TRIGGER trg_inscricoes_updated_at BEFORE INSERT OR UPDATE ON public.inscricoes FOR EACH ROW EXECUTE FUNCTION public.set_inscricoes_updated_at();

CREATE OR REPLACE VIEW public.inscricoes_dashboard AS
SELECT
  count(*)::int AS total_inscricoes,
  count(*) FILTER (WHERE status_inscricao = 'confirmada')::int AS total_confirmadas,
  count(*) FILTER (WHERE status_pagamento = 'aguardando_pagamento')::int AS total_aguardando_pagamento,
  count(*) FILTER (WHERE status_pagamento = 'pago')::int AS total_pagamentos_aprovados,
  count(*) FILTER (WHERE status_pagamento IN ('aguardando_pagamento','processando'))::int AS total_pagamentos_pendentes,
  count(*) FILTER (WHERE classificacao_idade = 'Menor de idade')::int AS total_menores,
  count(*) FILTER (WHERE classificacao_idade = 'Maior de idade')::int AS total_maiores
FROM public.inscricoes;

ALTER TABLE public.inscricoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inscricao_pagamentos ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Public can create registrations" ON public.inscricoes FOR INSERT TO anon, authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Authenticated can manage registrations" ON public.inscricoes FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Authenticated can read payment history" ON public.inscricao_pagamentos FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
