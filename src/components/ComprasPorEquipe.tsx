
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCompras } from '@/hooks/useCompras';
import { useEquipes } from '@/hooks/useEquipes';
import { useProdutos } from '@/hooks/useProdutos';

const ComprasPorEquipe = () => {
  const { compras } = useCompras();
  const { equipes } = useEquipes();
  const { produtos } = useProdutos();
  const [equipeSelecionada, setEquipeSelecionada] = useState<string>('');

  const comprasFiltradas = equipeSelecionada 
    ? compras.filter(c => c.equipe_id === equipeSelecionada)
    : compras;

  const getProdutoNome = (produtoId: string | null) => {
    if (!produtoId) return 'Viagem';
    const produto = produtos.find(p => p.id === produtoId);
    return produto ? produto.nome : 'Produto não encontrado';
  };

  const getEquipeNome = (equipeId: string) => {
    const equipe = equipes.find(e => e.id === equipeId);
    return equipe ? equipe.nome : 'Equipe não encontrada';
  };

  return (
    <Card className="shadow-lg border-2 border-blue-200">
      <CardHeader className="bg-blue-50">
        <CardTitle className="text-blue-600">📊 Compras por Equipe</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {/* Seletor de Equipe */}
        <div className="mb-4">
          <select
            className="w-full p-2 border border-gray-300 rounded-md"
            value={equipeSelecionada}
            onChange={(e) => setEquipeSelecionada(e.target.value)}
          >
            <option value="">Todas as equipes</option>
            {equipes.map((equipe) => (
              <option key={equipe.id} value={equipe.id}>{equipe.nome}</option>
            ))}
          </select>
        </div>

        {/* Lista de Compras */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {comprasFiltradas.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <div className="text-4xl mb-2">🛒</div>
              <p>Nenhuma compra registrada</p>
            </div>
          ) : (
            comprasFiltradas
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .map((compra) => (
                <div key={compra.id} className="p-4 bg-white rounded-lg border border-blue-200">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium text-blue-600">
                        {getEquipeNome(compra.equipe_id)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {new Date(compra.created_at).toLocaleString('pt-BR')}
                      </div>
                    </div>
                    <Badge variant={compra.tipo === 'material' ? 'default' : 'secondary'}>
                      {compra.tipo === 'material' ? '🛒 Material' : '🚗 Viagem'}
                    </Badge>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="text-sm">
                      <strong>Item:</strong> {getProdutoNome(compra.produto_id)}
                    </div>
                    {compra.quantidade && compra.quantidade > 1 && (
                      <div className="text-sm">
                        <strong>Quantidade:</strong> {compra.quantidade}
                      </div>
                    )}
                    <div className="text-sm">
                      <strong>Valor:</strong> <span className="text-green-600 font-semibold">
                        $ {compra.valor_total.toFixed(2)}
                      </span>
                    </div>
                    {compra.descricao && (
                      <div className="text-sm text-gray-600">
                        <strong>Descrição:</strong> {compra.descricao}
                      </div>
                    )}
                  </div>
                </div>
              ))
          )}
        </div>

        {/* Resumo */}
        {equipeSelecionada && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-blue-600">
                  {comprasFiltradas.length}
                </div>
                <div className="text-sm text-blue-700">Total Compras</div>
              </div>
              <div>
                <div className="text-lg font-bold text-green-600">
                  $ {comprasFiltradas.reduce((sum, c) => sum + c.valor_total, 0).toFixed(2)}
                </div>
                <div className="text-sm text-green-700">Total Gasto</div>
              </div>
              <div>
                <div className="text-lg font-bold text-orange-600">
                  {comprasFiltradas.filter(c => c.tipo === 'viagem').length}
                </div>
                <div className="text-sm text-orange-700">Viagens</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ComprasPorEquipe;
