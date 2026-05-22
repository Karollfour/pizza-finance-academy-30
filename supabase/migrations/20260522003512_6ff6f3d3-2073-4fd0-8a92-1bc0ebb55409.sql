ALTER TABLE public.sabores_pizza ADD COLUMN IF NOT EXISTS cor TEXT NOT NULL DEFAULT '#9CA3AF';

UPDATE public.sabores_pizza SET cor = '#FCD34D' WHERE lower(nome) = 'mussarela';
UPDATE public.sabores_pizza SET cor = '#EF4444' WHERE lower(nome) = 'calabresa';
UPDATE public.sabores_pizza SET cor = '#22C55E' WHERE lower(nome) = 'portuguesa';
UPDATE public.sabores_pizza SET cor = '#F97316' WHERE lower(nome) = 'pepperoni';