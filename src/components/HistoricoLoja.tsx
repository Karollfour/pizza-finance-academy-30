import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCompras } from '@/hooks/useCompras';
import { useEquipes } from '@/hooks/useEquipes';
import { useProdutos } from '@/hooks/useProdutos';
import { usePizzas } from '@/hooks/usePizzas';
import { useSabores } from '@/hooks/useSabores';

const HistoricoLoja = () => {
  const { compras } = useCompras();
  const { equipes } = useEquipes();
  const { produtos } = useProdutos();
  const { pizzas } = usePizzas();
  const { sabores } = useSabores();
  
  const [filtroTipo, setFiltroTipo] = useState<'all' | 'compras' | 'pizzas'>('all');
  const [filtroEquipe, setFiltroEquipe] = useState<string>('all');
  const [filtroData, setFiltroData] = useState<string>('');

  const getProdutoNome = (produtoId: string | null) => {
    if (!produtoId) return 'Viagem';
    const produto = produtos.find(p => p.id === produtoId);
    return produto ? produto.nome : 'Produto não encontrado';
  };

  const getEquipeNome = (equipeId: string) => {
    const equipe = equipes.find(e => e.id === equipeId);
    return equipe ? equipe.nome : 'Equipe não encontrada';
  };

  const getSaborNome = (saborId: string | null) => {
    if (!saborId) return 'Sem sabor';
    const sabor = sabores.find(s => s.id === saborId);
    return sabor ? sabor.nome : 'Sabor não encontrado';
  };

  // Combinar compras e pizzas em um histórico unificado
  const historicoCompleto = [
    ...compras.map(compra => ({
      id: compra.id,
      tipo: 'compra' as const,
      equipe_id: compra.equipe_id,
      created_at: compra.created_at,
      descricao: getProdutoNome(compra.produto_id),
      valor: compra.valor_total,
      detalhes: compra,
      status: compra.tipo
    })),
    ...pizzas.map(pizza => ({
      id: pizza.id,
      tipo: 'pizza' as const,
      equipe_id: pizza.equipe_id,
      created_at: pizza.created_at,
      descricao: `Pizza ${getSaborNome(pizza.sabor_id)}`,
      valor: 0,
      detalhes: pizza,
      status: pizza.status
    }))
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Aplicar filtros
  const historicoFiltrado = historicoCompleto.filter(item => {
    const matchTipo = filtroTipo === 'all' || 
      (filtroTipo === 'compras' && item.tipo === 'compra') ||
      (filtroTipo === 'pizzas' && item.tipo === 'pizza');
    
    const matchEquipe = filtroEquipe === 'all' || item.equipe_id === filtroEquipe;
    
    const matchData = !filtroData || 
      new Date(item.created_at).toDateString() === new Date(filtroData).toDateString();
    
    return matchTipo && matchEquipe && matchData;
  });

  // Estatísticas do histórico
  const estatisticas = {
    totalCompras: compras.length,
    totalPizzas: pizzas.length,
    faturamentoTotal: compras.reduce((sum, c) => sum + c.valor_total, 0),
    pizzasAprovadas: pizzas.filter(p => p.resultado === 'aprovada').length,
    pizzasReprovadas: pizzas.filter(p => p.resultado === 'reprovada').length
  };

  return (
    <div className="space-y-6">
      {/* Estatísticas Gerais */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-xl font-bold text-blue-600">{estatisticas.totalCompras}</div>
            <div className="text-sm text-gray-600">Total Compras</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-xl font-bold text-orange-600">{estatisticas.totalPizzas}</div>
            <div className="text-sm text-gray-600">Total Pizzas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-xl font-bold text-green-600">$ {estatisticas.faturamentoTotal.toFixed(2)}</div>
            <div className="text-sm text-gray-600">Faturamento</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-xl font-bold text-green-600">{estatisticas.pizzasAprovadas}</div>
            <div className="text-sm text-gray-600">Aprovadas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-xl font-bold text-red-600">{estatisticas.pizzasReprovadas}</div>
            <div className="text-sm text-gray-600">Reprovadas</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-blue-600">🔍 Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tipo</label>
              <Select value={filtroTipo} onValueChange={(value: 'all' | 'compras' | 'pizzas') => setFiltroTipo(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="compras">Compras</SelectItem>
                  <SelectItem value="pizzas">Pizzas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Equipe</label>
              <Select value={filtroEquipe} onValueChange={setFiltroEquipe}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as equipes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as equipes</SelectItem>
                  {equipes.map((equipe) => (
                    <SelectItem key={equipe.id} value={equipe.id}>{equipe.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Data</label>
              <input
                type="date"
                className="w-full p-2 border border-gray-300 rounded-md"
                value={filtroData}
                onChange={(e) => setFiltroData(e.target.value)}
              />
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setFiltroTipo('all');
                  setFiltroEquipe('all');
                  setFiltroData('');
                }}
                className="w-full"
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista do Histórico */}
      <Card>
        <CardHeader>
          <CardTitle className="text-blue-600">📋 Histórico Completo ({historicoFiltrado.length} itens)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {historicoFiltrado.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <div className="text-4xl mb-2">📋</div>
                <p>Nenhum item encontrado</p>
              </div>
            ) : (
              historicoFiltrado.map((item) => (
                <div key={`${item.tipo}-${item.id}`} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <Badge variant={item.tipo === 'compra' ? 'default' : 'secondary'}>
                          {item.tipo === 'compra' ? '💰' : '🍕'}
                        </Badge>
                        <span className="font-medium">{getEquipeNome(item.equipe_id)}</span>
                      </div>
                      <div className="text-sm text-gray-700 mb-1">
                        {item.descricao}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(item.created_at).toLocaleString('pt-BR')}
                      </div>
                    </div>
                    <div className="text-right">
                      {item.tipo === 'compra' && (
                        <div className="text-green-600 font-semibold">
                          $ {item.valor.toFixed(2)}
                        </div>
                      )}
                      {item.tipo === 'pizza' && (
                        <Badge 
                          variant={
                            item.detalhes.resultado === 'aprovada' ? 'default' :
                            item.detalhes.resultado === 'reprovada' ? 'destructive' :
                            'secondary'
                          }
                        >
                          {item.detalhes.resultado === 'aprovada' ? 'Aprovada' :
                           item.detalhes.resultado === 'reprovada' ? 'Reprovada' :
                           item.detalhes.status === 'pronta' ? 'Aguardando' : 'Produzindo'}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HistoricoLoja;
