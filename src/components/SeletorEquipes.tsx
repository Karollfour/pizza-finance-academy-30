
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEquipes } from '@/hooks/useEquipes';
import { useCompras } from '@/hooks/useCompras';

interface SeletorEquipesProps {
  onEquipeSelecionada: (equipeNome: string, equipeId: string) => void;
}

const SeletorEquipes = ({ onEquipeSelecionada }: SeletorEquipesProps) => {
  const { equipes } = useEquipes();
  const { compras } = useCompras();

  // Calcular gastos atualizados por equipe
  const calcularGastosEquipe = (equipeId: string) => {
    return compras.filter(c => c.equipe_id === equipeId).reduce((sum, c) => sum + c.valor_total, 0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-100 to-red-100 p-6 my-[6px]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-orange-600 mb-2">
            🍽️ Central de Produção
          </h1>
          <p className="text-orange-700">Selecione sua equipe para começar a produzir pizzas</p>
        </div>

        <Card className="shadow-lg border-2 border-orange-200">
          <CardHeader className="bg-orange-50">
            <CardTitle className="text-orange-600 text-center text-2xl">
              👥 Equipes Cadastradas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            {equipes.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">👥</div>
                <h3 className="text-2xl font-bold text-gray-600 mb-2">
                  Nenhuma equipe cadastrada
                </h3>
                <p className="text-gray-500">
                  Entre em contato com o professor para cadastrar as equipes
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {equipes.map(equipe => {
                  const corEquipe = equipe.cor_tema || '#3b82f6';
                  const emblemaEquipe = equipe.emblema || '👥';
                  const gastoAtualizado = calcularGastosEquipe(equipe.id);
                  const saldoRestante = equipe.saldo_inicial - gastoAtualizado;
                  
                  return (
                    <Card 
                      key={equipe.id} 
                      className="shadow-lg border-2 border-gray-200 hover:border-orange-300 transition-all duration-200 hover:scale-105"
                    >
                      <CardContent className="p-6 text-center">
                        <div className="mb-4">
                          <div className="text-6xl mb-3">{emblemaEquipe}</div>
                          <h3 className="text-xl font-bold text-gray-800 mb-2">
                            {equipe.nome}
                          </h3>
                          {equipe.professor_responsavel && (
                            <p className="text-sm text-gray-600 mb-3">
                              Prof: {equipe.professor_responsavel}
                            </p>
                          )}
                          
                          <div className="space-y-2 text-sm text-gray-600 mb-4">
                            <div className="flex justify-between">
                              <span>Saldo Inicial:</span>
                              <span className="font-medium text-green-600">
                                $ {equipe.saldo_inicial.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Gasto Total:</span>
                              <span className="font-medium text-red-600">
                                $ {gastoAtualizado.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between border-t pt-2">
                              <span>Saldo Restante:</span>
                              <span className={`font-bold ${saldoRestante >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                $ {saldoRestante.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <Button 
                          onClick={() => onEquipeSelecionada(equipe.nome, equipe.id)} 
                          className="w-full text-white font-bold py-3 text-lg transition-all duration-200 hover:opacity-90" 
                          style={{ backgroundColor: corEquipe }}
                          size="lg"
                        >
                          🍕 Entrar na Cozinha
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Informações Adicionais */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="text-center p-4 bg-blue-50 border-blue-200">
            <div className="text-3xl mb-2">🍕</div>
            <h3 className="font-bold text-blue-600">Monte Pizzas</h3>
            <p className="text-sm text-blue-700">
              Escolha ingredientes e monte suas pizzas personalizadas
            </p>
          </Card>
          
          <Card className="text-center p-4 bg-green-50 border-green-200">
            <div className="text-3xl mb-2">⏱️</div>
            <h3 className="font-bold text-green-600">Controle o Tempo</h3>
            <p className="text-sm text-green-700">
              Acompanhe o tempo da rodada e produza no ritmo certo
            </p>
          </Card>
          
          <Card className="text-center p-4 bg-yellow-50 border-yellow-200">
            <div className="text-3xl mb-2">💰</div>
            <h3 className="font-bold text-yellow-600">Gerencie o Orçamento</h3>
            <p className="text-sm text-yellow-700">
              Controle seus gastos e maximize seus resultados
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SeletorEquipes;
