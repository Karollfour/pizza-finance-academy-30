
ALTER TABLE public.historico_sabores_rodada
  ADD CONSTRAINT historico_sabores_rodada_sabor_id_fkey
  FOREIGN KEY (sabor_id) REFERENCES public.sabores_pizza(id) ON DELETE CASCADE;

ALTER TABLE public.historico_sabores_rodada
  ADD CONSTRAINT historico_sabores_rodada_rodada_id_fkey
  FOREIGN KEY (rodada_id) REFERENCES public.rodadas(id) ON DELETE CASCADE;

ALTER TABLE public.pizzas
  ADD CONSTRAINT pizzas_equipe_id_fkey FOREIGN KEY (equipe_id) REFERENCES public.equipes(id) ON DELETE CASCADE,
  ADD CONSTRAINT pizzas_rodada_id_fkey FOREIGN KEY (rodada_id) REFERENCES public.rodadas(id) ON DELETE CASCADE,
  ADD CONSTRAINT pizzas_sabor_id_fkey  FOREIGN KEY (sabor_id)  REFERENCES public.sabores_pizza(id) ON DELETE SET NULL;

ALTER TABLE public.compras
  ADD CONSTRAINT compras_equipe_id_fkey FOREIGN KEY (equipe_id) REFERENCES public.equipes(id) ON DELETE CASCADE,
  ADD CONSTRAINT compras_produto_id_fkey FOREIGN KEY (produto_id) REFERENCES public.produtos_loja(id) ON DELETE SET NULL,
  ADD CONSTRAINT compras_rodada_id_fkey FOREIGN KEY (rodada_id) REFERENCES public.rodadas(id) ON DELETE SET NULL;

ALTER TABLE public.sabor_ingredientes
  ADD CONSTRAINT sabor_ingredientes_sabor_id_fkey FOREIGN KEY (sabor_id) REFERENCES public.sabores_pizza(id) ON DELETE CASCADE,
  ADD CONSTRAINT sabor_ingredientes_produto_id_fkey FOREIGN KEY (produto_id) REFERENCES public.produtos_loja(id) ON DELETE CASCADE;

ALTER TABLE public.pedidos_rodada
  ADD CONSTRAINT pedidos_rodada_rodada_id_fkey FOREIGN KEY (rodada_id) REFERENCES public.rodadas(id) ON DELETE CASCADE,
  ADD CONSTRAINT pedidos_rodada_sabor_id_fkey FOREIGN KEY (sabor_id) REFERENCES public.sabores_pizza(id) ON DELETE CASCADE;
