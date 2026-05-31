CREATE OR REPLACE FUNCTION public.resetar_gasto_total_ao_finalizar_rodada()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'finalizada' AND (OLD.status IS DISTINCT FROM 'finalizada') THEN
    UPDATE public.equipes SET gasto_total = 0, ganho_total = 0;
  END IF;
  RETURN NEW;
END;
$function$;