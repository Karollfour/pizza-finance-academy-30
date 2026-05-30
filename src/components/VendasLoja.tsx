import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useCompras } from '@/hooks/useCompras';
import { useEquipes } from '@/hooks/useEquipes';
import { useProdutos } from '@/hooks/useProdutos';
import { useOptimizedRodadas } from '@/hooks/useOptimizedRodadas';
import { toast } from 'sonner';
import { Trash2, Plus, Minus, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ItemCarrinho {
  produtoId: string;
  quantidade: number;
  produto: any;
}

type FiltroTipo = 'TODOS' | 'EQ' | 'MP';

const VendasLoja = () => {
  const { compras, registrarCompra } = useCompras();
  const { equipes } = useEquipes();
  const { produtos } = useProdutos();
  const { rodadaAtual } = useOptimizedRodadas();
  const [equipeId, setEquipeId] = useState('');
  const [equipePopoverOpen, setEquipePopoverOpen] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('TODOS');
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [cobrancaViagem, setCobrancaViagem] = useState(true);
  const [descricaoVenda, setDescricaoVenda] = useState('');

  const calcularGastoTotalEquipe = (eqId: string) =>
    compras.filter(c => c.equipe_id === eqId).reduce((t, c) => t + c.valor_total, 0);

  const calcularSaldoDisponivel = (equipe: any) =>
    equipe.saldo_inicial + (equipe.ganho_total || 0) - calcularGastoTotalEquipe(equipe.id);

  const adicionarAoCarrinho = (produtoId: string) => {
    const produto = produtos.find(p => p.id === produtoId);
    if (!produto) return;
    setCarrinho(prev => {
      const existente = prev.find(i => i.produtoId === produtoId);
      if (existente) {
        return prev.map(i => i.produtoId === produtoId ? { ...i, quantidade: i.quantidade + 1 } : i);
      }
      return [...prev, { produtoId, quantidade: 1, produto }];
    });
  };

  const removerDoCarrinho = (produtoId: string) =>
    setCarrinho(prev => prev.filter(i => i.produtoId !== produtoId));

  const alterarQuantidade = (produtoId: string, nova: number) => {
    if (nova <= 0) return removerDoCarrinho(produtoId);
    setCarrinho(prev => prev.map(i => i.produtoId === produtoId ? { ...i, quantidade: nova } : i));
  };

  const subtotalProdutos = carrinho.reduce((t, i) => t + i.produto.valor_unitario * i.quantidade, 0);
  const totalCarrinho = subtotalProdutos + (cobrancaViagem ? 5 : 0);

  const equipeSelecionada = equipes.find(e => e.id === equipeId);
  const saldoDisponivel = equipeSelecionada ? calcularSaldoDisponivel(equipeSelecionada) : 0;
  const saldoInsuficiente = !!equipeSelecionada && totalCarrinho > saldoDisponivel;

  const limparCarrinho = () => {
    setCarrinho([]);
    setEquipeId('');
    setCobrancaViagem(true);
    setDescricaoVenda('');
  };

  const finalizarVenda = async () => {
    if (!equipeId) return toast.error('Selecione uma equipe!');
    if (carrinho.length === 0 && !cobrancaViagem)
      return toast.error('Adicione pelo menos um produto ou marque a cobrança de viagem!');
    if (saldoInsuficiente)
      return toast.error(`Saldo insuficiente! Disponível: $ ${saldoDisponivel.toFixed(2)} / Total: $ ${totalCarrinho.toFixed(2)}`);

    try {
      for (const item of carrinho) {
        await registrarCompra(
          equipeId, item.produtoId, rodadaAtual?.id || null,
          item.quantidade, item.produto.valor_unitario * item.quantidade,
          'material',
          descricaoVenda || `Compra: ${item.produto.nome} (${item.quantidade} ${item.produto.unidade})`
        );
      }
      if (cobrancaViagem) {
        await registrarCompra(equipeId, null, rodadaAtual?.id || null, 1, 5, 'viagem', descricaoVenda || 'Taxa de viagem à loja');
      }
      limparCarrinho();
      toast.success('Venda finalizada com sucesso!');
    } catch {
      toast.error('Erro ao finalizar venda');
    }
  };

  const getEquipeNome = (eqId: string) => equipes.find(e => e.id === eqId)?.nome || 'Equipe';

  const produtosFiltrados = useMemo(() => {
    return produtos
      .filter(p => p.disponivel)
      .filter(p => filtroTipo === 'TODOS' || (p as any).tipo === filtroTipo);
  }, [produtos, filtroTipo]);

  const vendas5Recentes = [...compras]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-blue-600">🛒 Carrinho de Compras</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Seletor de Equipe (Combobox com busca - mobile-friendly) */}
          <div>
            <label className="block text-sm font-medium mb-1">Equipe</label>
            <Popover open={equipePopoverOpen} onOpenChange={setEquipePopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between"
                >
                  {equipeSelecionada
                    ? `${equipeSelecionada.nome} - $ ${saldoDisponivel.toFixed(2)} disponível`
                    : 'Selecione uma equipe...'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-white z-50" align="start">
                <Command>
                  <CommandInput placeholder="Buscar equipe..." />
                  <CommandList>
                    <CommandEmpty>Nenhuma equipe encontrada.</CommandEmpty>
                    <CommandGroup>
                      {equipes.map(eq => {
                        const saldo = calcularSaldoDisponivel(eq);
                        return (
                          <CommandItem
                            key={eq.id}
                            value={eq.nome}
                            onSelect={() => {
                              setEquipeId(eq.id);
                              setEquipePopoverOpen(false);
                            }}
                          >
                            <Check className={cn('mr-2 h-4 w-4', equipeId === eq.id ? 'opacity-100' : 'opacity-0')} />
                            <span className="flex-1">{eq.nome}</span>
                            <span className={cn('text-xs', saldo < 0 ? 'text-red-600' : 'text-green-600')}>
                              $ {saldo.toFixed(2)}
                            </span>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Filtros por chips (Tipo: EQ / MP) */}
          <div>
            <label className="block text-sm font-medium mb-2">Filtrar por tipo</label>
            <div className="flex flex-wrap gap-2">
              {(['TODOS', 'EQ', 'MP'] as FiltroTipo[]).map(t => (
                <Badge
                  key={t}
                  onClick={() => setFiltroTipo(t)}
                  className={cn(
                    'cursor-pointer px-3 py-1 text-sm',
                    filtroTipo === t
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  )}
                >
                  {t === 'TODOS' ? '🧾 Todos' : t === 'EQ' ? '⚙️ Equipamentos' : '🥫 Matéria-prima'}
                </Badge>
              ))}
            </div>
          </div>

          {/* Produtos */}
          <div>
            <label className="block text-sm font-medium mb-1">Adicionar Produtos</label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {produtosFiltrados.map(produto => (
                <Card key={produto.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-3">
                    {produto.imagem && (
                      <img src={produto.imagem} alt={produto.nome} className="w-full h-20 rounded mb-2 object-scale-down" />
                    )}
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <h4 className="font-medium text-sm">{produto.nome}</h4>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {(produto as any).tipo || 'MP'}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600">{produto.unidade}</p>
                    <p className="text-sm font-semibold text-green-600">$ {produto.valor_unitario.toFixed(2)}</p>
                    <Button size="sm" className="w-full mt-2" onClick={() => adicionarAoCarrinho(produto.id)}>
                      <Plus className="w-3 h-3 mr-1" /> Adicionar
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Carrinho */}
          {carrinho.length > 0 && (
            <div>
              <Separator className="my-4" />
              <h3 className="font-medium mb-3">Itens no Carrinho</h3>
              <div className="space-y-2">
                {carrinho.map(item => (
                  <div key={item.produtoId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg flex-wrap gap-2">
                    <div className="flex items-center space-x-3">
                      {item.produto.imagem && (
                        <img src={item.produto.imagem} alt={item.produto.nome} className="w-10 h-10 object-cover rounded" />
                      )}
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
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox id="cobrancaViagem" checked={cobrancaViagem} onCheckedChange={c => setCobrancaViagem(c === true)} />
              <label htmlFor="cobrancaViagem" className="text-sm">Cobrar taxa de viagem à loja ($ 5,00)</label>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Observações (opcional)</label>
              <Input placeholder="Detalhes da venda..." value={descricaoVenda} onChange={e => setDescricaoVenda(e.target.value)} />
            </div>
          </div>

          {(carrinho.length > 0 || cobrancaViagem) && (
            <div className={cn(
              'p-4 rounded-lg',
              saldoInsuficiente ? 'bg-red-50 border-2 border-red-300' : 'bg-blue-50'
            )}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm">Subtotal produtos:</span>
                <span className="font-semibold">$ {subtotalProdutos.toFixed(2)}</span>
              </div>
              {cobrancaViagem && (
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm">Taxa de viagem:</span>
                  <span className="font-semibold">$ 5,00</span>
                </div>
              )}
              <Separator className="my-2" />
              <div className="flex justify-between items-center text-lg">
                <span className="font-bold">Total:</span>
                <span className="font-bold text-green-600">$ {totalCarrinho.toFixed(2)}</span>
              </div>
              {equipeSelecionada && (
                <div className={cn('mt-2 text-sm flex justify-between', saldoInsuficiente ? 'text-red-700 font-semibold' : 'text-gray-600')}>
                  <span>Saldo disponível da equipe:</span>
                  <span>$ {saldoDisponivel.toFixed(2)}</span>
                </div>
              )}
              {saldoInsuficiente && (
                <div className="mt-2 text-sm text-red-700 font-medium">
                  ⚠️ Saldo insuficiente. A venda não pode ser concluída.
                </div>
              )}
            </div>
          )}

          <div className="flex space-x-2">
            <Button
              onClick={finalizarVenda}
              className="flex-1"
              disabled={!equipeId || saldoInsuficiente}
            >
              Finalizar Venda
            </Button>
            <Button onClick={limparCarrinho} variant="outline">Limpar Carrinho</Button>
          </div>
        </CardContent>
      </Card>

      {/* Vendas Recentes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-blue-600">🕒 Vendas Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {vendas5Recentes.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <div className="text-4xl mb-2">💰</div>
                <p>Nenhuma venda registrada</p>
              </div>
            ) : vendas5Recentes.map(venda => (
              <div key={venda.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{getEquipeNome(venda.equipe_id)}</div>
                    <div className="text-sm text-gray-600">
                      {venda.produto_id ? produtos.find(p => p.id === venda.produto_id)?.nome || 'Produto' : 'Viagem'} • {new Date(venda.created_at).toLocaleString('pt-BR')}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={venda.tipo === 'material' ? 'default' : 'secondary'}>
                      {venda.tipo === 'material' ? '🛒' : '🚗'}
                    </Badge>
                    <div className="text-green-600 font-semibold">$ {venda.valor_total.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VendasLoja;
