import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Rodada } from '@/types/database';
import { toast } from 'sonner';

interface RodadaEvent {
  type: 'CREATED' | 'STARTED' | 'FINISHED' | 'UPDATED';
  rodada: Rodada;
  timestamp: string;
}

export const useOptimizedRodadas = () => {
  const [rodadaAtual, setRodadaAtual] = useState<Rodada | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const channelRef = useRef<any>(null);
  const isSubscribedRef = useRef(false);

  const fetchRodadaAtual = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      
      const { data, error } = await supabase
        .from('rodadas')
        .select('*')
        .in('status', ['aguardando', 'ativa', 'pausada'])
        .order('numero', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      const novaRodada = data ? (data as Rodada) : null;
      
      // Verificar se houve mudança real
      if (JSON.stringify(novaRodada) !== JSON.stringify(rodadaAtual)) {
        setRodadaAtual(novaRodada);
        setLastUpdate(new Date());
        
        // Broadcast silencioso do evento para outros hooks
        if (typeof window !== 'undefined') {
          const event: RodadaEvent = {
            type: novaRodada?.status === 'ativa' ? 'STARTED' : 'UPDATED',
            rodada: novaRodada!,
            timestamp: new Date().toISOString()
          };
          
          window.dispatchEvent(new CustomEvent('rodada-updated', { 
            detail: event 
          }));
        }
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar rodada');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [rodadaAtual]);


  const obterProximoNumeroRodada = async () => {
    try {
      console.log('Obtendo próximo número da rodada...');
      
      // Buscar contador atual
      const { data: contadorData, error: contadorError } = await supabase
        .from('contadores_jogo')
        .select('valor')
        .eq('chave', 'proximo_numero_rodada')
        .single();

      if (contadorError && contadorError.code !== 'PGRST116') {
        throw contadorError;
      }

      if (!contadorData) {
        // Se não existe contador, criar baseado na última rodada
        const { data: ultimaRodada } = await supabase
          .from('rodadas')
          .select('numero')
          .order('numero', { ascending: false })
          .limit(1)
          .single();

        const proximoNumero = ultimaRodada ? ultimaRodada.numero + 1 : 1;

        // Criar contador inicial
        const { error: insertError } = await supabase
          .from('contadores_jogo')
          .insert({ chave: 'proximo_numero_rodada', valor: proximoNumero });

        if (insertError) throw insertError;
        
        console.log(`Contador criado com valor inicial: ${proximoNumero}`);
        return proximoNumero;
      }

      console.log(`Próximo número obtido: ${contadorData.valor}`);
      return contadorData.valor;
    } catch (error) {
      console.error('Erro ao obter próximo número:', error);
      throw error;
    }
  };

  const incrementarContador = async () => {
    try {
      console.log('Incrementando contador...');
      
      // Tentar usar a função RPC primeiro
      const { data: rpcData, error: rpcError } = await supabase.rpc('obter_proximo_numero_rodada');
      
      if (!rpcError && rpcData) {
        console.log(`Contador incrementado via RPC para: ${rpcData}`);
        return rpcData;
      }

      console.log('RPC falhou, usando incremento manual...', rpcError);
      
      // Fallback: incremento manual com upsert
      const { data: contadorAtual, error: selectError } = await supabase
        .from('contadores_jogo')
        .select('valor')
        .eq('chave', 'proximo_numero_rodada')
        .single();

      if (selectError && selectError.code !== 'PGRST116') throw selectError;

      const valorAtual = contadorAtual?.valor || 1;
      const novoValor = valorAtual + 1;

      const { error: updateError } = await supabase
        .from('contadores_jogo')
        .upsert({ 
          chave: 'proximo_numero_rodada', 
          valor: novoValor 
        }, {
          onConflict: 'chave'
        });

      if (updateError) throw updateError;

      console.log(`Contador incrementado manualmente para: ${novoValor}`);
      return novoValor;
    } catch (error) {
      console.error('Erro ao incrementar contador:', error);
      throw error;
    }
  };

  const iniciarRodada = async (rodadaId: string) => {
    try {
      // Buscar estado atual para decidir entre "iniciar fresh" e "retomar"
      const { data: atual } = await supabase
        .from('rodadas')
        .select('*')
        .eq('id', rodadaId)
        .single();

      const agora = new Date().toISOString();
      const isResume = atual?.status === 'pausada';

      const updatePayload: any = isResume
        ? {
            status: 'ativa',
            retomada_em: agora,
            pausada_em: null,
          }
        : {
            status: 'ativa',
            iniciou_em: agora,
            retomada_em: agora,
            pausada_em: null,
            tempo_decorrido_acumulado: 0,
          };

      const { error } = await supabase
        .from('rodadas')
        .update(updatePayload)
        .eq('id', rodadaId);

      if (error) throw error;
      
      await fetchRodadaAtual(true);
      
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('rodada-iniciada', { 
          detail: { rodadaId, timestamp: agora } 
        }));
        window.dispatchEvent(new CustomEvent('global-data-changed', { 
          detail: { table: 'rodadas', action: isResume ? 'retomada' : 'iniciada', timestamp: Date.now() } 
        }));
      }
      
      toast.success(isResume ? '▶️ Rodada retomada!' : '🚀 Rodada iniciada!', { duration: 2000 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao iniciar rodada');
      throw err;
    }
  };

  const pausarRodada = async (rodadaId: string) => {
    try {
      // Calcular tempo acumulado até esta pausa
      const { data: atual } = await supabase
        .from('rodadas')
        .select('*')
        .eq('id', rodadaId)
        .single();

      const acumuladoAnterior = Number((atual as any)?.tempo_decorrido_acumulado || 0);
      const baseIso = (atual as any)?.retomada_em || atual?.iniciou_em;
      const elapsedAtual = baseIso
        ? Math.max(0, Math.floor((Date.now() - new Date(baseIso).getTime()) / 1000))
        : 0;
      const novoAcumulado = Math.min(
        (atual?.tempo_limite || 0),
        acumuladoAnterior + elapsedAtual
      );

      const agora = new Date().toISOString();
      const { error } = await supabase
        .from('rodadas')
        .update({
          status: 'pausada',
          pausada_em: agora,
          tempo_decorrido_acumulado: novoAcumulado,
        })
        .eq('id', rodadaId);

      if (error) throw error;
      
      await fetchRodadaAtual(true);
      
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('rodada-pausada', { 
          detail: { rodadaId, timestamp: agora } 
        }));
        window.dispatchEvent(new CustomEvent('global-data-changed', { 
          detail: { table: 'rodadas', action: 'pausada', timestamp: Date.now() } 
        }));
      }
      
      toast.success('⏸️ Rodada pausada!', { duration: 2000 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao pausar rodada');
      throw err;
    }
  };


  const finalizarRodada = async (rodadaId: string) => {
    try {
      const { error } = await supabase
        .from('rodadas')
        .update({
          status: 'finalizada',
          finalizou_em: new Date().toISOString()
        })
        .eq('id', rodadaId);

      if (error) throw error;
      
      // Fetch imediato para atualizar estado local
      await fetchRodadaAtual(true);
      
      // Forçar atualização global imediata
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('rodada-finalizada', { 
          detail: { 
            rodadaId,
            timestamp: new Date().toISOString() 
          } 
        }));
        
        // Forçar refresh global para todas as telas
        window.dispatchEvent(new CustomEvent('global-data-changed', { 
          detail: { 
            table: 'rodadas',
            action: 'finalizada',
            timestamp: Date.now() 
          } 
        }));
      }
      
      toast.success('🏁 Rodada finalizada!', {
        duration: 2000,
      });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao finalizar rodada');
      throw err;
    }
  };

  const criarNovaRodada = async (numero: number, tempoLimite: number = 300) => {
    try {
      console.log(`Criando nova rodada com número: ${numero}`);
      
      // Verificar se já existe rodada com este número
      const { data: rodadaExistente } = await supabase
        .from('rodadas')
        .select('id')
        .eq('numero', numero)
        .single();

      if (rodadaExistente) {
        throw new Error(`Já existe uma rodada com o número ${numero}`);
      }

      const { data, error } = await supabase
        .from('rodadas')
        .insert({
          numero,
          tempo_limite: tempoLimite,
          status: 'aguardando'
        })
        .select()
        .single();

      if (error) throw error;

      console.log(`Rodada ${numero} criada com sucesso`);

      // Incrementar o contador APÓS criar a rodada com sucesso
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('obter_proximo_numero_rodada');
        
        if (rpcError) {
          console.log('RPC falhou, usando incremento manual...', rpcError);
          
          const { data: contadorAtual, error: selectError } = await supabase
            .from('contadores_jogo')
            .select('valor')
            .eq('chave', 'proximo_numero_rodada')
            .single();

          if (!selectError && contadorAtual) {
            const novoValor = contadorAtual.valor + 1;
            await supabase
              .from('contadores_jogo')
              .upsert({ 
                chave: 'proximo_numero_rodada', 
                valor: novoValor 
              }, {
                onConflict: 'chave'
              });
          }
        }
        console.log('Contador incrementado após criação da rodada');
      } catch (contadorError) {
        console.error('Erro ao incrementar contador, mas rodada foi criada:', contadorError);
      }
      
      // Fetch imediato para atualizar estado local
      await fetchRodadaAtual(true);
      
      // Forçar atualização global imediata
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('rodada-criada', { 
          detail: { 
            rodada: data as Rodada,
            timestamp: new Date().toISOString() 
          } 
        }));
        
        // Forçar refresh global para todas as telas
        window.dispatchEvent(new CustomEvent('global-data-changed', { 
          detail: { 
            table: 'rodadas',
            action: 'criada',
            timestamp: Date.now() 
          } 
        }));
      }
      
      toast.success(`🎯 Rodada ${numero} criada!`, {
        duration: 2000,
      });
      
      return data as Rodada;
    } catch (err) {
      console.error('Erro ao criar rodada:', err);
      setError(err instanceof Error ? err.message : 'Erro ao criar rodada');
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

  // Escutar mudanças em tempo real otimizado
  useEffect(() => {
    // Cleanup previous channel first
    cleanupChannel();

    // Create unique channel name with timestamp and random component
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const channelName = `rodadas-optimized-${uniqueId}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rodadas'
        },
        async (payload) => {
          const rodadaAtualizada = payload.new as Rodada;
          
          if (payload.eventType === 'UPDATE') {
            // Verificar se é a rodada atual
            if (rodadaAtual?.id === rodadaAtualizada.id) {
              setRodadaAtual(rodadaAtualizada);
              setLastUpdate(new Date());
              
              // Notificar sobre mudanças importantes silenciosamente
              if (rodadaAtual.status !== rodadaAtualizada.status) {
                const evento = rodadaAtualizada.status === 'ativa' ? 'STARTED' : 
                              rodadaAtualizada.status === 'finalizada' ? 'FINISHED' : 'UPDATED';
                
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('rodada-updated', { 
                    detail: { 
                      type: evento,
                      rodada: rodadaAtualizada,
                      timestamp: new Date().toISOString() 
                    } 
                  }));
                }
                
                // Notificações específicas para mudanças de status
                if (rodadaAtualizada.status === 'ativa') {
                  toast.success('🚀 Rodada iniciada!', {
                    duration: 3000,
                  });
                } else if (rodadaAtualizada.status === 'finalizada') {
                  toast.info('🏁 Rodada finalizada!', {
                    duration: 3000,
                  });
                }
              }
              
              // Notificar sobre mudanças no tempo limite
              if (rodadaAtual.tempo_limite !== rodadaAtualizada.tempo_limite) {
                console.log('Tempo limite alterado no banco:', rodadaAtualizada.tempo_limite);
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('rodada-tempo-alterado', { 
                    detail: { 
                      rodadaId: rodadaAtualizada.id,
                      novoTempoLimite: rodadaAtualizada.tempo_limite,
                      timestamp: new Date().toISOString() 
                    } 
                  }));
                }
              }
            }
          } else if (payload.eventType === 'INSERT') {
            // Nova rodada criada
            if (rodadaAtualizada.status === 'aguardando') {
              setRodadaAtual(rodadaAtualizada);
              setLastUpdate(new Date());
              
              toast.success(`🎯 Nova rodada ${rodadaAtualizada.numero} criada!`, {
                duration: 3000,
              });
            }
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
      cleanupChannel();
    };
  }, [rodadaAtual]);

  // Escutar eventos customizados globais
  useEffect(() => {
    const handleRodadaEvent = (event: CustomEvent) => {
      console.log('Hook recebeu evento:', event.type, event.detail);
      // Refetch silencioso para garantir sincronização
      fetchRodadaAtual(true);
    };

    window.addEventListener('rodada-updated', handleRodadaEvent as EventListener);
    window.addEventListener('rodada-iniciada', handleRodadaEvent as EventListener);
    window.addEventListener('rodada-finalizada', handleRodadaEvent as EventListener);
    window.addEventListener('rodada-criada', handleRodadaEvent as EventListener);
    window.addEventListener('rodada-tempo-alterado', handleRodadaEvent as EventListener);

    return () => {
      window.removeEventListener('rodada-updated', handleRodadaEvent as EventListener);
      window.removeEventListener('rodada-iniciada', handleRodadaEvent as EventListener);
      window.removeEventListener('rodada-finalizada', handleRodadaEvent as EventListener);
      window.removeEventListener('rodada-criada', handleRodadaEvent as EventListener);
      window.removeEventListener('rodada-tempo-alterado', handleRodadaEvent as EventListener);
    };
  }, [fetchRodadaAtual]);

  // Escutar eventos de sincronização global
  useEffect(() => {
    const handleGlobalDataChange = (event: CustomEvent) => {
      const { table, timestamp } = event.detail;
      if (table === 'rodadas' || table === 'historico_sabores_rodada' || table === 'contadores_jogo') {
        // Refetch silencioso para garantir sincronização
        setTimeout(() => {
          fetchRodadaAtual(true);
        }, 100);
      }
    };

    window.addEventListener('global-data-changed', handleGlobalDataChange as EventListener);

    return () => {
      window.removeEventListener('global-data-changed', handleGlobalDataChange as EventListener);
    };
  }, [fetchRodadaAtual]);

  // Initial fetch
  useEffect(() => {
    fetchRodadaAtual();
  }, []);

  // Fallback de re-fetch a cada 10s (caso realtime caia)
  useEffect(() => {
    const id = setInterval(() => {
      fetchRodadaAtual(true);
    }, 10000);
    return () => clearInterval(id);
  }, [fetchRodadaAtual]);

  return {
    rodadaAtual,
    loading,
    error,
    lastUpdate,
    iniciarRodada,
    pausarRodada,
    finalizarRodada,
    criarNovaRodada,
    obterProximoNumeroRodada,
    refetch: () => fetchRodadaAtual(false)
  };
};

