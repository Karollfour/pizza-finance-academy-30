import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SaborPizza } from '@/types/database';

export interface Sabor extends SaborPizza {
  ingredientes: string[];
  imagem: string | null;
  valor: number;
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

      const saboresFormatados: Sabor[] = (data || []).map((s: any) => ({
        ...s,
        ingredientes: [],
        imagem: s.imagem,
        valor: Number(s.valor || 0),
      }));

      setSabores(saboresFormatados);
    } catch (err) {
      console.error('Erro ao carregar sabores:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar sabores');
    } finally {
      setLoading(false);
    }
  };

  const criarSabor = async (
    nome: string,
    descricao?: string,
    ingredientes?: string[],
    imagemFile?: File,
    cor?: string,
    valor?: number,
  ) => {
    try {
      let imagemUrl: string | null = null;
      if (imagemFile) imagemUrl = await uploadImagem(imagemFile);

      const { data, error } = await supabase
        .from('sabores_pizza')
        .insert({
          nome,
          descricao: descricao || null,
          disponivel: true,
          imagem: imagemUrl,
          cor: cor || '#9CA3AF',
          valor: Number(valor || 0),
        } as any)
        .select()
        .single();

      if (error) throw error;

      const novoSabor: Sabor = {
        ...(data as any),
        ingredientes: ingredientes || [],
        imagem: imagemUrl,
        valor: Number((data as any).valor || 0),
      };

      setSabores((prev) => [...prev, novoSabor]);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sabor-criado', { detail: { sabor: novoSabor, timestamp: new Date().toISOString() } }));
      }
      return novoSabor;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar sabor');
      throw err;
    }
  };

  const uploadImagem = async (file: File): Promise<string | null> => {
    try {
      return URL.createObjectURL(file);
    } catch {
      return null;
    }
  };

  const atualizarSabor = async (id: string, dados: Partial<Sabor>, imagemFile?: File) => {
    try {
      let imagemUrl = dados.imagem;
      if (imagemFile) imagemUrl = await uploadImagem(imagemFile);

      const payload: any = {
        nome: dados.nome,
        descricao: dados.descricao,
        disponivel: dados.disponivel,
        imagem: imagemUrl,
      };
      if ((dados as any).cor !== undefined) payload.cor = (dados as any).cor;
      if ((dados as any).valor !== undefined) payload.valor = Number((dados as any).valor);

      const { error } = await supabase.from('sabores_pizza').update(payload).eq('id', id);
      if (error) throw error;

      const dadosAtualizados = { ...dados, imagem: imagemUrl };
      setSabores((prev) => prev.map((s) => (s.id === id ? { ...s, ...(dadosAtualizados as any) } : s)));

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sabor-atualizado', { detail: { saborId: id, sabor: dadosAtualizados, timestamp: new Date().toISOString() } }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar sabor');
      throw err;
    }
  };

  const removerSabor = async (id: string) => {
    try {
      const { error } = await supabase.from('sabores_pizza').delete().eq('id', id);
      if (error) throw error;
      setSabores((prev) => prev.filter((s) => s.id !== id));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sabor-removido', { detail: { saborId: id, timestamp: new Date().toISOString() } }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover sabor');
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

  useEffect(() => {
    cleanupChannel();
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const channelName = `sabores-realtime-${uniqueId}`;

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sabores_pizza' }, (payload: any) => {
        if (payload.eventType === 'INSERT') {
          const novo = payload.new;
          if (novo.disponivel) {
            const formatted: Sabor = { ...novo, ingredientes: [], valor: Number(novo.valor || 0) };
            setSabores((prev) => (prev.find((s) => s.id === formatted.id) ? prev : [...prev, formatted]));
          }
        } else if (payload.eventType === 'UPDATE') {
          const upd = payload.new;
          if (upd.disponivel) {
            const formatted: Sabor = { ...upd, ingredientes: [], valor: Number(upd.valor || 0) };
            setSabores((prev) => {
              const exists = prev.find((s) => s.id === formatted.id);
              return exists ? prev.map((s) => (s.id === formatted.id ? formatted : s)) : [...prev, formatted];
            });
          } else {
            setSabores((prev) => prev.filter((s) => s.id !== upd.id));
          }
        } else if (payload.eventType === 'DELETE') {
          setSabores((prev) => prev.filter((s) => s.id !== payload.old.id));
        }
      });

    channelRef.current = channel;

    if (!isSubscribedRef.current) {
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') isSubscribedRef.current = true;
        else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') isSubscribedRef.current = false;
      });
    }

    return () => cleanupChannel();
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
    refetch: fetchSabores,
  };
};
