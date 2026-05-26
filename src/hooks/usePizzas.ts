
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Pizza } from '@/types/database';

export const usePizzas = (equipeId?: string, rodadaId?: string) => {
  const [pizzas, setPizzas] = useState<Pizza[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<any>(null);
  const isSubscribedRef = useRef(false);

  const fetchPizzas = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('pizzas')
        .select(`
          *,
          sabor:sabores_pizza(*)
        `);
      
      if (equipeId) {
        query = query.eq('equipe_id', equipeId);
      }
      
      if (rodadaId) {
        query = query.eq('rodada_id', rodadaId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      
      console.log('Pizzas carregadas:', data?.length || 0);
      setPizzas((data || []) as unknown as Pizza[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar pizzas');
    } finally {
      setLoading(false);
    }
  };

  const marcarPizzaPronta = async (equipeId: string, rodadaId: string, saborId?: string) => {
    try {
      console.log('Marcando pizza como pronta:', { equipeId, rodadaId, saborId });
      
      const { data, error } = await supabase
        .from('pizzas')
        .insert({
          equipe_id: equipeId,
          rodada_id: rodadaId,
          sabor_id: saborId || null,
          status: 'pronta',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select(`
          *,
          sabor:sabores_pizza(*)
        `)
        .single();

      if (error) {
        console.error('Erro ao inserir pizza:', error);
        throw error;
      }
      
      console.log('Pizza criada com sucesso:', data);
      const novaPizza = data as unknown as Pizza;
      
      // Disparar evento global com informação completa da pizza
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('pizza-enviada-com-sabor', { 
          detail: { 
            pizza: novaPizza,
            equipeId,
            rodadaId,
            saborId,
            timestamp: new Date().toISOString() 
          } 
        }));
      }
      
      // Atualizar lista local imediatamente
      setPizzas(prev => [novaPizza, ...prev]);
      
      return novaPizza;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao marcar pizza como pronta');
      throw err;
    }
  };

  const avaliarPizza = async (pizzaId: string, resultado: 'aprovada' | 'reprovada', justificativa?: string, avaliador?: string) => {
    try {
      console.log('Avaliando pizza:', { pizzaId, resultado, justificativa });
      const agora = new Date().toISOString();
      
      const { error } = await supabase
        .from('pizzas')
        .update({
          status: 'avaliada',
          resultado,
          justificativa_reprovacao: justificativa,
          avaliado_por: avaliador,
          avaliada_em: agora,
          updated_at: agora,
        } as any)
        .eq('id', pizzaId);

      if (error) {
        console.error('Erro ao avaliar pizza:', error);
        throw error;
      }
      
      console.log('Pizza avaliada com sucesso');
      
      // Disparar evento global
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('pizza-avaliada', { 
          detail: { 
            pizzaId,
            resultado,
            justificativa,
            avaliador,
            timestamp: agora,
          } 
        }));
      }
      
      // Atualizar estado local
      setPizzas(prev => prev.map(pizza => 
        pizza.id === pizzaId 
          ? { 
              ...pizza, 
              status: 'avaliada' as const, 
              resultado, 
              justificativa_reprovacao: justificativa,
              avaliado_por: avaliador,
              avaliada_em: agora,
              updated_at: agora,
            } as any
          : pizza
      ));
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao avaliar pizza');
      throw err;
    }
  };


  const cleanupChannel = () => {
    if (channelRef.current && isSubscribedRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      isSubscribedRef.current = false;
    }
  };

  // Escutar mudanças em tempo real para pizzas
  useEffect(() => {
    console.log('Configurando escuta em tempo real para pizzas', equipeId ? `da equipe ${equipeId}` : 'globais');
    
    // Cleanup any existing subscription
    cleanupChannel();

    // Create unique channel name with timestamp and random component
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const channelName = `pizzas-updates-${equipeId || 'global'}-${uniqueId}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pizzas',
          ...(equipeId && { filter: `equipe_id=eq.${equipeId}` })
        },
        async (payload) => {
          console.log('Pizza atualizada via realtime:', payload);
          
          if (payload.eventType === 'INSERT') {
            const novaPizza = payload.new as Pizza;
            
            // Buscar dados completos da pizza com sabor
            const { data: pizzaCompleta } = await supabase
              .from('pizzas')
              .select(`
                *,
                sabor:sabores_pizza(*)
              `)
              .eq('id', novaPizza.id)
              .single();
            
            if (pizzaCompleta) {
              setPizzas(prev => {
                // Evitar duplicatas
                const exists = prev.find(p => p.id === pizzaCompleta.id);
                if (exists) return prev;
                return [pizzaCompleta as unknown as Pizza, ...prev];
              });
              
              // Disparar evento para notificar outras telas
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('nova-pizza-disponivel', { 
                  detail: { 
                    pizza: pizzaCompleta,
                    timestamp: new Date().toISOString() 
                  } 
                }));
              }
            }
          } else if (payload.eventType === 'UPDATE') {
            const pizzaAtualizada = payload.new as Pizza;
            
            // Buscar dados completos da pizza com sabor
            const { data: pizzaCompleta } = await supabase
              .from('pizzas')
              .select(`
                *,
                sabor:sabores_pizza(*)
              `)
              .eq('id', pizzaAtualizada.id)
              .single();
            
            if (pizzaCompleta) {
              setPizzas(prev => prev.map(pizza => 
                pizza.id === pizzaAtualizada.id ? pizzaCompleta as unknown as Pizza : pizza
              ));
            }
          } else if (payload.eventType === 'DELETE') {
            const pizzaRemovida = payload.old as Pizza;
            setPizzas(prev => prev.filter(pizza => pizza.id !== pizzaRemovida.id));
          }
        }
      );

    channelRef.current = channel;

    // Subscribe only once
    if (!isSubscribedRef.current) {
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          isSubscribedRef.current = true;
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          isSubscribedRef.current = false;
        }
      });
    }

    return () => {
      console.log('Removendo escuta em tempo real para pizzas');
      cleanupChannel();
    };
  }, [equipeId]);

  useEffect(() => {
    fetchPizzas();
  }, [equipeId, rodadaId]);

  return {
    pizzas,
    loading,
    error,
    marcarPizzaPronta,
    avaliarPizza,
    refetch: fetchPizzas
  };
};
