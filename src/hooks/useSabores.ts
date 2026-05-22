
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SaborPizza } from '@/types/database';

export interface Sabor extends SaborPizza {
  ingredientes: string[];
  imagem: string | null;
}

export const useSabores = () => {
  const [sabores, setSabores] = useState<Sabor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<any>(null);
  const isSubscribedRef = useRef(false);

  const fetchSabores = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sabores_pizza')
        .select('*')
        .eq('disponivel', true)
        .order('nome');

      if (error) throw error;
      
      // Converter para o formato esperado - apenas Pepperoni e Mussarela
      // Filtrar Mussarela: manter apenas os que têm imagem (sem descrição)
      const saboresFormatados: Sabor[] = (data || [])
        .filter(sabor => {
          if (sabor.nome === 'Pepperoni') return true;
          if (sabor.nome === 'Mussarela') {
            // Manter apenas Mussarela que tem imagem e NÃO tem descrição
            return sabor.imagem && !sabor.descricao;
          }
          return false;
        })
        .map(sabor => ({
          ...sabor,
          ingredientes: [],
          imagem: sabor.imagem
        }));
      
      setSabores(saboresFormatados);
      
      // Se não houver sabores no banco, criar os padrão
      if (saboresFormatados.length === 0) {
        await inicializarSaboresDefault();
      }
    } catch (err) {
      console.error('Erro ao carregar sabores:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar sabores');
      // Fallback para sabores padrão se houver erro
      inicializarSaboresDefault();
    } finally {
      setLoading(false);
    }
  };

  const criarSabor = async (
    nome: string,
    descricao?: string,
    ingredientes?: string[],
    imagemFile?: File,
    cor?: string
  ) => {
    try {
      let imagemUrl = null;
      if (imagemFile) {
        imagemUrl = await uploadImagem(imagemFile);
      }

      const { data, error } = await supabase
        .from('sabores_pizza')
        .insert({
          nome,
          descricao: descricao || null,
          disponivel: true,
          imagem: imagemUrl,
          cor: cor || '#9CA3AF'
        })
        .select()
        .single();

      if (error) throw error;

      const novoSabor: Sabor = {
        ...data,
        ingredientes: ingredientes || [],
        imagem: imagemUrl
      };
      
      setSabores(prev => [...prev, novoSabor]);
      
      // Disparar evento global
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sabor-criado', { 
          detail: { 
            sabor: novoSabor,
            timestamp: new Date().toISOString() 
          } 
        }));
      }
      
      return novoSabor;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar sabor');
      throw err;
    }
  };

  const uploadImagem = async (file: File): Promise<string | null> => {
    try {
      // Simular upload por enquanto - retornar URL de exemplo
      return URL.createObjectURL(file);
    } catch (err) {
      console.error('Erro ao fazer upload da imagem:', err);
      return null;
    }
  };

  const atualizarSabor = async (
    id: string, 
    dados: Partial<Sabor>, 
    imagemFile?: File
  ) => {
    try {
      let imagemUrl = dados.imagem;
      if (imagemFile) {
        imagemUrl = await uploadImagem(imagemFile);
      }

      const { error } = await supabase
        .from('sabores_pizza')
        .update({
          nome: dados.nome,
          descricao: dados.descricao,
          disponivel: dados.disponivel,
          imagem: imagemUrl,
          ...((dados as any).cor !== undefined ? { cor: (dados as any).cor } : {})
        })
        .eq('id', id);

      if (error) throw error;

      const dadosAtualizados = {
        ...dados,
        imagem: imagemUrl
      };

      setSabores(prev => prev.map(sabor => 
        sabor.id === id ? { ...sabor, ...dadosAtualizados } : sabor
      ));
      
      // Disparar evento global
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sabor-atualizado', { 
          detail: { 
            saborId: id,
            sabor: dadosAtualizados,
            timestamp: new Date().toISOString() 
          } 
        }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar sabor');
      throw err;
    }
  };

  const removerSabor = async (id: string) => {
    try {
      const { error } = await supabase
        .from('sabores_pizza')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setSabores(prev => prev.filter(sabor => sabor.id !== id));
      
      // Disparar evento global
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sabor-removido', { 
          detail: { 
            saborId: id,
            timestamp: new Date().toISOString() 
          } 
        }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover sabor');
      throw err;
    }
  };

  const inicializarSaboresDefault = async () => {
    try {
      // Criar sabores padrão no banco se não existirem
      const saboresDefault = [
        { nome: 'Pepperoni', descricao: 'Pizza de pepperoni com queijo mussarela' },
        { nome: 'Mussarela', descricao: null, imagem: 'exemplo.jpg' } // Apenas Mussarela com imagem
      ];

      for (const sabor of saboresDefault) {
        // Verificar se já existe
        const { data: existente } = await supabase
          .from('sabores_pizza')
          .select('id')
          .eq('nome', sabor.nome)
          .single();

        if (!existente) {
          await supabase
            .from('sabores_pizza')
            .insert({
              nome: sabor.nome,
              descricao: sabor.descricao,
              disponivel: true,
              imagem: sabor.imagem || null
            });
        }
      }

      // Recarregar sabores após criação
      await fetchSabores();
    } catch (err) {
      console.error('Erro ao inicializar sabores default:', err);
      
      // Fallback local se o banco falhar
      const saboresLocal: Sabor[] = [
        { 
          id: '1',
          nome: 'Pepperoni', 
          descricao: 'Pizza de pepperoni com queijo mussarela',
          disponivel: true,
          created_at: new Date().toISOString(),
          ingredientes: [],
          imagem: null
        },
        { 
          id: '2',
          nome: 'Mussarela', 
          descricao: null, // Sem descrição
          disponivel: true,
          created_at: new Date().toISOString(),
          ingredientes: [],
          imagem: 'exemplo.jpg' // Com imagem
        }
      ];

      setSabores(saboresLocal);
    }
  };

  const cleanupChannel = () => {
    if (channelRef.current && isSubscribedRef.current) {
      console.log('Removendo canal de sabores');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      isSubscribedRef.current = false;
    }
  };

  // Escutar mudanças em tempo real
  useEffect(() => {
    // Cleanup any existing subscription
    cleanupChannel();

    // Create unique channel name with timestamp and random component
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const channelName = `sabores-realtime-${uniqueId}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sabores_pizza'
        },
        (payload) => {
          console.log('Sabor atualizado em tempo real:', payload);
          
          if (payload.eventType === 'INSERT') {
            const novoSabor = payload.new as SaborPizza;
            // Aplicar mesma lógica de filtro
            if (novoSabor.nome === 'Pepperoni' || 
                (novoSabor.nome === 'Mussarela' && novoSabor.imagem && !novoSabor.descricao)) {
              const saborFormatado: Sabor = {
                ...novoSabor,
                ingredientes: []
              };
              setSabores(prev => [...prev, saborFormatado]);
            }
          } else if (payload.eventType === 'UPDATE') {
            const saborAtualizado = payload.new as SaborPizza;
            if (saborAtualizado.nome === 'Pepperoni' || 
                (saborAtualizado.nome === 'Mussarela' && saborAtualizado.imagem && !saborAtualizado.descricao)) {
              const saborFormatado: Sabor = {
                ...saborAtualizado,
                ingredientes: []
              };
              setSabores(prev => prev.map(sabor => 
                sabor.id === saborFormatado.id ? saborFormatado : sabor
              ));
            } else {
              // Remover se não atende mais aos critérios
              setSabores(prev => prev.filter(sabor => sabor.id !== saborAtualizado.id));
            }
          } else if (payload.eventType === 'DELETE') {
            const saborRemovido = payload.old as SaborPizza;
            setSabores(prev => prev.filter(sabor => sabor.id !== saborRemovido.id));
          }
        }
      );

    channelRef.current = channel;

    // Subscribe only once
    if (!isSubscribedRef.current) {
      channel.subscribe((status) => {
        console.log('Status da subscrição de sabores:', status);
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
  }, []);

  useEffect(() => {
    fetchSabores();
  }, []);

  return {
    sabores,
    loading,
    error,
    criarSabor,
    atualizarSabor,
    removerSabor,
    refetch: fetchSabores
  };
};
