
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePizzas } from '@/hooks/usePizzas';
import { useEquipes } from '@/hooks/useEquipes';
import { useRodadas } from '@/hooks/useRodadas';
import { useHistoricoSaboresRodada } from '@/hooks/useHistoricoSaboresRodada';
import { toast } from 'sonner';
import HistoricoAvaliador from './HistoricoAvaliador';

const AvaliadorScreen = () => {
  const { rodadaAtual, loading: rodadaLoading } = useRodadas();
  const { equipes } = useEquipes();
  const [equipeParaAvaliar, setEquipeParaAvaliar] = useState<string | null>(null);
  // IMPORTANTE: NÃO filtrar por rodadaAtual.id — pizzas pendentes devem permanecer visíveis
  // mesmo após a rodada terminar, até serem avaliadas.
  const { pizzas, avaliarPizza } = usePizzas(equipeParaAvaliar || undefined);
  const { historico: saboresEsperados } = useHistoricoSaboresRodada(rodadaAtual?.id);
  const [motivosReprovacao, setMotivosReprovacao] = useState<{ [key: string]: string }>({});
  const [avaliandoIds, setAvaliandoIds] = useState<Set<string>>(new Set());


  // Cores predefinidas para as equipes
  const coresEquipe = [
    'bg-red-500 hover:bg-red-600',
    'bg-blue-500 hover:bg-blue-600', 
    'bg-green-500 hover:bg-green-600',
    'bg-yellow-500 hover:bg-yellow-600',
    'bg-purple-500 hover:bg-purple-600',
    'bg-pink-500 hover:bg-pink-600',
    'bg-indigo-500 hover:bg-indigo-600',
    'bg-orange-500 hover:bg-orange-600'
  ];

  // Opções de motivos para reprovação
  const motivosReprovacaoOpcoes = [
    { value: 'none', label: '🔄 Nenhum motivo (para aprovar)' },
    { value: 'fora_padrao', label: 'Fora do Padrão' },
    { value: 'sequencia_errada', label: 'Sequência Errada' },
    { value: 'fora_padrao_sequencia_errada', label: 'Fora do padrão e Sequência Errada' }
  ];

  // Ordenar pizzas cronologicamente (mais antiga primeiro)
  const pizzasOrdenadas = pizzas.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  
  const pizzasPendentes = pizzasOrdenadas.filter(p => p.status === 'pronta' && (p as any).enviada_para_avaliacao === true);
  const pizzasAvaliadas = pizzasOrdenadas.filter(p => p.status === 'avaliada');

  // Função para obter o número do pedido baseado na ordem cronológica
  const getNumeroPedido = (pizza: any) => {
    // Ordenar todas as pizzas da equipe na rodada por data de criação
    const todasPizzasOrdenadas = pizzas
      .filter(p => p.equipe_id === pizza.equipe_id && p.rodada_id === pizza.rodada_id)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
    // Encontrar o índice da pizza atual na lista ordenada
    const indice = todasPizzasOrdenadas.findIndex(p => p.id === pizza.id);
    return indice + 1;
  };

  const handleEvaluation = async (pizzaId: string, approved: boolean) => {
    if (avaliandoIds.has(pizzaId)) return; // proteção contra clique duplo
    setAvaliandoIds(prev => new Set(prev).add(pizzaId));
    try {
      const justificativa = approved ? 'Pizza aprovada!' : motivosReprovacao[pizzaId] || '';
      
      await avaliarPizza(
        pizzaId,
        approved ? 'aprovada' : 'reprovada',
        justificativa,
        'Avaliador'
      );

      const newMotivos = { ...motivosReprovacao };
      delete newMotivos[pizzaId];
      setMotivosReprovacao(newMotivos);

      toast.success(`Pizza ${approved ? 'aprovada' : 'reprovada'} com sucesso!`);
    } catch (error) {
      toast.error('Erro ao avaliar pizza');
    } finally {
      setAvaliandoIds(prev => {
        const n = new Set(prev);
        n.delete(pizzaId);
        return n;
      });
    }
  };


  const updateMotivoReprovacao = (pizzaId: string, motivo: string) => {
    setMotivosReprovacao({
      ...motivosReprovacao,
      [pizzaId]: motivo === 'none' ? undefined : motivo,
    });
  };

  const getMotivoLabel = (value: string) => {
    const opcao = motivosReprovacaoOpcoes.find(op => op.value === value);
    return opcao ? opcao.label : value;
  };

  const getEquipeNome = (equipeId: string) => {
    const equipe = equipes.find(e => e.id === equipeId);
    return equipe ? equipe.nome : 'Equipe não encontrada';
  };

  const getEquipeSelecionada = () => {
    return equipes.find(e => e.id === equipeParaAvaliar);
  };

  const getCorEquipe = (index: number) => {
    return coresEquipe[index % coresEquipe.length];
  };

  const getSaborPizza = (pizza: any) => {
    return pizza.sabor?.nome || 'Sabor não informado';
  };

  // Aguardar fetch inicial do banco para refletir o estado real (rodada atual)
  if (rodadaLoading && !rodadaAtual) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="text-5xl mb-4 animate-spin inline-block">🍕</div>
            <h2 className="text-xl font-bold text-purple-700 mb-2">Sincronizando com o servidor...</h2>
            <p className="text-sm text-gray-600">Carregando estado atual da rodada</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Se não selecionou equipe ainda, mostrar seletor
  if (!equipeParaAvaliar) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-purple-600 mb-2">
              🧑‍🏫 Central de Avaliação
            </h1>
            <p className="text-purple-700">Selecione uma equipe para avaliar suas pizzas</p>
            {rodadaAtual && (
              <div className="mt-4 p-3 bg-white/70 rounded-lg">
                <span className="text-lg font-semibold text-purple-800">
                  Rodada {rodadaAtual.numero} - Status: {rodadaAtual.status}
                </span>
              </div>
            )}
          </div>

          <Card className="shadow-lg border-2 border-purple-200">
            <CardHeader className="bg-purple-50">
              <CardTitle className="text-purple-600 text-center text-2xl">
                👥 Equipes para Avaliação
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
                  {equipes.map((equipe, index) => {
                    const cor = getCorEquipe(index);
                    
                    return (
                      <Card 
                        key={equipe.id} 
                        className="shadow-lg border-2 border-gray-200 hover:border-purple-300 transition-all duration-200 hover:scale-105"
                      >
                        <CardContent className="p-6 text-center">
                          <div className="mb-4">
                            <div className="text-6xl mb-3">👥</div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">
                              {equipe.nome}
                            </h3>
                            {equipe.professor_responsavel && (
                              <p className="text-sm text-gray-600 mb-3">
                                Prof: {equipe.professor_responsavel}
                              </p>
                            )}
                          </div>
                          
                          <Button
                            onClick={() => setEquipeParaAvaliar(equipe.id)}
                            className={`w-full text-white font-bold py-3 text-lg ${cor} transition-all duration-200`}
                            size="lg"
                          >
                            🧑‍🏫 Avaliar Equipe
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const equipeSelecionada = getEquipeSelecionada();
  const indexEquipe = equipes.findIndex(e => e.id === equipeParaAvaliar);
  const corEquipe = getCorEquipe(indexEquipe);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header com equipe selecionada */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <Button
              onClick={() => setEquipeParaAvaliar(null)}
              variant="outline"
              className="bg-white/90 backdrop-blur-sm border-2 border-purple-200 hover:bg-purple-50"
            >
              ← Voltar às Equipes
            </Button>
            <div className={`px-8 py-4 rounded-lg text-white shadow-lg ${corEquipe.split(' ')[0]}`}>
              <h1 className="text-3xl font-bold">{equipeSelecionada?.nome}</h1>
            </div>
          </div>
          <p className="text-gray-600">Avaliando pizzas da equipe selecionada - Ordenadas cronologicamente</p>
          {rodadaAtual && (
            <div className="mt-4 p-3 bg-white/70 rounded-lg">
              <span className="text-lg font-semibold text-purple-800">
                Rodada {rodadaAtual.numero} - Status: {rodadaAtual.status}
              </span>
            </div>
          )}
        </div>

        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending">
              🍕 Pendentes ({pizzasPendentes.length})
            </TabsTrigger>
            <TabsTrigger value="evaluated">
              ✅ Avaliadas ({pizzasAvaliadas.length})
            </TabsTrigger>
            <TabsTrigger value="history">
              📚 Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-6">
            {pizzasPendentes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pizzasPendentes.map((pizza) => (
                  <Card key={pizza.id} className="shadow-lg border-2 border-yellow-200">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>{getEquipeNome(pizza.equipe_id)}</span>
                        <Badge variant="outline">
                          Rodada {rodadaAtual?.numero || 'N/A'}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        <span className="font-bold text-lg text-gray-800">Pedido #{getNumeroPedido(pizza)}</span> • Pizza #{pizza.id.slice(-6)} • Sabor: {getSaborPizza(pizza)} • Enviada: {new Date(pizza.created_at).toLocaleTimeString('pt-BR')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Visualização da Pizza com Sabor */}
                      <div className="bg-gradient-to-br from-yellow-100 to-orange-100 p-6 rounded-lg text-center">
                        <div className="text-6xl mb-2">🍕</div>
                        <div className="space-y-1">
                          <p className="text-lg font-semibold text-gray-700">Pizza {getSaborPizza(pizza)}</p>
                          <p className="text-gray-600">Produzida pela {getEquipeNome(pizza.equipe_id)}</p>
                        </div>
                      </div>

                      {/* Comparador: Sabor solicitado x Sabor produzido */}
                      {(() => {
                        const numPedido = getNumeroPedido(pizza);
                        const esperado = saboresEsperados.find(s => s.ordem === numPedido);
                        const corEsperado = (esperado?.sabor?.cor as string) || '#9CA3AF';
                        const nomeEsperado = esperado?.sabor?.nome || '— não definido —';
                        const corProduzido = ((pizza as any).sabor?.cor as string) || '#9CA3AF';
                        const nomeProduzido = (pizza as any).sabor?.nome || 'Sem sabor';
                        const coincidem = esperado && (pizza as any).sabor_id === esperado.sabor_id;
                        return (
                          <div className={`p-3 rounded-lg border-2 ${
                            esperado
                              ? (coincidem ? 'border-green-400 bg-green-50' : 'border-orange-400 bg-orange-50')
                              : 'border-gray-200 bg-gray-50'
                          }`}>
                            <div className="text-xs font-medium mb-2 text-gray-700">
                              🔍 Comparador (Pedido #{numPedido})
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <div className="text-[11px] text-gray-500 mb-1">Solicitado pelo carrossel</div>
                                <div className="flex items-center gap-2">
                                  <span className="w-4 h-4 rounded-full border border-gray-300" style={{ backgroundColor: corEsperado }} />
                                  <span className="font-medium">{nomeEsperado}</span>
                                </div>
                              </div>
                              <div>
                                <div className="text-[11px] text-gray-500 mb-1">Produzido pela equipe</div>
                                <div className="flex items-center gap-2">
                                  <span className="w-4 h-4 rounded-full border border-gray-300" style={{ backgroundColor: corProduzido }} />
                                  <span className="font-medium">{nomeProduzido}</span>
                                </div>
                              </div>
                            </div>
                            {esperado && (
                              <div className={`mt-2 text-xs font-semibold ${coincidem ? 'text-green-700' : 'text-orange-700'}`}>
                                {coincidem ? '✅ Sabores coincidem' : '⚠️ Sabores divergem — verifique antes de aprovar'}
                              </div>
                            )}
                          </div>
                        );
                      })()}


                      {/* Dropdown de Motivo de Reprovação */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                          Avaliação da pizza:
                        </label>
                        <Select
                          value={motivosReprovacao[pizza.id] || 'none'}
                          onValueChange={(value) => updateMotivoReprovacao(pizza.id, value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecione uma opção..." />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            {motivosReprovacaoOpcoes.map((opcao) => (
                              <SelectItem key={opcao.value} value={opcao.value}>
                                {opcao.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Botões de Avaliação */}
                      <div className="flex gap-3">
                        <Button
                          onClick={() => handleEvaluation(pizza.id, true)}
                          disabled={!!motivosReprovacao[pizza.id] || avaliandoIds.has(pizza.id)}
                          className="flex-1 bg-green-500 hover:bg-green-600 text-white disabled:opacity-50"
                        >
                          {avaliandoIds.has(pizza.id) ? '⏳ Avaliando...' : '✅ Aprovar'}
                        </Button>
                        <Button
                          onClick={() => handleEvaluation(pizza.id, false)}
                          disabled={!motivosReprovacao[pizza.id] || avaliandoIds.has(pizza.id)}
                          className="flex-1 bg-red-500 hover:bg-red-600 text-white disabled:opacity-50"
                        >
                          {avaliandoIds.has(pizza.id) ? '⏳ Avaliando...' : '❌ Reprovar'}
                        </Button>
                      </div>


                      {motivosReprovacao[pizza.id] ? (
                        <p className="text-sm text-orange-600 text-center">
                          Motivo selecionado: {getMotivoLabel(motivosReprovacao[pizza.id])}. Para aprovar, selecione "Nenhum motivo".
                        </p>
                      ) : (
                        <p className="text-sm text-green-600 text-center">
                          Pizza pronta para aprovação ou selecione um motivo para reprovar
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="shadow-lg border-2 border-green-200">
                <CardContent className="text-center py-12">
                  <div className="text-6xl mb-4">🎉</div>
                  <h3 className="text-xl font-bold text-gray-600 mb-2">
                    Todas as pizzas desta equipe foram avaliadas!
                  </h3>
                  <p className="text-gray-500">
                    Aguardando novas pizzas da {equipeSelecionada?.nome} para avaliação
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="evaluated" className="space-y-6">
            {pizzasAvaliadas.length > 0 ? (
              <div className="space-y-4">
                {pizzasAvaliadas.map((pizza) => (
                  <Card key={pizza.id} className="shadow-lg border-2 border-blue-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="text-2xl">🍕</div>
                          <div>
                            <h3 className="font-bold">{getEquipeNome(pizza.equipe_id)}</h3>
                            <p className="text-sm text-gray-600">
                              Pedido #{getNumeroPedido(pizza)} • Pizza #{pizza.id.slice(-6)} • Sabor: {getSaborPizza(pizza)} • Rodada {rodadaAtual?.numero || 'N/A'}
                            </p>
                            <p className="text-xs text-gray-500">
                              Avaliada: {new Date(((pizza as any).avaliada_em) || pizza.updated_at).toLocaleString('pt-BR')}
                            </p>

                          </div>
                        </div>
                        <div className="text-right">
                          <Badge
                            variant={pizza.resultado === 'aprovada' ? 'default' : 'destructive'}
                            className={
                              pizza.resultado === 'aprovada'
                                ? 'bg-green-500'
                                : 'bg-red-500'
                            }
                          >
                            {pizza.resultado === 'aprovada' ? '✅ Aprovada' : '❌ Reprovada'}
                          </Badge>
                          {pizza.justificativa_reprovacao && pizza.resultado === 'reprovada' && (
                            <p className="text-sm text-gray-600 mt-2 max-w-xs">
                              "{getMotivoLabel(pizza.justificativa_reprovacao)}"
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="shadow-lg border-2 border-gray-200">
                <CardContent className="text-center py-12">
                  <div className="text-6xl mb-4">📝</div>
                  <h3 className="text-xl font-bold text-gray-600 mb-2">
                    Nenhuma pizza avaliada ainda
                  </h3>
                  <p className="text-gray-500">
                    As pizzas avaliadas da {equipeSelecionada?.nome} aparecerão aqui
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <HistoricoAvaliador />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AvaliadorScreen;
