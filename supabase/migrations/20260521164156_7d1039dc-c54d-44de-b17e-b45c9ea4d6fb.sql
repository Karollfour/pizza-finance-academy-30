
-- Fix: usar chave correta proximo_numero_rodada
CREATE OR REPLACE FUNCTION public.obter_proximo_numero_rodada()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  novo INTEGER;
  max_existente INTEGER;
BEGIN
  SELECT COALESCE(MAX(numero), 0) INTO max_existente FROM public.rodadas;

  INSERT INTO public.contadores_jogo (chave, valor)
  VALUES ('proximo_numero_rodada', GREATEST(max_existente + 1, 1))
  ON CONFLICT (chave) DO UPDATE
    SET valor = GREATEST(public.contadores_jogo.valor + 1, max_existente + 1, 1),
        updated_at = now()
  RETURNING valor INTO novo;

  RETURN novo;
END;
$$;

-- Reset completo do jogo: limpa tabelas e reseta contador para 1
CREATE OR REPLACE FUNCTION public.resetar_contadores_jogo()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.historico_sabores_rodada;
  DELETE FROM public.pedidos_rodada;
  DELETE FROM public.pizzas;
  DELETE FROM public.compras;
  DELETE FROM public.rodadas;

  UPDATE public.equipes SET gasto_total = 0, ganho_total = 0;

  INSERT INTO public.contadores_jogo (chave, valor)
  VALUES ('proximo_numero_rodada', 1)
  ON CONFLICT (chave) DO UPDATE
    SET valor = 1, updated_at = now();
END;
$$;

-- Garantir uniqueness na chave
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contadores_jogo_chave_key'
  ) THEN
    ALTER TABLE public.contadores_jogo ADD CONSTRAINT contadores_jogo_chave_key UNIQUE (chave);
  END IF;
END$$;

-- Sincronizar o contador atual com a realidade
UPDATE public.contadores_jogo
SET valor = GREATEST((SELECT COALESCE(MAX(numero), 0) FROM public.rodadas) + 1, 1),
    updated_at = now()
WHERE chave = 'proximo_numero_rodada';
