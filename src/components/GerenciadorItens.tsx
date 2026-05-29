import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProdutos } from '@/hooks/useProdutos';
import { toast } from 'sonner';

type TipoItem = 'EQ' | 'MP';

const GerenciadorItens = () => {
  const { produtos, criarProduto, atualizarProduto } = useProdutos();
  const [novoProduto, setNovoProduto] = useState<{
    nome: string;
    unidade: string;
    valorUnitario: number;
    tipo: TipoItem;
    descricao: string;
  }>({
    nome: '',
    unidade: '',
    valorUnitario: 0,
    tipo: 'MP',
    descricao: '',
  });
  const [novaImagem, setNovaImagem] = useState<File | null>(null);
  const [editandoProduto, setEditandoProduto] = useState<string | null>(null);
  const [edicaoEstado, setEdicaoEstado] = useState<Record<string, { valorUnitario: number; tipo: TipoItem }>>({});

  const handleCriarProduto = async () => {
    if (!novoProduto.nome || !novoProduto.unidade || novoProduto.valorUnitario <= 0) {
      toast.error('Nome, unidade e valor são obrigatórios!');
      return;
    }
    try {
      await criarProduto(
        novoProduto.nome,
        novoProduto.unidade,
        novoProduto.valorUnitario,
        novoProduto.tipo,
        novoProduto.descricao,
        novaImagem || undefined,
      );
      setNovoProduto({ nome: '', unidade: '', valorUnitario: 0, tipo: 'MP', descricao: '' });
      setNovaImagem(null);
      toast.success('Produto criado com sucesso!');
    } catch {
      toast.error('Erro ao criar produto');
    }
  };

  const handleAtualizarProduto = async (produtoId: string, dados: any, imagemFile?: File) => {
    try {
      await atualizarProduto(produtoId, dados, imagemFile);
      toast.success('Produto atualizado com sucesso!');
      setEditandoProduto(null);
    } catch {
      toast.error('Erro ao atualizar produto');
    }
  };

  const toggleDisponibilidade = async (produtoId: string, disponivel: boolean) => {
    try {
      await atualizarProduto(produtoId, { disponivel: !disponivel });
      toast.success(`Produto ${!disponivel ? 'ativado' : 'desativado'} com sucesso!`);
    } catch {
      toast.error('Erro ao alterar disponibilidade');
    }
  };

  const tipoLabel = (t?: string | null) => (t === 'EQ' ? 'Equipamento' : 'Matéria Prima');
  const tipoBadgeClass = (t?: string | null) =>
    t === 'EQ' ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-emerald-100 text-emerald-800 border-emerald-300';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-blue-600">➕ Criar Novo Produto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="np-nome">Nome do produto</Label>
              <Input
                id="np-nome"
                placeholder="Ex: Mussarela"
                value={novoProduto.nome}
                onChange={(e) => setNovoProduto((p) => ({ ...p, nome: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="np-unidade">Unidade</Label>
              <Input
                id="np-unidade"
                placeholder="kg, unidade, litro..."
                value={novoProduto.unidade}
                onChange={(e) => setNovoProduto((p) => ({ ...p, unidade: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="np-valor">Valor unitário ($)</Label>
              <Input
                id="np-valor"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={novoProduto.valorUnitario}
                onChange={(e) => setNovoProduto((p) => ({ ...p, valorUnitario: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="np-tipo">Tipo</Label>
              <Select
                value={novoProduto.tipo}
                onValueChange={(v) => setNovoProduto((p) => ({ ...p, tipo: v as TipoItem }))}
              >
                <SelectTrigger id="np-tipo">
                  <SelectValue placeholder="Tipo do item" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MP">Matéria Prima (MP)</SelectItem>
                  <SelectItem value="EQ">Equipamento (EQ)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="np-desc">Descrição (opcional)</Label>
            <Textarea
              id="np-desc"
              placeholder="Detalhes do produto"
              value={novoProduto.descricao}
              onChange={(e) => setNovoProduto((p) => ({ ...p, descricao: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="np-img">Imagem (opcional)</Label>
            <Input
              id="np-img"
              type="file"
              accept="image/*"
              onChange={(e) => setNovaImagem(e.target.files?.[0] || null)}
              className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
          <Button onClick={handleCriarProduto} className="w-full">
            Criar Produto
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-blue-600">📦 Produtos Cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {produtos.length === 0 ? (
              <div className="col-span-full text-center text-gray-500 py-8">
                <div className="text-4xl mb-2">📦</div>
                <p>Nenhum produto cadastrado</p>
              </div>
            ) : (
              produtos.map((produto: any) => {
                const tipoAtual: TipoItem = produto.tipo === 'EQ' ? 'EQ' : 'MP';
                const edicao = edicaoEstado[produto.id] || { valorUnitario: produto.valor_unitario, tipo: tipoAtual };
                return (
                  <Card key={produto.id} className={produto.disponivel ? 'border-green-200' : 'border-red-200'}>
                    <CardContent className="p-4">
                      {produto.imagem && (
                        <div className="mb-3">
                          <img src={produto.imagem} alt={produto.nome} className="w-full h-32 rounded-lg object-scale-down" />
                        </div>
                      )}

                      <div className="flex justify-between items-start mb-2 gap-2">
                        <h3 className="font-semibold text-lg">{produto.nome}</h3>
                        <div className="flex flex-col gap-1 items-end">
                          <Badge variant={produto.disponivel ? 'default' : 'secondary'}>
                            {produto.disponivel ? 'Disponível' : 'Indisponível'}
                          </Badge>
                          <Badge variant="outline" className={tipoBadgeClass(produto.tipo)}>
                            {tipoLabel(produto.tipo)}
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-1 text-sm text-gray-600 mb-3">
                        <p><strong>Unidade:</strong> {produto.unidade}</p>
                        <p><strong>Valor:</strong> $ {Number(produto.valor_unitario).toFixed(2)}</p>
                        {produto.descricao && <p><strong>Descrição:</strong> {produto.descricao}</p>}
                      </div>

                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const isOpen = editandoProduto === produto.id;
                            setEditandoProduto(isOpen ? null : produto.id);
                            if (!isOpen) {
                              setEdicaoEstado((prev) => ({
                                ...prev,
                                [produto.id]: { valorUnitario: produto.valor_unitario, tipo: tipoAtual },
                              }));
                            }
                          }}
                        >
                          {editandoProduto === produto.id ? 'Cancelar' : 'Editar'}
                        </Button>
                        <Button
                          variant={produto.disponivel ? 'destructive' : 'default'}
                          size="sm"
                          onClick={() => toggleDisponibilidade(produto.id, produto.disponivel)}
                        >
                          {produto.disponivel ? 'Desativar' : 'Ativar'}
                        </Button>
                      </div>

                      {editandoProduto === produto.id && (
                        <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                          <div className="space-y-1">
                            <Label>Valor unitário ($)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={edicao.valorUnitario}
                              onChange={(e) =>
                                setEdicaoEstado((prev) => ({
                                  ...prev,
                                  [produto.id]: { ...edicao, valorUnitario: Number(e.target.value) },
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label>Tipo</Label>
                            <Select
                              value={edicao.tipo}
                              onValueChange={(v) =>
                                setEdicaoEstado((prev) => ({
                                  ...prev,
                                  [produto.id]: { ...edicao, tipo: v as TipoItem },
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="MP">Matéria Prima (MP)</SelectItem>
                                <SelectItem value="EQ">Equipamento (EQ)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label>Trocar imagem</Label>
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleAtualizarProduto(produto.id, {}, file);
                              }}
                              className="file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-blue-50 file:text-blue-700"
                            />
                          </div>
                          <Button
                            size="sm"
                            className="w-full"
                            onClick={() =>
                              handleAtualizarProduto(produto.id, {
                                valor_unitario: edicao.valorUnitario,
                                tipo: edicao.tipo,
                              })
                            }
                          >
                            Salvar Alterações
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GerenciadorItens;
