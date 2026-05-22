
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useResetJogo = () => {
  const [loading, setLoading] = useState(false);

  const resetarJogo = async () => {
    try {
      setLoading(true);

      // A função do banco já faz TRUNCATE de pizzas, compras, rodadas,
      // pedidos_rodada, historico_sabores_rodada, zera ganho/gasto das equipes
      // e reinicia o contador de rodadas.
      const { error: contadorError } = await supabase.rpc('resetar_contadores_jogo');
      if (contadorError) throw contadorError;

      toast.success('🎮 Jogo resetado com sucesso! Todos os históricos foram apagados.');

      return true;
    } catch (err) {
      console.error('Erro ao resetar jogo:', err);
      toast.error('Erro ao resetar o jogo. Tente novamente.');
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
