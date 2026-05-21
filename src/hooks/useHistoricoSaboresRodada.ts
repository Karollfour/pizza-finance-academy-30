
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface HistoricoSaborRodada {
  id: string;
  rodada_id: string;
  sabor_id: string;
  ordem: number;
  created_at: string;
  sabor?: {
    nome: string;
    descricao?: string;
  };
}

export const useHistoricoSaboresRodada = (rodadaId?: string) => {
  const [historico, setHistorico] = useState<HistoricoSaborRodada[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<any>(null);
  const isSubscribedRef = useRef(false);
  const lastFetchRef = useRef<number>(0);

  const fetchHistorico = async (silent = false) => {
    if (!rodadaId) {
      setHistorico([]);
      setLoading(false);
      return;
    }

    // Evitar múltiplas requisições muito próximas
    const now = Date.now();
    if (now - lastFetchRef.current < 1000) {
      return;
    }
    lastFetchRef.current = now;

    try {
      if (!silent) setLoading(true);
      
      const { data, error } = await supabase
        .from('historico_sabores_rodada')
        .select(`
          *,
          sabor:sabores_pizza(nome, descricao)
        `)
        .eq('rodada_id', rodadaId)
        .order('ordem', { ascending: true });

      if (error) throw error;
      
      const historicoFormatado = (data || []).map(item => ({
        ...item,
        sabor: item.sabor
      })) as HistoricoSaborRodada[];
      
      // Só atualizar se realmente mudou
      setHistorico(prev => {
        const changed = JSON.stringify(prev) !== JSON.stringify(historicoFormatado);
        return changed ? historicoFormatado : prev;
      });
      setError(null);
      
    } catch (err) {
      console.error('Erro ao carregar histórico de sabores:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar histórico');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const cleanupChannel = () => {
    if (channelRef.current && isSubscribedRef.current) {
      console.log('Removendo canal do histórico de sabores');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      isSubscribedRef.current = false;
    }
  };

  // Escutar mudanças em tempo real com debounce - CORRIGIDO
  useEffect(() => {
    if (!rodadaId) {
      cleanupChannel();
      return;
    }

    // Cleanup any existing subscription first
    cleanupChannel();

    // Create unique channel name
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const channelName = `historico-sabores-${rodadaId}-${uniqueId}`;
    
    let timeoutId: ReturnType<typeof setTimeout>;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'historico_sabores_rodada',
          filter: `rodada_id=eq.${rodadaId}`
        },
        (payload) => {
          console.log('Histórico de sabores atualizado:', payload);
          
          // Debounce para evitar atualizações muito frequentes
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            fetchHistorico(true);
          }, 500);
        }
      );

    channelRef.current = channel;

    // Subscribe apenas uma vez
    if (!isSubscribedRef.current) {
      channel.subscribe((status) => {
        console.log('Status da subscrição do histórico:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Canal do histórico subscrito com sucesso');
          isSubscribedRef.current = true;
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          isSubscribedRef.current = false;
        }
      });
    }

    return () => {
      clearTimeout(timeoutId);
      cleanupChannel();
    };
  }, [rodadaId]);

  // Escutar eventos globais com debounce
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    
    const handleGlobalDataChange = (event: CustomEvent) => {
      const { table } = event.detail;
      if (table === 'historico_sabores_rodada' && rodadaId) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          fetchHistorico(true);
        }, 300);
      }
    };

    window.addEventListener('global-data-changed', handleGlobalDataChange as EventListener);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('global-data-changed', handleGlobalDataChange as EventListener);
    };
  }, [rodadaId]);

  useEffect(() => {
    fetchHistorico();
  }, [rodadaId]);

  return {
    historico,
    loading,
    error,
    refetch: () => fetchHistorico(false)
  };
};
