
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTodasRodadas } from '@/hooks/useTodasRodadas';
import { useHistoricoRodadas } from '@/hooks/useHistoricoRodadas';

const FALLBACK_COR = '#9CA3AF';

const HistoricoTodasRodadas = () => {
  const [rodadaSelecionada, setRodadaSelecionada] = useState<string>('');
  const [mostrarHistorico, setMostrarHistorico] = useState(false);
  const { rodadas: todasRodadas, refetch: refetchRodadas } = useTodasRodadas();
  const { rodadas: rodadasComPizzas, refetch: refetchHistorico } = useHistoricoRodadas();

  const rodadasFinalizadas = todasRodadas.filter(r => r.status === 'finalizada');

  // Pizzas da rodada selecionada, ordem decrescente (mais recente no topo)
  const rodadaAtual = rodadasComPizzas.find(r => r.id === rodadaSelecionada);
  const pizzasDaRodada = rodadaAtual
    ? [...rodadaAtual.pizzas].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    : [];

  // Escutar eventos globais para atualização automática
  useEffect(() => {
    const handleGlobalUpdate = (event: CustomEvent) => {
      const { table } = event.detail;
      if (table === 'rodadas') {
        setTimeout(() => { refetchRodadas(); }, 100);
      }
      if ((table === 'pizzas' || table === 'rodadas') && rodadaSelecionada) {
        setTimeout(() => { refetchHistorico(); }, 150);
      }
    };

    const handleRodadaEvent = () => {
      setTimeout(() => {
        refetchRodadas();
        if (rodadaSelecionada) refetchHistorico();
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
  }, [refetchRodadas, refetchHistorico, rodadaSelecionada]);

  const getStatusBadge = (pizza: any) => {
    if (pizza.resultado === 'aprovada') {
      return (
        <Badge className="bg-emerald-500/20 text-emerald-700 border border-emerald-300 text-[10px] px-1.5 py-0 leading-4">
          ✅ Aprovada
        </Badge>
      );
    }
    if (pizza.resultado === 'reprovada') {
      return (
        <Badge className="bg-red-500/20 text-red-700 border border-red-300 text-[10px] px-1.5 py-0 leading-4">
          ❌ Reprovada
        </Badge>
      );
    }
    if (pizza.status === 'pronta') {
      return (
        <Badge className="bg-amber-500/20 text-amber-700 border border-amber-300 text-[10px] px-1.5 py-0 leading-4">
          ⏳ Aguard. avaliação
        </Badge>
      );
    }
    return (
      <Badge className="bg-slate-500/20 text-slate-600 border border-slate-300 text-[10px] px-1.5 py-0 leading-4">
        🔄 Em produção
      </Badge>
    );
  };

  const getSaborCor = (pizza: any): string => {
    return (pizza as any)?.sabor?.cor || FALLBACK_COR;
  };

  const getSaborNome = (pizza: any): string => {
    return (pizza as any)?.sabor?.nome || 'Sabor não identificado';
  };

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
              📚 Pizzas Produzidas por Rodada
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Seletor de rodada */}
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
              {rodadaAtual && (
                <span className="text-xs text-gray-500">
                  {pizzasDaRodada.length} pizza{pizzasDaRodada.length !== 1 ? 's' : ''}
                  {' · '}
                  <span className="text-emerald-600 font-medium">{rodadaAtual.pizzas_aprovadas}✅</span>
                  {' '}
                  <span className="text-red-500 font-medium">{rodadaAtual.pizzas_reprovadas}❌</span>
                </span>
              )}
            </div>

            {/* Lista de pizzas */}
            {rodadaSelecionada && pizzasDaRodada.length > 0 && (
              <TooltipProvider>
                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                  {pizzasDaRodada.map((pizza, index) => {
                    const cor = getSaborCor(pizza);
                    const nome = getSaborNome(pizza);
                    const hora = new Date(pizza.created_at).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    });
                    const numPizza = pizzasDaRodada.length - index; // número decrescente

                    return (
                      <div
                        key={pizza.id}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white border border-gray-100 hover:border-purple-200 hover:bg-purple-50/40 transition-colors duration-150"
                      >
                        {/* Número da pizza (ordem original) */}
                        <span className="text-[10px] text-gray-400 w-5 text-right shrink-0 tabular-nums">
                          #{numPizza}
                        </span>

                        {/* Bolinha colorida com tooltip do sabor */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className="w-3.5 h-3.5 rounded-full shrink-0 cursor-default ring-1 ring-white shadow-sm"
                              style={{ backgroundColor: cor }}
                            />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs px-2 py-1">
                            {nome}
                          </TooltipContent>
                        </Tooltip>

                        {/* Nome do sabor */}
                        <span className="text-xs font-medium text-gray-700 flex-1 truncate">
                          {nome}
                        </span>

                        {/* Badge de status */}
                        <div className="shrink-0">
                          {getStatusBadge(pizza)}
                        </div>

                        {/* Horário */}
                        <span className="text-[10px] text-gray-400 shrink-0 tabular-nums">
                          {hora}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </TooltipProvider>
            )}

            {rodadaSelecionada && pizzasDaRodada.length === 0 && (
              <div className="text-center text-gray-500 py-6 text-sm">
                Nenhuma pizza produzida nesta rodada
              </div>
            )}

            {!rodadaSelecionada && (
              <div className="text-center text-gray-400 py-4 text-xs">
                Selecione uma rodada para ver as pizzas produzidas
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default HistoricoTodasRodadas;
