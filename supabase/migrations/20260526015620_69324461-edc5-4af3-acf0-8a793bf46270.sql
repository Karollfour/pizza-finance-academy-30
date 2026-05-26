ALTER TABLE public.pizzas ADD COLUMN IF NOT EXISTS enviada_para_avaliacao BOOLEAN NOT NULL DEFAULT false;

UPDATE public.pizzas SET enviada_para_avaliacao = true WHERE status IN ('pronta','avaliada');

CREATE INDEX IF NOT EXISTS idx_pizzas_enviada_avaliacao ON public.pizzas(enviada_para_avaliacao) WHERE enviada_para_avaliacao = true;