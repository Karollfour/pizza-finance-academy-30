import { memo, useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useHistoricoSaboresRodada } from '@/hooks/useHistoricoSaboresRodada';
import { useSabores } from '@/hooks/useSabores';
import { Rodada } from '@/types/database';

interface HistoricoSaboresAutomaticoProps {
  rodada: Rodada | null;
  numeroPizzas: number;
}

const HistoricoSaboresAutomatico = memo(({ rodada, numeroPizzas }: HistoricoSaboresAutomaticoProps) => {
  const { historico } = useHistoricoSaboresRodada(rodada?.id);
  const { sabores } = useSabores();
  const [saboresFinalizadosEstavel, setSaboresFinalizadosEstavel] = useState<any[]>([]);
  const lastHistoricoRef = useRef<any[]>([]);
  const lastSaboresFinalizadosRef = useRef<any[]>([]);

  const formatarTempo = useCallback((segundos: number) => {
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const intervaloTroca = useMemo(() => {
    return rodada && numeroPizzas > 0 ? Math.floor(rodada.tempo_limite / numeroPizzas) : 0;
  }, [rodada?.tempo_limite, numeroPizzas]);

  useEffect(() => {
    const handleSaborFinalizado = (event: CustomEvent) => {
      const { saboresPassados } = event.detail;
      if (saboresPassados && Array.isArray(saboresPassados)) {
        const novosPassadosString = JSON.stringify(saboresPassados);
        const atualString = JSON.stringify(lastSaboresFinalizadosRef.current);
        if (novosPassadosString !== atualString) {
          lastSaboresFinalizadosRef.current = saboresPassados;
          setSaboresFinalizadosEstavel([...saboresPassados]);
        }
      }
    };
    window.addEventListener('sabor-automatico-alterado', handleSaborFinalizado as EventListener);
    return () => window.removeEventListener('sabor-automatico-alterado', handleSaborFinalizado as EventListener);
  }, []);

  useEffect(() => {
    if (!rodada || !historico.length) {
      if (saboresFinalizadosEstavel.length > 0) {
        setSaboresFinalizadosEstavel([]);
        lastSaboresFinalizadosRef.current = [];
      }
      return;
    }
    const historicoString = JSON.stringify(historico);
    const lastHistoricoString = JSON.stringify(lastHistoricoRef.current);
    if (historicoString !== lastHistoricoString) {
      lastHistoricoRef.current = [...historico];
    }
  }, [historico, rodada]);

  const getSaborCor = (item: any): string => {
    if (item?.sabor?.cor) return item.sabor.cor;
    const s = sabores.find(x => x.id === item?.sabor_id);
    return (s as any)?.cor || '#9CA3AF';
  };

  const getSaborNome = (item: any): string => {
    if (item?.sabor?.nome) return item.sabor.nome;
    const s = sabores.find(x => x.id === item?.sabor_id);
    return s?.nome || 'Sabor não encontrado';
  };

  // Numeração original + ordem decrescente (mais recente primeiro)
  const itensRenderizados = useMemo(() => {
    return saboresFinalizadosEstavel
      .map((sabor, index) => ({ sabor, numero: index + 1 }))
      .slice()
      .reverse();
  }, [saboresFinalizadosEstavel]);

  if (!rodada || lastHistoricoRef.current.length === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <Card className="shadow-md border border-amber-200 mb-4">
        <CardHeader className="py-2 px-3">
          <CardTitle className="text-amber-600 text-sm">
            📋 Histórico — Rodada {rodada.numero} ({saboresFinalizadosEstavel.length}/{lastHistoricoRef.current.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2 px-3">
          {saboresFinalizadosEstavel.length === 0 && rodada.status === 'ativa' ? (
            <p className="text-xs text-gray-400 text-center py-2">Nenhum sabor finalizado ainda...</p>
          ) : (
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
              {itensRenderizados.map(({ sabor, numero }) => {
                const cor = getSaborCor(sabor);
                const nome = getSaborNome(sabor);
                const horario = sabor.tempoFinalizado
                  ? new Date(sabor.tempoFinalizado).toLocaleTimeString('pt-BR')
                  : '--:--';
                return (
                  <Tooltip key={`fin-${sabor.id}-${numero}`}>
                    <TooltipTrigger asChild>
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-sm cursor-default border border-white"
                        style={{ backgroundColor: cor }}
                      >
                        {numero}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-xs">
                        <div className="font-semibold">#{numero} — {nome}</div>
                        <div className="text-muted-foreground">Finalizado: {horario}</div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
});

HistoricoSaboresAutomatico.displayName = 'HistoricoSaboresAutomatico';

export default HistoricoSaboresAutomatico;
