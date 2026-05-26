
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Rodada } from '@/types/database';

export const useRodadas = () => {
  const [rodadaAtual, setRodadaAtual] = useState<Rodada | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<any>(null);
  const isSubscribedRef = useRef(false);

  const fetchRodadaAtual = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('rodadas')
        .select('*')
        .in('status', ['aguardando', 'ativa', 'pausada'])
        .order('numero', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setRodadaAtual(data ? (data as Rodada) : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar rodada');
    } finally {
      setLoading(false);
    }
  };


  const obterProximoNumeroRodada = async () => {
    try {
      console.log('Obtendo próximo número da rodada...');
      
      // Primeiro, verificar se existe contador
      const { data: contadorData, error: contadorError } = await supabase
        .from('contadores_jogo')
        .select('valor')
        .eq('chave', 'proximo_numero_rodada')
        .single();

      if (contadorError && contadorError.code !== 'PGRST116') {
        throw contadorError;
      }

      let proximoNumero = 1;

      if (!contadorData) {
        // Se não existe contador, criar baseado na última rodada
        const { data: ultimaRodada } = await supabase
          .from('rodadas')
          .select('numero')
          .order('numero', { ascending: false })
          .limit(1)
          .single();

        proximoNumero = ultimaRodada ? ultimaRodada.numero + 1 : 1;

        // Criar contador inicial
        const { error: insertError } = await supabase
          .from('contadores_jogo')
          .insert({ chave: 'proximo_numero_rodada', valor: proximoNumero });

        if (insertError) throw insertError;
        
        console.log(`Contador criado com valor inicial: ${proximoNumero}`);
      } else {
        proximoNumero = contadorData.valor;
        console.log(`Contador atual: ${proximoNumero}`);
      }

      return proximoNumero;
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
      
      // Fallback: incremento manual
      const { data: contadorAtual, error: selectError } = await supabase
        .from('contadores_jogo')
        .select('valor')
        .eq('chave', 'proximo_numero_rodada')
        .single();

      if (selectError) throw selectError;

      const novoValor = contadorAtual.valor + 1;

      const { error: updateError } = await supabase
        .from('contadores_jogo')
        .update({ valor: novoValor })
        .eq('chave', 'proximo_numero_rodada');

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
      const { error } = await supabase
        .from('rodadas')
        .update({
          status: 'ativa',
          iniciou_em: new Date().toISOString()
        })
        .eq('id', rodadaId);

      if (error) throw error;
      
      // Dispatch evento global para sincronização
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('rodada-iniciada', {
          detail: { rodadaId, timestamp: new Date().toISOString() }
        }));
      }
      
      await fetchRodadaAtual();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao iniciar rodada');
      throw err;
    }
  };

  const pausarRodada = async (rodadaId: string) => {
    try {
      const { error } = await supabase
        .from('rodadas')
        .update({
          status: 'pausada'
        })
        .eq('id', rodadaId);

      if (error) throw error;
      
      // Dispatch evento global para sincronização
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('rodada-pausada', {
          detail: { rodadaId, timestamp: new Date().toISOString() }
        }));
      }
      
      await fetchRodadaAtual();
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
      
      // Dispatch evento global para sincronização
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('rodada-finalizada', {
          detail: { rodadaId, timestamp: new Date().toISOString() }
        }));
      }
      
      await fetchRodadaAtual();
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
        await incrementarContador();
        console.log('Contador incrementado após criação da rodada');
      } catch (contadorError) {
        console.error('Erro ao incrementar contador, mas rodada foi criada:', contadorError);
        // Não falhar a criação da rodada por erro no contador
      }
      
      await fetchRodadaAtual();
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

  // Escutar mudanças em tempo real para rodadas (silencioso)
  useEffect(() => {
    console.log('Configurando escuta em tempo real para rodadas');
    
    // Cleanup any existing subscription
    cleanupChannel();

    // Create unique channel name with timestamp and random component
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const channelName = `rodadas-updates-${uniqueId}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rodadas'
        },
        (payload) => {
          console.log('Rodada atualizada:', payload);
          const rodadaAtualizada = payload.new as Rodada;
          
          if (payload.eventType === 'UPDATE') {
            // Atualizar rodada local se for a atual
            setRodadaAtual(prev => {
              if (prev?.id === rodadaAtualizada.id) {
                return rodadaAtualizada;
              }
              return prev;
            });
          } else if (payload.eventType === 'INSERT') {
            // Nova rodada criada
            if (rodadaAtualizada.status === 'aguardando') {
              setRodadaAtual(rodadaAtualizada);
            }
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
      console.log('Removendo escuta em tempo real para rodadas');
      cleanupChannel();
    };
  }, []);

  useEffect(() => {
    fetchRodadaAtual();
  }, []);

  return {
    rodadaAtual,
    loading,
    error,
    iniciarRodada,
    pausarRodada,
    finalizarRodada,
    criarNovaRodada,
    obterProximoNumeroRodada,
    refetch: fetchRodadaAtual
  };
};
