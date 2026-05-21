
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useRodadaCounter = () => {
  const [proximoNumero, setProximoNumero] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchProximoNumero = async () => {
    try {
      setLoading(true);
      console.log('Fetchando próximo número da rodada...');
      
      // Buscar o contador atual da tabela contadores_jogo
      const { data: contadorData, error: contadorError } = await supabase
        .from('contadores_jogo')
        .select('valor')
        .eq('chave', 'proximo_numero_rodada')
        .single();

      if (contadorError && contadorError.code !== 'PGRST116') {
        throw contadorError;
      }

      if (!contadorData) {
        console.log('Contador não existe, criando baseado na última rodada...');
        
        // Se não existe contador, criar baseado na última rodada
        const { data: ultimaRodada, error: rodadaError } = await supabase
          .from('rodadas')
          .select('numero')
          .order('numero', { ascending: false })
          .limit(1)
          .single();

        if (rodadaError && rodadaError.code !== 'PGRST116') {
          throw rodadaError;
        }

        const proximoValor = ultimaRodada ? ultimaRodada.numero + 1 : 1;
        
        // Criar contador inicial
        const { data: insertData, error: insertError } = await supabase
          .from('contadores_jogo')
          .insert({ chave: 'proximo_numero_rodada', valor: proximoValor })
          .select('valor')
          .single();
        
        if (insertError) throw insertError;
        
        console.log(`Contador criado com valor: ${proximoValor}`);
        setProximoNumero(proximoValor);
      } else {
        console.log(`Contador encontrado com valor: ${contadorData.valor}`);
        setProximoNumero(contadorData.valor);
      }
    } catch (err) {
      console.error('Erro ao buscar próximo número da rodada:', err);
      
      // Fallback: calcular baseado na última rodada
      try {
        const { data: ultimaRodada } = await supabase
          .from('rodadas')
          .select('numero')
          .order('numero', { ascending: false })
          .limit(1)
          .single();
        
        const fallbackValor = ultimaRodada ? ultimaRodada.numero + 1 : 1;
        console.log(`Usando fallback: ${fallbackValor}`);
        setProximoNumero(fallbackValor);
      } catch (fallbackError) {
        console.error('Erro no fallback:', fallbackError);
        setProximoNumero(1);
      }
    } finally {
      setLoading(false);
    }
  };

  const sincronizarContador = async () => {
    try {
      console.log('Sincronizando contador com rodadas existentes...');
      
      // Buscar a última rodada criada
      const { data: ultimaRodada, error: rodadaError } = await supabase
        .from('rodadas')
        .select('numero')
        .order('numero', { ascending: false })
        .limit(1)
        .single();

      if (rodadaError && rodadaError.code !== 'PGRST116') {
        throw rodadaError;
      }

      const proximoValor = ultimaRodada ? ultimaRodada.numero + 1 : 1;
      
      // Atualizar ou criar contador
      const { error: upsertError } = await supabase
        .from('contadores_jogo')
        .upsert({ 
          chave: 'proximo_numero_rodada', 
          valor: proximoValor 
        }, {
          onConflict: 'chave'
        });

      if (upsertError) throw upsertError;
      
      console.log(`Contador sincronizado para: ${proximoValor}`);
      setProximoNumero(proximoValor);
      
      return proximoValor;
    } catch (error) {
      console.error('Erro ao sincronizar contador:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchProximoNumero();
    
    // Escutar mudanças no contador
    const channel = supabase
      .channel('contador-rodada-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contadores_jogo',
          filter: 'chave=eq.proximo_numero_rodada'
        },
        (payload) => {
          console.log('Contador atualizado:', payload);
          if (payload.new && typeof payload.new === 'object' && 'valor' in payload.new) {
            setProximoNumero(payload.new.valor as number);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    proximoNumero,
    loading,
    refetch: fetchProximoNumero,
    sincronizarContador
  };
};
