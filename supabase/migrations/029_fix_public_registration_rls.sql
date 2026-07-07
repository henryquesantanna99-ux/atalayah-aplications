-- Ensure public registration inserts work even when RLS is enabled.
-- The application now inserts via the server-side service role, but these
-- grants/policies keep the database contract explicit and idempotent.

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT INSERT ON public.inscricoes TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inscricoes TO authenticated;
GRANT SELECT ON public.inscricoes_dashboard TO authenticated;
GRANT SELECT ON public.inscricao_pagamentos TO authenticated;

ALTER TABLE public.inscricoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inscricao_pagamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can create registrations" ON public.inscricoes;
CREATE POLICY "Public can create registrations"
  ON public.inscricoes
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can manage registrations" ON public.inscricoes;
CREATE POLICY "Authenticated can manage registrations"
  ON public.inscricoes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can read payment history" ON public.inscricao_pagamentos;
CREATE POLICY "Authenticated can read payment history"
  ON public.inscricao_pagamentos
  FOR SELECT
  TO authenticated
  USING (true);
