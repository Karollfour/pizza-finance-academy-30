
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Compra } from '@/types/database';
import { toast } from 'sonner';

export const useCompras = (equipeId?: string) => {
  const [compras, setCompras] = useState<Compra[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<any>(null);
  const isSubscribedRef = useRef(false);

  const fetchCompras = async () => {
    try {
      setLoading(true);
      let query = supabase.from('compras').select('*');
      
      if (equipeId) {
        query = query.eq('equipe_id', equipeId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setCompras((data || []) as Compra[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar compras');
    } finally {
      setLoading(false);
    }
  };

  const registrarCompra = async (
    equipeId: string,
    produtoId: string | null,
    rodadaId: string | null,
    quantidade: number,
    valorTotal: number,
    tipo: 'material' | 'viagem',
    descricao?: string
  ) => {
    try {
      const { data, error } = await supabase
        .from('compras')
        .insert({
          equipe_id: equipeId,
          produto_id: produtoId,
          rodada_id: rodadaId,
          quantidade,
          valor_total: valorTotal,
          tipo,
          descricao
        })
        .select()
        .single();

      if (error) throw error;
      await fetchCompras();
      return data as Compra;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao registrar compra');
      throw err;
    }
  };

  const calcularGastoTotal = (equipeId: string): number => {
    return compras
      .filter(compra => compra.equipe_id === equipeId)
      .reduce((total, compra) => total + compra.valor_total, 0);
  };

  useEffect(() => {
    fetchCompras();

    // Cleanup any existing subscription
    if (channelRef.current && isSubscribedRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      isSubscribedRef.current = false;
    }

    // Create unique channel name with timestamp and random component
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const channelName = `compras-updates-${equipeId || 'global'}-${uniqueId}`;
    
    console.log('Configurando escuta em tempo real para compras', equipeId ? `da equipe ${equipeId}` : 'globais');
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'compras',
          ...(equipeId && { filter: `equipe_id=eq.${equipeId}` })
        },
        (payload) => {
          console.log('Compra atualizada:', payload);
          
          if (payload.eventType === 'INSERT') {
            const novaCompra = payload.new as Compra;
            
            // Adicionar à lista local
            setCompras(prev => [novaCompra, ...prev]);
            
            // Notificar sobre nova compra apenas se não for da equipe atual
            if (!equipeId || novaCompra.equipe_id !== equipeId) {
              toast.info(`💰 Nova compra registrada: $ ${novaCompra.valor_total.toFixed(2)}`, {
                duration: 3000,
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            const compraAtualizada = payload.new as Compra;
            
            // Atualizar lista local
            setCompras(prev => prev.map(compra => 
              compra.id === compraAtualizada.id ? compraAtualizada : compra
            ));
          } else if (payload.eventType === 'DELETE') {
            const compraRemovida = payload.old as Compra;
            
            // Remover da lista local
            setCompras(prev => prev.filter(compra => compra.id !== compraRemovida.id));
          }
        }
      );

    // Subscribe only once
    if (!isSubscribedRef.current) {
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          isSubscribedRef.current = true;
        }
      });
      channelRef.current = channel;
    }

    return () => {
      console.log('Removendo escuta em tempo real para compras');
      if (channelRef.current && isSubscribedRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        isSubscribedRef.current = false;
      }
    };
  }, [equipeId]);

  return {
    compras,
    loading,
    error,
    registrarCompra,
    calcularGastoTotal,
    refetch: fetchCompras
  };
};
