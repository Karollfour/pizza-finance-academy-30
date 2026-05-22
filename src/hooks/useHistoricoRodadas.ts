
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Pizza, Rodada } from '@/types/database';

interface RodadaComPizzas extends Rodada {
  pizzas: Pizza[];
  pizzas_aprovadas: number;
  pizzas_reprovadas: number;
  pizzas_pendentes: number;
}

export const useHistoricoRodadas = (equipeId?: string) => {
  const [rodadas, setRodadas] = useState<RodadaComPizzas[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<any>(null);
  const isSubscribedRef = useRef(false);

  const fetchHistoricoRodadas = async () => {
    try {
      setLoading(true);
      
      // Buscar todas as rodadas
      const { data: rodadasData, error: rodadasError } = await supabase
        .from('rodadas')
        .select('*')
        .order('numero', { ascending: true });

      if (rodadasError) throw rodadasError;

      const rodadasComPizzas: RodadaComPizzas[] = [];

      for (const rodada of rodadasData || []) {
        // Buscar pizzas da rodada
        let pizzasQuery = supabase
          .from('pizzas')
          .select('*, sabor:sabores_pizza(*)')
          .eq('rodada_id', rodada.id);
        
        if (equipeId) {
          pizzasQuery = pizzasQuery.eq('equipe_id', equipeId);
        }
        
        const { data: pizzasData, error: pizzasError } = await pizzasQuery
          .order('created_at', { ascending: false });

        if (pizzasError) throw pizzasError;

        const pizzas = (pizzasData || []) as Pizza[];
        
        // Calcular estatísticas
        const pizzas_aprovadas = pizzas.filter(p => p.resultado === 'aprovada').length;
        const pizzas_reprovadas = pizzas.filter(p => p.resultado === 'reprovada').length;
        const pizzas_pendentes = pizzas.filter(p => p.status === 'pronta' || p.status === 'em_producao').length;

        rodadasComPizzas.push({
          ...rodada,
          status: rodada.status as 'aguardando' | 'ativa' | 'finalizada',
          pizzas,
          pizzas_aprovadas,
          pizzas_reprovadas,
          pizzas_pendentes
        });
      }

      setRodadas(rodadasComPizzas);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar histórico de rodadas');
    } finally {
      setLoading(false);
    }
  };

  const cleanupChannel = () => {
    if (channelRef.current && isSubscribedRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      isSubscribedRef.current = false;
    }
  };

  useEffect(() => {
    fetchHistoricoRodadas();
  }, [equipeId]);

  // Escutar mudanças em tempo real
  useEffect(() => {
    // Cleanup any existing subscription
    cleanupChannel();

    // Create unique channel name with timestamp and random component
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const channelName = `historico-rodadas-${equipeId || 'global'}-${uniqueId}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rodadas'
        },
        () => {
          fetchHistoricoRodadas();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pizzas',
          ...(equipeId && { filter: `equipe_id=eq.${equipeId}` })
        },
        () => {
          fetchHistoricoRodadas();
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
      cleanupChannel();
    };
  }, [equipeId]);

  return {
    rodadas,
    loading,
    error,
    refetch: fetchHistoricoRodadas
  };
};
