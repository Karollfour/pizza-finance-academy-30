
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useHistoricoRodadas } from '@/hooks/useHistoricoRodadas';
import { useEquipes } from '@/hooks/useEquipes';
import { supabase } from '@/integrations/supabase/client';

const HistoricoAvaliador = () => {
  const [rodadaSelecionada, setRodadaSelecionada] = useState<string>('');
  const [mostrarHistorico, setMostrarHistorico] = useState(false);
  const [saboresMap, setSaboresMap] = useState<Record<string, { nome: string; cor: string }>>({});
  const { rodadas, refetch: refetchRodadas } = useHistoricoRodadas();
  const { equipes } = useEquipes();

  const rodadasFinalizadas = rodadas.filter(r => r.status === 'finalizada');

  useEffect(() => {
    const carregarSabores = async () => {
      const { data } = await supabase
        .from('sabores_pizza')
        .select('id, nome, cor');
      if (data) {
        const map: Record<string, { nome: string; cor: string }> = {};
        data.forEach((s: any) => {
          map[s.id] = { nome: s.nome, cor: s.cor || '#9CA3AF' };
        });
        setSaboresMap(map);
      }
    };
    carregarSabores();
  }, []);

  useEffect(() => {
    const handleGlobalUpdate = (event: CustomEvent) => {
      const { table } = event.detail;
      if (table === 'rodadas' || table === 'pizzas') {
        setTimeout(() => refetchRodadas(), 100);
      }
    };

    const handleRodadaEvent = () => {
      setTimeout(() => refetchRodadas(), 100);
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

  const getSaborInfo = (pizza: any): { nome: string; cor: string } => {
    if (pizza.sabor_id && saboresMap[pizza.sabor_id]) {
      return saboresMap[pizza.sabor_id];
    }
    if (pizza.sabor?.nome) {
      return { nome: pizza.sabor.nome, cor: '#9CA3AF' };
    }
    return { nome: 'Sabor não informado', cor: '#9CA3AF' };
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
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-sm text-purple-600">
              📚 Histórico Completo de Rodadas e Pizzas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pb-3">
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
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-2">
                <div className="text-xs font-medium text-purple-800 mb-2">
                  Rodada {rodadaSelecionadaObj.numero} ·
                  ✅ {rodadaSelecionadaObj.pizzas_aprovadas} ·
                  ❌ {rodadaSelecionadaObj.pizzas_reprovadas} ·
                  Total: {rodadaSelecionadaObj.pizzas.length}
                </div>

                {rodadaSelecionadaObj.pizzas.length > 0 ? (
                  <TooltipProvider delayDuration={150}>
                    <div className="max-h-96 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="h-7">
                            <TableHead className="h-7 py-1 px-2 text-[11px] w-12">#</TableHead>
                            <TableHead className="h-7 py-1 px-2 text-[11px]">Equipe</TableHead>
                            <TableHead className="h-7 py-1 px-2 text-[11px] w-12 text-center">Sabor</TableHead>
                            <TableHead className="h-7 py-1 px-2 text-[11px] w-14 text-center">Result.</TableHead>
                            <TableHead className="h-7 py-1 px-2 text-[11px]">Motivo</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[...rodadaSelecionadaObj.pizzas]
                            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                            .map((pizza) => {
                              const sabor = getSaborInfo(pizza);
                              return (
                                <TableRow key={pizza.id} className="h-8">
                                  <TableCell className="py-1 px-2 text-xs font-bold">
                                    #{getNumeroPedido(pizza, rodadaSelecionadaObj.pizzas)}
                                  </TableCell>
                                  <TableCell className="py-1 px-2 text-xs">
                                    {getEquipeNome(pizza.equipe_id)}
                                  </TableCell>
                                  <TableCell className="py-1 px-2 text-center">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span
                                          className="inline-block w-3.5 h-3.5 rounded-full border border-foreground/20 align-middle cursor-help"
                                          style={{ backgroundColor: sabor.cor }}
                                          aria-label={sabor.nome}
                                        />
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="text-xs">
                                        {sabor.nome}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TableCell>
                                  <TableCell className="py-1 px-2 text-center">
                                    {pizza.resultado && (
                                      <span className="text-sm">
                                        {pizza.resultado === 'aprovada' ? '✅' : '❌'}
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell className="py-1 px-2 text-[11px] text-muted-foreground truncate max-w-[140px]">
                                    {pizza.justificativa_reprovacao || '-'}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                        </TableBody>
                      </Table>
                    </div>
                  </TooltipProvider>
                ) : (
                  <div className="text-center text-gray-500 py-3 text-xs">
                    Nenhuma pizza foi produzida nesta rodada
                  </div>
                )}
              </div>
            )}

            {rodadaSelecionada && !rodadaSelecionadaObj && (
              <div className="text-center text-gray-500 py-3 text-xs">
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
