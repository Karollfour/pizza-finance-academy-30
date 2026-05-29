import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ProdutoLoja } from '@/types/database';

export const useProdutos = () => {
  const [produtos, setProdutos] = useState<ProdutoLoja[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<any>(null);
  const isSubscribedRef = useRef(false);

  const fetchProdutos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('produtos_loja')
        .select('*')
        .eq('disponivel', true)
        .order('nome');

      if (error) throw error;
      setProdutos((data || []) as ProdutoLoja[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  const uploadImagem = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `produtos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('imagens')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('imagens')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err) {
      console.error('Erro ao fazer upload da imagem:', err);
      return null;
    }
  };

  const criarProduto = async (
    nome: string,
    unidade: string,
    valorUnitario: number,
    tipo: 'EQ' | 'MP' = 'MP',
    descricao?: string,
    imagemFile?: File
  ) => {
    try {
      let imagemUrl: string | null = null;
      if (imagemFile) {
        imagemUrl = await uploadImagem(imagemFile);
      }

      const { data, error } = await supabase
        .from('produtos_loja')
        .insert({
          nome,
          unidade,
          valor_unitario: valorUnitario,
          durabilidade: 1,
          tipo,
          descricao,
          imagem: imagemUrl,
        } as any)
        .select()
        .single();

      if (error) throw error;
      await fetchProdutos();
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar produto');
      throw err;
    }
  };

  const atualizarProduto = async (id: string, dados: Partial<ProdutoLoja> & { tipo?: 'EQ' | 'MP' }, imagemFile?: File) => {
    try {
      let imagemUrl = (dados as any).imagem;
      if (imagemFile) {
        imagemUrl = await uploadImagem(imagemFile);
      }

      const payload: any = { ...dados };
      if (imagemFile) payload.imagem = imagemUrl;

      const { error } = await supabase
        .from('produtos_loja')
        .update(payload)
        .eq('id', id);

      if (error) throw error;
      await fetchProdutos();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar produto');
      throw err;
    }
  };

  useEffect(() => {
    fetchProdutos();

    if (channelRef.current && isSubscribedRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      isSubscribedRef.current = false;
    }

    const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const channelName = `produtos-updates-${uniqueId}`;

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'produtos_loja' }, () => {
        fetchProdutos();
      });

    if (!isSubscribedRef.current) {
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          isSubscribedRef.current = true;
        }
      });
      channelRef.current = channel;
    }

    return () => {
      if (channelRef.current && isSubscribedRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        isSubscribedRef.current = false;
      }
    };
  }, []);

  return {
    produtos,
    loading,
    error,
    criarProduto,
    atualizarProduto,
    refetch: fetchProdutos,
  };
};
