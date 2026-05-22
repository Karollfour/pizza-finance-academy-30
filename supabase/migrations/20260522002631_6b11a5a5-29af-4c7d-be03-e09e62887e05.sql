CREATE OR REPLACE FUNCTION public.resetar_contadores_jogo()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  TRUNCATE TABLE
    public.historico_sabores_rodada,
    public.pedidos_rodada,
    public.pizzas,
    public.compras,
    public.rodadas
  RESTART IDENTITY CASCADE;

  UPDATE public.equipes
     SET gasto_total = 0, ganho_total = 0
   WHERE id IS NOT NULL;

  INSERT INTO public.contadores_jogo (chave, valor)
  VALUES ('proximo_numero_rodada', 1)
  ON CONFLICT (chave) DO UPDATE
    SET valor = 1, updated_at = now();
END;
$function$;