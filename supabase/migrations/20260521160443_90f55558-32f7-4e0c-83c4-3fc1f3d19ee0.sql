
-- Tabelas
CREATE TABLE public.equipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  saldo_inicial NUMERIC NOT NULL DEFAULT 0,
  gasto_total NUMERIC NOT NULL DEFAULT 0,
  ganho_total NUMERIC NOT NULL DEFAULT 0,
  professor_responsavel TEXT,
  cor_tema TEXT,
  emblema TEXT,
  quantidade_pessoas INTEGER NOT NULL DEFAULT 1,
  ordem INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.rodadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'aguardando',
  tempo_limite INTEGER NOT NULL DEFAULT 300,
  iniciou_em TIMESTAMPTZ,
  finalizou_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.sabores_pizza (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  imagem TEXT,
  disponivel BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  preco NUMERIC NOT NULL DEFAULT 0,
  tipo TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.produtos_loja (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  imagem TEXT,
  valor_unitario NUMERIC NOT NULL DEFAULT 0,
  unidade TEXT NOT NULL DEFAULT 'un',
  durabilidade INTEGER,
  disponivel BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.sabor_ingredientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sabor_id UUID NOT NULL,
  produto_id UUID NOT NULL,
  quantidade NUMERIC NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.compras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipe_id UUID NOT NULL,
  produto_id UUID,
  rodada_id UUID,
  tipo TEXT NOT NULL,
  descricao TEXT,
  quantidade NUMERIC,
  valor_total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.pizzas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipe_id UUID NOT NULL,
  rodada_id UUID NOT NULL,
  sabor_id UUID,
  status TEXT NOT NULL DEFAULT 'aguardando',
  resultado TEXT,
  justificativa_reprovacao TEXT,
  avaliado_por TEXT,
  tempo_producao_segundos INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.historico_sabores_rodada (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rodada_id UUID NOT NULL,
  sabor_id UUID NOT NULL,
  ordem INTEGER NOT NULL,
  definido_por TEXT,
  definido_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.pedidos_rodada (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rodada_id UUID NOT NULL,
  sabor_id UUID NOT NULL,
  ordem INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'aguardando',
  pizzas_entregues INTEGER NOT NULL DEFAULT 0,
  equipes_que_entregaram TEXT[],
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  ativado_em TIMESTAMPTZ,
  concluido_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.configuracoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chave TEXT NOT NULL UNIQUE,
  valor TEXT NOT NULL,
  descricao TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.contadores_jogo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chave TEXT NOT NULL UNIQUE,
  valor INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilita RLS e libera acesso público (simulador educacional aberto)
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'equipes','rodadas','sabores_pizza','itens','produtos_loja',
    'sabor_ingredientes','compras','pizzas','historico_sabores_rodada',
    'pedidos_rodada','configuracoes','contadores_jogo'
  ])
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "public_all_%s" ON public.%I FOR ALL USING (true) WITH CHECK (true)', t, t);
  END LOOP;
END $$;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.equipes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rodadas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sabores_pizza;
ALTER PUBLICATION supabase_realtime ADD TABLE public.itens;
ALTER PUBLICATION supabase_realtime ADD TABLE public.produtos_loja;
ALTER PUBLICATION supabase_realtime ADD TABLE public.compras;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pizzas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.historico_sabores_rodada;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pedidos_rodada;
ALTER PUBLICATION supabase_realtime ADD TABLE public.configuracoes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contadores_jogo;

-- Função: obter próximo número de rodada
CREATE OR REPLACE FUNCTION public.obter_proximo_numero_rodada()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  novo INTEGER;
BEGIN
  INSERT INTO public.contadores_jogo (chave, valor)
  VALUES ('numero_rodada', 1)
  ON CONFLICT (chave) DO UPDATE
    SET valor = public.contadores_jogo.valor + 1,
        updated_at = now()
  RETURNING valor INTO novo;
  RETURN novo;
END;
$$;

-- Função: resetar contadores
CREATE OR REPLACE FUNCTION public.resetar_contadores_jogo()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.contadores_jogo SET valor = 0, updated_at = now();
END;
$$;

-- Trigger: atualiza ganho_total quando pizza é aprovada
CREATE OR REPLACE FUNCTION public.atualizar_ganho_equipe_pizza_aprovada()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.resultado = 'aprovada' AND (OLD.resultado IS DISTINCT FROM 'aprovada') THEN
    UPDATE public.equipes
       SET ganho_total = ganho_total + 30
     WHERE id = NEW.equipe_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pizza_aprovada
AFTER UPDATE ON public.pizzas
FOR EACH ROW EXECUTE FUNCTION public.atualizar_ganho_equipe_pizza_aprovada();

-- updated_at automático
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_pizzas_updated BEFORE UPDATE ON public.pizzas
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_pedidos_updated BEFORE UPDATE ON public.pedidos_rodada
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_configs_updated BEFORE UPDATE ON public.configuracoes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_contadores_updated BEFORE UPDATE ON public.contadores_jogo
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Índices
CREATE INDEX idx_pizzas_rodada ON public.pizzas(rodada_id);
CREATE INDEX idx_pizzas_equipe ON public.pizzas(equipe_id);
CREATE INDEX idx_compras_equipe ON public.compras(equipe_id);
CREATE INDEX idx_hsr_rodada ON public.historico_sabores_rodada(rodada_id);
CREATE INDEX idx_pedidos_rodada ON public.pedidos_rodada(rodada_id);
CREATE INDEX idx_rodadas_numero ON public.rodadas(numero);
