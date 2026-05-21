import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useResetJogo = () => {
  const [loading, setLoading] = useState(false);

  const resetarJogo = async () => {
    setLoading(true);
    try {
      console.log('[reset] Iniciando reset completo do jogo...');

      // A função SQL resetar_contadores_jogo limpa todas as tabelas
      // na ordem correta (historico_sabores_rodada → pedidos_rodada →
      // pizzas → compras → rodadas), zera gastos/ganhos das equipes e
      // reseta o contador proximo_numero_rodada para 1.
      const { error } = await supabase.rpc('resetar_contadores_jogo');

      if (error) {
        console.error('[reset] Erro RPC resetar_contadores_jogo:', error);
        throw error;
      }

      console.log('[reset] Reset concluído com sucesso');

      // Notificar todas as telas
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('jogo-resetado', {
          detail: { timestamp: Date.now() }
        }));
        window.dispatchEvent(new CustomEvent('global-data-changed', {
          detail: { table: 'all', action: 'reset', timestamp: Date.now() }
        }));
      }

      toast.success('🎮 Jogo resetado com sucesso!');
      return true;
    } catch (err: any) {
      const msg = err?.message || err?.error_description || 'Erro desconhecido ao resetar';
      console.error('[reset] Falha:', err);
      toast.error(`Erro ao resetar o jogo: ${msg}`);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    resetarJogo,
    loading
  };
};
