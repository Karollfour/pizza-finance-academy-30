
import { useState } from 'react';
import { useSabores, Sabor } from '@/hooks/useSabores';
import { useProdutos } from '@/hooks/useProdutos';
import { toast } from '@/hooks/use-toast';
import { FormularioSabor } from './sabores/FormularioSabor';
import { CardSabor } from './sabores/CardSabor';

const GerenciadorSabores = () => {
  const { sabores, criarSabor, atualizarSabor, removerSabor } = useSabores();
  const { produtos } = useProdutos();
  const [modalAberto, setModalAberto] = useState(false);
  const [saborEditando, setSaborEditando] = useState<Sabor | null>(null);

  const handleSubmit = async (formData: {
    nome: string;
    descricao: string;
    cor: string;
    valor: number;
    ingredientes: string[];
    imagem: File | null;
  }) => {
    try {
      if (saborEditando) {
        await atualizarSabor(
          saborEditando.id,
          {
            nome: formData.nome,
            descricao: formData.descricao,
            ingredientes: formData.ingredientes,
            ...({ cor: formData.cor, valor: formData.valor } as any),
          },
          formData.imagem || undefined,
        );
        toast({ title: 'Sabor atualizado com sucesso!', description: `O sabor ${formData.nome} foi atualizado.` });
      } else {
        await criarSabor(
          formData.nome,
          formData.descricao,
          formData.ingredientes,
          formData.imagem || undefined,
          formData.cor,
          formData.valor,
        );
        toast({ title: 'Sabor criado com sucesso!', description: `O sabor ${formData.nome} foi adicionado.` });
      }

      resetForm();
      setModalAberto(false);
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível salvar o sabor.', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setSaborEditando(null);
  };

  const handleEdit = (sabor: Sabor) => {
    setSaborEditando(sabor);
    setModalAberto(true);
  };

  const handleDelete = async (sabor: Sabor) => {
    try {
      await removerSabor(sabor.id);
      toast({
        title: "Sabor removido",
        description: `O sabor ${sabor.nome} foi removido com sucesso.`
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível remover o sabor.",
        variant: "destructive"
      });
    }
  };

  const getProdutoNome = (produtoId: string) => {
    const produto = produtos.find(p => p.id === produtoId);
    return produto?.nome || 'Produto não encontrado';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gerenciar Sabores</h2>
        <FormularioSabor
          saborEditando={saborEditando}
          onSubmit={handleSubmit}
          produtos={produtos}
          modalAberto={modalAberto}
          setModalAberto={setModalAberto}
          resetForm={resetForm}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sabores.map((sabor) => (
          <CardSabor
            key={sabor.id}
            sabor={sabor}
            onEdit={handleEdit}
            onDelete={handleDelete}
            getProdutoNome={getProdutoNome}
          />
        ))}
      </div>
    </div>
  );
};

export default GerenciadorSabores;
