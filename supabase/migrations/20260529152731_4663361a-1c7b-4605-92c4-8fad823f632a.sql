-- 1) Add 'tipo' column to produtos_loja (EQ = Equipamento, MP = Matéria Prima)
ALTER TABLE public.produtos_loja
  ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'MP';

-- Validation trigger (not CHECK constraint) for tipo
CREATE OR REPLACE FUNCTION public.validar_tipo_produto()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.tipo NOT IN ('EQ','MP') THEN
    RAISE EXCEPTION 'tipo deve ser EQ ou MP, recebido: %', NEW.tipo;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_tipo_produto ON public.produtos_loja;
CREATE TRIGGER trg_validar_tipo_produto
BEFORE INSERT OR UPDATE ON public.produtos_loja
FOR EACH ROW EXECUTE FUNCTION public.validar_tipo_produto();

-- 2) Add 'valor' (preço de venda) column to sabores_pizza
ALTER TABLE public.sabores_pizza
  ADD COLUMN IF NOT EXISTS valor NUMERIC NOT NULL DEFAULT 0;

-- 3) Trigger: ao finalizar rodada, resetar gasto_total de todas as equipes
CREATE OR REPLACE FUNCTION public.resetar_gasto_total_ao_finalizar_rodada()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'finalizada' AND (OLD.status IS DISTINCT FROM 'finalizada') THEN
    UPDATE public.equipes SET gasto_total = 0;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_resetar_gasto_total_rodada ON public.rodadas;
CREATE TRIGGER trg_resetar_gasto_total_rodada
AFTER UPDATE ON public.rodadas
FOR EACH ROW EXECUTE FUNCTION public.resetar_gasto_total_ao_finalizar_rodada();