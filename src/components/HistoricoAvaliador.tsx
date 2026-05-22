
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useHistoricoRodadas } from '@/hooks/useHistoricoRodadas';
import { useEquipes } from '@/hooks/useEquipes';

const HistoricoAvaliador = () => {
  const [rodadaSelecionada, setRodadaSelecionada] = useState<string>('');
  const [mostrarHistorico, setMostrarHistorico] = useState(false);
  const { rodadas, refetch: refetchRodadas } = useHistoricoRodadas();
  const { equipes } = useEquipes();

  const rodadasFinalizadas = rodadas.filter(r => r.status === 'finalizada');

  // Escutar eventos globais para atualização automática
  useEffect(() => {
    const handleGlobalUpdate = (event: CustomEvent) => {
      const { table } = event.detail;
      if (table === 'rodadas' || table === 'pizzas') {
        setTimeout(() => {
          refetchRodadas();
        }, 100);
      }
    };

    const handleRodadaEvent = () => {
      setTimeout(() => {
        refetchRodadas();
      }, 100);
    };

    window.addEventListener('global-data-changed', handleGlobalUpdate as EventListener);
    window.addEventListener('rodada-finalizada', handleRodadaEvent);
    window.addEventListener('rodada-updated', handleRodadaEvent);

    return () => {
      window.removeEventListener('global-data-changed', handleGlobalUpdate as EventListener);
      window.removeEventListener('rodada-finalizada', handleRodadaEvent);
      window.removeEventListener('rodada-updated', handleRodadaEvent);
    };
  }, [refetchRodadas]);

  const getEquipeNome = (equipeId: string) => {
    const equipe = equipes.find(e => e.id === equipeId);
    return equipe ? equipe.nome : 'Equipe não encontrada';
  };

  const getSaborPizza = (pizza: any) => {
    return pizza.sabor?.nome || 'Sabor não informado';
  };

  const getNumeroPedido = (pizza: any, todasPizzasDaRodada: any[]) => {
    const pizzasDaEquipe = todasPizzasDaRodada
      .filter(p => p.equipe_id === pizza.equipe_id)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
    const indice = pizzasDaEquipe.findIndex(p => p.id === pizza.id);
    return indice + 1;
  };

  const rodadaSelecionadaObj = rodadas.find(r => r.id === rodadaSelecionada);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <Button
          onClick={() => setMostrarHistorico(!mostrarHistorico)}
          variant="outline"
          size="sm"
          className="w-full bg-purple-500 hover:bg-purple-600 text-white border-purple-500 hover:border-purple-600 font-medium"
        >
          {mostrarHistorico ? '📖 Ocultar Histórico' : '📖 Ver Histórico de Rodadas'}
        </Button>
      </div>

      {mostrarHistorico && (
        <Card className="border-2 border-purple-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-purple-600">
              📚 Histórico Completo de Rodadas e Pizzas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2 items-center">
              <Select value={rodadaSelecionada} onValueChange={setRodadaSelecionada}>
                <SelectTrigger className="w-48 h-8 text-xs">
                  <SelectValue placeholder="Selecionar rodada..." />
                </SelectTrigger>
                <SelectContent>
                  {rodadasFinalizadas.map(rodada => (
                    <SelectItem key={rodada.id} value={rodada.id}>
                      Rodada {rodada.numero}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {rodadaSelecionada && rodadaSelecionadaObj && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <div className="text-sm font-medium text-purple-800 mb-3">
                  Rodada {rodadaSelecionadaObj.numero} - 
                  Aprovadas: {rodadaSelecionadaObj.pizzas_aprovadas} | 
                  Reprovadas: {rodadaSelecionadaObj.pizzas_reprovadas} | 
                  Total: {rodadaSelecionadaObj.pizzas.length}
                </div>

                {rodadaSelecionadaObj.pizzas.length > 0 ? (
                  <div className="max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-20">Pedido</TableHead>
                          <TableHead>Equipe</TableHead>
                          <TableHead>Sabor</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Resultado</TableHead>
                          <TableHead>Motivo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...rodadaSelecionadaObj.pizzas]
                          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                          .map((pizza) => (
                            <TableRow key={pizza.id}>
                              <TableCell className="font-bold">
                                #{getNumeroPedido(pizza, rodadaSelecionadaObj.pizzas)}
                              </TableCell>
                              <TableCell>{getEquipeNome(pizza.equipe_id)}</TableCell>
                              <TableCell>{getSaborPizza(pizza)}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  {pizza.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {pizza.resultado && (
                                  <Badge
                                    variant={pizza.resultado === 'aprovada' ? 'default' : 'destructive'}
                                    className={
                                      pizza.resultado === 'aprovada'
                                        ? 'bg-green-500 text-xs'
                                        : 'bg-red-500 text-xs'
                                    }
                                  >
                                    {pizza.resultado === 'aprovada' ? '✅' : '❌'}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-xs">
                                {pizza.justificativa_reprovacao || '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-4 text-sm">
                    Nenhuma pizza foi produzida nesta rodada
                  </div>
                )}
              </div>
            )}

            {rodadaSelecionada && !rodadaSelecionadaObj && (
              <div className="text-center text-gray-500 py-4 text-sm">
                Rodada não encontrada
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default HistoricoAvaliador;
