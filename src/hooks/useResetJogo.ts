
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useResetJogo = () => {
  const [loading, setLoading] = useState(false);

  const resetarJogo = async () => {
    try {
      setLoading(true);
      
      // Deletar todas as pizzas
      const { error: pizzasError } = await supabase
        .from('pizzas')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

      if (pizzasError) throw pizzasError;

      // Deletar todas as compras
      const { error: comprasError } = await supabase
        .from('compras')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

      if (comprasError) throw comprasError;

      // Deletar todas as rodadas
      const { error: rodadasError } = await supabase
        .from('rodadas')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

      if (rodadasError) throw rodadasError;

      // Resetar gastos das equipes
      const { error: equipesError } = await supabase
        .from('equipes')
        .update({ gasto_total: 0 })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all rows

      if (equipesError) throw equipesError;

      // Resetar contadores usando a função do banco
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
