
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useCompras } from '@/hooks/useCompras';
import { useEquipes } from '@/hooks/useEquipes';
import { useProdutos } from '@/hooks/useProdutos';
import { useOptimizedRodadas } from '@/hooks/useOptimizedRodadas';
import { toast } from 'sonner';
import { Trash2, Plus, Minus } from 'lucide-react';

interface ItemCarrinho {
  produtoId: string;
  quantidade: number;
  produto: any;
}

const VendasLoja = () => {
  const {
    compras,
    registrarCompra
  } = useCompras();
  const {
    equipes
  } = useEquipes();
  const {
    produtos
  } = useProdutos();
  const {
    rodadaAtual
  } = useOptimizedRodadas();
  const [equipeId, setEquipeId] = useState('');
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [cobrancaViagem, setCobrancaViagem] = useState(true);
  const [descricaoVenda, setDescricaoVenda] = useState('');

  // Função para calcular o gasto total de uma equipe baseado nas compras do banco
  const calcularGastoTotalEquipe = (equipeId: string) => {
    const comprasEquipe = compras.filter(compra => compra.equipe_id === equipeId);
    return comprasEquipe.reduce((total, compra) => total + compra.valor_total, 0);
  };

  // Função para calcular o saldo disponível real de uma equipe
  const calcularSaldoDisponivel = (equipe: any) => {
    const gastoTotal = calcularGastoTotalEquipe(equipe.id);
    return equipe.saldo_inicial - gastoTotal;
  };

  const adicionarAoCarrinho = (produtoId: string) => {
    const produto = produtos.find(p => p.id === produtoId);
    if (!produto) return;
    const itemExistente = carrinho.find(item => item.produtoId === produtoId);
    if (itemExistente) {
      setCarrinho(prev => prev.map(item => item.produtoId === produtoId ? {
        ...item,
        quantidade: item.quantidade + 1
      } : item));
    } else {
      setCarrinho(prev => [...prev, {
        produtoId,
        quantidade: 1,
        produto
      }]);
    }
  };

  const removerDoCarrinho = (produtoId: string) => {
    setCarrinho(prev => prev.filter(item => item.produtoId !== produtoId));
  };

  const alterarQuantidade = (produtoId: string, novaQuantidade: number) => {
    if (novaQuantidade <= 0) {
      removerDoCarrinho(produtoId);
      return;
    }
    setCarrinho(prev => prev.map(item => item.produtoId === produtoId ? {
      ...item,
      quantidade: novaQuantidade
    } : item));
  };

  const calcularTotalCarrinho = () => {
    const totalProdutos = carrinho.reduce((total, item) => total + item.produto.valor_unitario * item.quantidade, 0);
    const valorViagem = cobrancaViagem ? 5 : 0;
    return totalProdutos + valorViagem;
  };

  const limparCarrinho = () => {
    setCarrinho([]);
    setEquipeId('');
    setCobrancaViagem(true);
    setDescricaoVenda('');
  };

  const finalizarVenda = async () => {
    if (!equipeId) {
      toast.error('Selecione uma equipe!');
      return;
    }
    if (carrinho.length === 0 && !cobrancaViagem) {
      toast.error('Adicione pelo menos um produto ou marque a cobrança de viagem!');
      return;
    }
    try {
      // Registrar compra para cada produto no carrinho
      for (const item of carrinho) {
        await registrarCompra(equipeId, item.produtoId, rodadaAtual?.id || null, item.quantidade, item.produto.valor_unitario * item.quantidade, 'material', descricaoVenda || `Compra: ${item.produto.nome} (${item.quantidade} ${item.produto.unidade})`);
      }

      // Registrar cobrança de viagem se marcada
      if (cobrancaViagem) {
        await registrarCompra(equipeId, null, rodadaAtual?.id || null, 1, 5, 'viagem', descricaoVenda || 'Taxa de viagem à loja');
      }
      limparCarrinho();
      toast.success('Venda finalizada com sucesso!');
    } catch (error) {
      toast.error('Erro ao finalizar venda');
    }
  };

  const getEquipeNome = (equipeId: string) => {
    const equipe = equipes.find(e => e.id === equipeId);
    return equipe ? equipe.nome : 'Equipe não encontrada';
  };

  const vendas5Recentes = compras.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);
  const totalVendasHoje = compras.filter(c => {
    const hoje = new Date().toDateString();
    const dataCompra = new Date(c.created_at).toDateString();
    return hoje === dataCompra;
  }).reduce((sum, c) => sum + c.valor_total, 0);

  return <div className="space-y-6">
      {/* Carrinho de Compras */}
      <Card>
        <CardHeader>
          <CardTitle className="text-blue-600">🛒 Carrinho de Compras</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Seleção de Equipe */}
          <div>
            <label className="block text-sm font-medium mb-1">Equipe</label>
            <Select value={equipeId} onValueChange={setEquipeId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma equipe" />
              </SelectTrigger>
              <SelectContent>
                {equipes.map(equipe => {
                  const saldoDisponivel = calcularSaldoDisponivel(equipe);
                  return (
                    <SelectItem key={equipe.id} value={equipe.id}>
                      {equipe.nome} - $ {saldoDisponivel.toFixed(2)} disponível
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Seleção de Produtos */}
          <div>
            <label className="block text-sm font-medium mb-1">Adicionar Produtos</label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {produtos.filter(p => p.disponivel).map(produto => <Card key={produto.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-3">
                      {produto.imagem && <img src={produto.imagem} alt={produto.nome} className="w-full h-20 rounded mb-2 object-scale-down" />}
                      <h4 className="font-medium text-sm">{produto.nome}</h4>
                      <p className="text-xs text-gray-600">{produto.unidade}</p>
                      <p className="text-sm font-semibold text-green-600">
                        $ {produto.valor_unitario.toFixed(2)}
                      </p>
                      <Button size="sm" className="w-full mt-2" onClick={() => adicionarAoCarrinho(produto.id)}>
                        <Plus className="w-3 h-3 mr-1" />
                        Adicionar
                      </Button>
                    </CardContent>
                  </Card>)}
            </div>
          </div>

          {/* Itens no Carrinho */}
          {carrinho.length > 0 && <div>
              <Separator className="my-4" />
              <h3 className="font-medium mb-3">Itens no Carrinho</h3>
              <div className="space-y-2">
                {carrinho.map(item => <div key={item.produtoId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {item.produto.imagem && <img src={item.produto.imagem} alt={item.produto.nome} className="w-10 h-10 object-cover rounded" />}
                      <div>
                        <p className="font-medium">{item.produto.nome}</p>
                        <p className="text-sm text-gray-600">
                          $ {item.produto.valor_unitario.toFixed(2)} por {item.produto.unidade}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" onClick={() => alterarQuantidade(item.produtoId, item.quantidade - 1)}>
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-8 text-center">{item.quantidade}</span>
                      <Button variant="outline" size="sm" onClick={() => alterarQuantidade(item.produtoId, item.quantidade + 1)}>
                        <Plus className="w-3 h-3" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => removerDoCarrinho(item.produtoId)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                      <span className="font-semibold text-green-600 ml-2">
                        $ {(item.produto.valor_unitario * item.quantidade).toFixed(2)}
                      </span>
                    </div>
                  </div>)}
              </div>
            </div>}

          {/* Opções Adicionais */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox id="cobrancaViagem" checked={cobrancaViagem} onCheckedChange={checked => setCobrancaViagem(checked === true)} />
              <label htmlFor="cobrancaViagem" className="text-sm">Cobrar taxa de viagem à loja ($ 5,00)</label>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Observações (opcional)</label>
              <Input placeholder="Detalhes da venda..." value={descricaoVenda} onChange={e => setDescricaoVenda(e.target.value)} />
            </div>
          </div>

          {/* Total e Finalização */}
          {(carrinho.length > 0 || cobrancaViagem) && <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm">Subtotal produtos:</span>
                <span className="font-semibold">
                  $ {carrinho.reduce((total, item) => total + item.produto.valor_unitario * item.quantidade, 0).toFixed(2)}
                </span>
              </div>
              {cobrancaViagem && <div className="flex justify-between items-center mb-2">
                  <span className="text-sm">Taxa de viagem:</span>
                  <span className="font-semibold">$ 5,00</span>
                </div>}
              <Separator className="my-2" />
              <div className="flex justify-between items-center text-lg">
                <span className="font-bold">Total:</span>
                <span className="font-bold text-green-600">
                  $ {calcularTotalCarrinho().toFixed(2)}
                </span>
              </div>
            </div>}

          <div className="flex space-x-2">
            <Button onClick={finalizarVenda} className="flex-1" disabled={!equipeId}>
              Finalizar Venda
            </Button>
            <Button onClick={limparCarrinho} variant="outline">
              Limpar Carrinho
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resumo de Vendas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              $ {totalVendasHoje.toFixed(2)}
            </div>
            <div className="text-sm text-gray-600">Vendas Hoje</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {compras.length}
            </div>
            <div className="text-sm text-gray-600">Total de Vendas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              $ {compras.reduce((sum, c) => sum + c.valor_total, 0).toFixed(2)}
            </div>
            <div className="text-sm text-gray-600">Faturamento Total</div>
          </CardContent>
        </Card>
      </div>

      {/* Vendas Recentes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-blue-600">🕒 Vendas Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {vendas5Recentes.length === 0 ? <div className="text-center text-gray-500 py-8">
                <div className="text-4xl mb-2">💰</div>
                <p>Nenhuma venda registrada</p>
              </div> : vendas5Recentes.map(venda => <div key={venda.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{getEquipeNome(venda.equipe_id)}</div>
                      <div className="text-sm text-gray-600">
                        {venda.produto_id ? produtos.find(p => p.id === venda.produto_id)?.nome || 'Produto não encontrado' : 'Viagem'} • {new Date(venda.created_at).toLocaleString('pt-BR')}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={venda.tipo === 'material' ? 'default' : 'secondary'}>
                        {venda.tipo === 'material' ? '🛒' : '🚗'}
                      </Badge>
                      <div className="text-green-600 font-semibold">
                        $ {venda.valor_total.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>)}
          </div>
        </CardContent>
      </Card>
    </div>;
};

export default VendasLoja;
