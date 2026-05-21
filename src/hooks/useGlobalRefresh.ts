
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseGlobalRefreshOptions {
  enabled?: boolean;
  interval?: number;
  silent?: boolean;
}

export const useGlobalRefresh = (options: UseGlobalRefreshOptions = {}) => {
  const {
    enabled = true,
    interval = 1000, // 1 segundo
    silent = true
  } = options;

  const queryClient = useQueryClient();
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRefreshRef = useRef<number>(0);
  const deviceIdRef = useRef<string>('');
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isSubscribedRef = useRef(false);

  // Gerar ID único para este dispositivo/aba
  useEffect(() => {
    deviceIdRef.current = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Função para executar refresh
  const performRefresh = () => {
    const now = Date.now();
    
    // Evitar refresh muito frequente
    if (now - lastRefreshRef.current < interval) {
      return;
    }

    try {
      // Invalidar queries específicas para atualização em tempo real
      queryClient.invalidateQueries({
        queryKey: ['pizzas'],
        exact: false
      });
      
      queryClient.invalidateQueries({
        queryKey: ['compras'],
        exact: false
      });
      
      queryClient.invalidateQueries({
        queryKey: ['equipes'],
        exact: false
      });
      
      queryClient.invalidateQueries({
        queryKey: ['rodadas'],
        exact: false
      });
      
      queryClient.invalidateQueries({
        queryKey: ['produtos'],
        exact: false
      });
      
      queryClient.invalidateQueries({
        queryKey: ['sabores'],
        exact: false
      });

      lastRefreshRef.current = now;

      if (!silent) {
        console.log('🔄 Global refresh executado', new Date().toLocaleTimeString());
      }
    } catch (error) {
      if (!silent) {
        console.error('Erro no global refresh:', error);
      }
    }
  };

  // Configurar canal de sincronização via Supabase Realtime
  const setupRealtimeChannel = () => {
    if (channelRef.current && isSubscribedRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      isSubscribedRef.current = false;
    }

    const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const channelName = `global-refresh-sync-${uniqueId}`;

    const channel = supabase
      .channel(channelName, {
        config: {
          broadcast: {
            self: false // Não receber próprias mensagens
          }
        }
      })
      .on('broadcast', { event: 'force_refresh' }, (payload) => {
        // Só processar se veio de outro dispositivo
        if (payload.payload?.deviceId !== deviceIdRef.current) {
          const timeDiff = Date.now() - (payload.payload?.timestamp || 0);
          
          // Só processar se o evento é recente (menos de 5 segundos)
          if (timeDiff < 5000) {
            performRefresh();
          }
        }
      });

    if (!isSubscribedRef.current) {
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          isSubscribedRef.current = true;
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          isSubscribedRef.current = false;
        }
      });
      channelRef.current = channel;
    }
  };

  // Sistema principal de refresh com interval
  useEffect(() => {
    if (!enabled) return;

    // Configurar canal de realtime
    setupRealtimeChannel();

    // Executar refresh inicial após um pequeno delay
    const initialTimeout = setTimeout(() => {
      performRefresh();
      
      // Configurar interval contínuo
      intervalRef.current = setInterval(performRefresh, interval);
    }, 100);

    return () => {
      if (initialTimeout) clearTimeout(initialTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (channelRef.current && isSubscribedRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        isSubscribedRef.current = false;
      }
    };
  }, [enabled, interval, silent, queryClient]);

  // Escutar eventos de visibilidade para pausar/retomar
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Retomar refresh quando a página volta ao foco
        if (!intervalRef.current) {
          intervalRef.current = setInterval(() => {
            const now = Date.now();
            if (now - lastRefreshRef.current >= interval) {
              performRefresh();
            }
          }, interval);
        }
      } else {
        // Pausar refresh quando a página sai de foco
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, interval, queryClient]);

  // Função para forçar refresh manual em todos os dispositivos
  const forceRefresh = () => {
    // Executar refresh local
    performRefresh();
    
    // Enviar comando via Supabase Realtime para todos os outros dispositivos
    if (channelRef.current && isSubscribedRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'force_refresh',
        payload: {
          timestamp: Date.now(),
          deviceId: deviceIdRef.current
        }
      });
    }
  };

  return {
    forceRefresh,
    isEnabled: enabled,
    lastRefresh: lastRefreshRef.current,
    deviceId: deviceIdRef.current
  };
};
