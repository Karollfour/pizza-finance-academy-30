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
import { useTodasRodadas } from '@/hooks/useTodasRodadas';
import { toast } from 'sonner';
import { Trash2, Plus, Minus, Check, ChevronsUpDown, X } from 'lucide-react';
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
  const { rodadas } = useTodasRodadas();
  const [equipeId, setEquipeId] = useState('');
  const [equipePopoverOpen, setEquipePopoverOpen] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('TODOS');
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [cobrancaViagem, setCobrancaViagem] = useState(true);
  const [descricaoVenda, setDescricaoVenda] = useState('');
  const [filtroRodadas, setFiltroRodadas] = useState<string[]>([]);
  const [filtroProdutos, setFiltroProdutos] = useState<string[]>([]);
  const [produtoFlash, setProdutoFlash] = useState<string | null>(null);
  const [statusVenda, setStatusVenda] = useState<'idle' | 'processando' | 'sucesso' | 'erro'>('idle');
  const [erroVenda, setErroVenda] = useState<string>('');

  const gastoNaRodadaAtual = (eqId: string) =>
    compras
      .filter(c => c.equipe_id === eqId && rodadaAtual?.id && c.rodada_id === rodadaAtual.id)
      .reduce((t, c) => t + Number(c.valor_total || 0), 0);

  const calcularSaldoDisponivel = (equipe: any) =>
    Number(equipe.saldo_inicial || 0) - gastoNaRodadaAtual(equipe.id);



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

    setStatusVenda('processando');
    setErroVenda('');
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
      setStatusVenda('sucesso');
      toast.success('Venda finalizada com sucesso!');
      window.setTimeout(() => {
        limparCarrinho();
        setStatusVenda('idle');
      }, 1500);
    } catch (e: any) {
      setStatusVenda('erro');
      setErroVenda(e?.message || 'Erro ao finalizar venda');
      toast.error('Erro ao finalizar venda');
      window.setTimeout(() => setStatusVenda('idle'), 2500);
    }
  };

  const getEquipeNome = (eqId: string) => equipes.find(e => e.id === eqId)?.nome || 'Equipe';

  const produtosFiltrados = useMemo(() => {
    return produtos
      .filter(p => p.disponivel)
      .filter(p => filtroTipo === 'TODOS' || (p as any).tipo === filtroTipo);
  }, [produtos, filtroTipo]);

  const vendasOrdenadas = useMemo(
    () => [...compras].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [compras]
  );

  const vendasFiltradas = useMemo(() => {
    return vendasOrdenadas.filter(v => {
      const okEquipe = !equipeId || v.equipe_id === equipeId;
      const okRodada = filtroRodadas.length === 0 || (v.rodada_id && filtroRodadas.includes(v.rodada_id));
      const okProduto = filtroProdutos.length === 0 || (v.produto_id && filtroProdutos.includes(v.produto_id));
      return okEquipe && okRodada && okProduto;
    });
  }, [vendasOrdenadas, equipeId, filtroRodadas, filtroProdutos]);

  const handleAdicionarComFeedback = (produtoId: string) => {
    adicionarAoCarrinho(produtoId);
    setProdutoFlash(produtoId);
    window.setTimeout(() => {
      setProdutoFlash(prev => (prev === produtoId ? null : prev));
    }, 700);
  };

  const toggleRodadaFiltro = (id: string) =>
    setFiltroRodadas(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleProdutoFiltro = (id: string) =>
    setFiltroProdutos(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const limparFiltrosVendas = () => { setFiltroRodadas([]); setFiltroProdutos([]); };

  const getRodadaNumero = (id: string | null) => id ? (rodadas.find(r => r.id === id)?.numero ?? '?') : '-';
  const getProdutoNome = (id: string | null) => id ? (produtos.find(p => p.id === id)?.nome || 'Produto') : 'Viagem';
  const produtosUsadosEmVendas = useMemo(() => {
    const ids = new Set(compras.map(c => c.produto_id).filter(Boolean) as string[]);
    return produtos.filter(p => ids.has(p.id));
  }, [compras, produtos]);


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
              {produtosFiltrados.map(produto => {
                const isFlash = produtoFlash === produto.id;
                return (
                <Card key={produto.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-3">
                    <div className="flex gap-3">
                      {/* Imagem do produto */}
                      <div className="shrink-0">
                        {produto.imagem ? (
                          <img
                            src={produto.imagem}
                            alt={produto.nome}
                            className="w-12 h-12 rounded-lg object-cover bg-gray-100"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-xl">
                            🍕
                          </div>
                        )}
                      </div>
                      {/* Info do produto */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <h4 className="font-medium text-sm truncate">{produto.nome}</h4>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                            {(produto as any).tipo || 'MP'}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600">{produto.unidade}</p>
                        <p className="text-sm font-semibold text-green-600">$ {produto.valor_unitario.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="relative mt-2">
                      <Button
                        size="sm"
                        className={cn(
                          'w-full transition-all duration-200',
                          isFlash && 'bg-green-500 hover:bg-green-500 scale-110'
                        )}
                        onClick={() => handleAdicionarComFeedback(produto.id)}
                      >
                        <Plus className="w-3 h-3 mr-1" /> {isFlash ? 'Adicionado!' : 'Adicionar'}
                      </Button>
                      {isFlash && (
                        <span className="pointer-events-none absolute -top-3 right-1 bg-green-600 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow animate-bounce">
                          +1
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );})}
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

          <div className="flex flex-col gap-2">
            <div className="flex space-x-2">
              <Button
                onClick={finalizarVenda}
                className={cn(
                  'flex-1 transition-all duration-200',
                  statusVenda === 'processando' && 'bg-blue-700 hover:bg-blue-700',
                  statusVenda === 'sucesso' && 'bg-green-600 hover:bg-green-600',
                  statusVenda === 'erro' && 'bg-red-600 hover:bg-red-600'
                )}
                disabled={!equipeId || saldoInsuficiente || statusVenda === 'processando' || statusVenda === 'sucesso'}
              >
                {statusVenda === 'processando' && (
                  <>
                    <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Processando...
                  </>
                )}
                {statusVenda === 'sucesso' && <>✅ Compra realizada!</>}
                {statusVenda === 'erro' && <>❌ Erro — tentar novamente</>}
                {statusVenda === 'idle' && <>Finalizar Venda</>}
              </Button>
              <Button onClick={limparCarrinho} variant="outline" disabled={statusVenda === 'processando'}>Limpar Carrinho</Button>
            </div>
            {statusVenda === 'erro' && erroVenda && (
              <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">
                {erroVenda}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Vendas Recentes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-blue-600 flex items-center justify-between flex-wrap gap-2">
            <span>🕒 Vendas Recentes</span>
            <span className="text-xs font-normal text-gray-500">
              Mostrando {vendasFiltradas.length} de {vendasOrdenadas.length} vendas
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={cn(
            'text-sm px-3 py-2 rounded-md border',
            equipeSelecionada
              ? 'bg-blue-50 border-blue-200 text-blue-800 font-medium'
              : 'bg-gray-50 border-gray-200 text-gray-700'
          )}>
            👁️ Vendas de: <span className="font-semibold">{equipeSelecionada ? equipeSelecionada.nome : 'Todas as equipes'}</span>
          </div>
          {/* Filtros */}
          <div className="space-y-3">
            <div>
              <div className="text-xs font-medium text-gray-600 mb-1">Filtrar por rodada</div>
              <div className="flex flex-wrap gap-2">
                <Badge
                  onClick={() => setFiltroRodadas([])}
                  className={cn(
                    'cursor-pointer px-3 py-1 text-xs',
                    filtroRodadas.length === 0
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  )}
                >
                  Todas
                </Badge>
                {rodadas.map(r => (
                  <Badge
                    key={r.id}
                    onClick={() => toggleRodadaFiltro(r.id)}
                    className={cn(
                      'cursor-pointer px-3 py-1 text-xs',
                      filtroRodadas.includes(r.id)
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    )}
                  >
                    Rodada {r.numero}
                  </Badge>
                ))}
              </div>
            </div>

            {produtosUsadosEmVendas.length > 0 && (
              <div>
                <div className="text-xs font-medium text-gray-600 mb-1">Filtrar por produto</div>
                <div className="flex flex-wrap gap-2">
                  {produtosUsadosEmVendas.map(p => (
                    <Badge
                      key={p.id}
                      onClick={() => toggleProdutoFiltro(p.id)}
                      className={cn(
                        'cursor-pointer px-3 py-1 text-xs',
                        filtroProdutos.includes(p.id)
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      )}
                    >
                      {p.nome}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {(filtroRodadas.length > 0 || filtroProdutos.length > 0) && (
              <Button variant="outline" size="sm" onClick={limparFiltrosVendas}>
                <X className="w-3 h-3 mr-1" /> Limpar filtros
              </Button>
            )}
          </div>

          <Separator />

          <div className="space-y-3">
            {vendasFiltradas.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <div className="text-4xl mb-2">💰</div>
                <p>Nenhuma venda encontrada</p>
              </div>
            ) : vendasFiltradas.map(venda => (
              <div key={venda.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-start gap-2 flex-wrap">
                  <div className="min-w-0">
                    <div className="font-medium">{getEquipeNome(venda.equipe_id)}</div>
                    <div className="text-sm text-gray-700">
                      {getProdutoNome(venda.produto_id)}
                      {venda.quantidade ? ` • ${Number(venda.quantidade)} un` : ''}
                    </div>
                    <div className="text-xs text-gray-500">
                      Rodada {getRodadaNumero(venda.rodada_id)} • {new Date(venda.created_at).toLocaleString('pt-BR')}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={venda.tipo === 'material' ? 'default' : 'secondary'}>
                      {venda.tipo === 'material' ? '🛒' : '🚗'}
                    </Badge>
                    <div className="text-green-600 font-semibold">$ {Number(venda.valor_total).toFixed(2)}</div>
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
