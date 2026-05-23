
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSaborAutomatico } from '@/hooks/useSaborAutomatico';
import { Rodada } from '@/types/database';

interface SaborAutomaticoDisplayProps {
  rodada: Rodada | null;
  numeroPizzas: number;
}

const SaborAutomaticoDisplay = ({ rodada, numeroPizzas }: SaborAutomaticoDisplayProps) => {
  const {
    saborAtual,
    proximoSabor,
    segundoProximoSabor,
    saboresPassados,
    saborAtualIndex,
    intervaloTroca,
    tempoProximaTroca,
    totalSabores
  } = useSaborAutomatico({ rodada, numeroPizzas });

  if (!rodada || rodada.status !== 'ativa' || !saborAtual) {
    return (
      <Card className="shadow-lg border-2 border-gray-200">
        <CardContent className="p-6 text-center">
          <div className="text-4xl mb-4">🍕</div>
          <p className="text-gray-500">Aguardando rodada ativa com sequência definida...</p>
        </CardContent>
      </Card>
    );
  }

  const progressoAtual = intervaloTroca > 0 ? 
    Math.max(0, 100 - (tempoProximaTroca / intervaloTroca * 100)) : 0;

  const formatarTempo = (segundos: number) => {
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const corAtual = saborAtual.sabor?.cor || '#9CA3AF';

  return (
    <div className="space-y-6">
      {/* Sabor Atual */}
      <Card
        className="shadow-xl border-4"
        style={{
          borderColor: corAtual,
          backgroundColor: `${corAtual}22`,
        }}
      >
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-green-700">
            🍕 SABOR ATUAL - Pizza #{saborAtualIndex + 1}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div
            className="mx-auto rounded-full border-4 border-white shadow-lg flex items-center justify-center"
            style={{ width: 96, height: 96, backgroundColor: corAtual }}
          >
            <span className="text-3xl">🍕</span>
          </div>
          <h2 className="text-4xl font-bold text-green-700">
            {saborAtual.sabor?.nome || 'Sabor não encontrado'}
          </h2>
          
          {saborAtual.sabor?.descricao && (
            <p className="text-lg text-green-600">
              {saborAtual.sabor.descricao}
            </p>
          )}
          
          <div className="space-y-2">
            <div className="text-sm text-green-600">
              Tempo restante para próxima troca: {formatarTempo(tempoProximaTroca)}
            </div>
            <Progress value={progressoAtual} className="w-full" />
            <div className="text-xs text-green-500">
              Intervalo: {formatarTempo(intervaloTroca)} por pizza
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Próximos 2 Sabores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {proximoSabor && (
          <Card className="shadow-lg border-2 bg-blue-50" style={{ borderColor: proximoSabor.sabor?.cor || '#9CA3AF' }}>
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-blue-600 text-lg">
                🔜 PRÓXIMO - Pizza #{saborAtualIndex + 2}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-2">
              <div className="text-4xl mb-2">🍕</div>
              <h3 className="text-xl font-bold text-blue-700">
                {proximoSabor.sabor?.nome || 'Sabor não encontrado'}
              </h3>
              {proximoSabor.sabor?.descricao && (
                <p className="text-sm text-blue-600">
                  {proximoSabor.sabor.descricao}
                </p>
              )}
              <div className="text-sm text-blue-600">
                Em {formatarTempo(tempoProximaTroca)}
              </div>
            </CardContent>
          </Card>
        )}

        {segundoProximoSabor && (
          <Card className="shadow-lg border-2 bg-purple-50" style={{ borderColor: segundoProximoSabor.sabor?.cor || '#9CA3AF' }}>
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-purple-600 text-lg">
                🔜 DEPOIS - Pizza #{saborAtualIndex + 3}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-2">
              <div className="text-4xl mb-2">🍕</div>
              <h3 className="text-xl font-bold text-purple-700">
                {segundoProximoSabor.sabor?.nome || 'Sabor não encontrado'}
              </h3>
              {segundoProximoSabor.sabor?.descricao && (
                <p className="text-sm text-purple-600">
                  {segundoProximoSabor.sabor.descricao}
                </p>
              )}
              <div className="text-sm text-purple-600">
                Em {formatarTempo(tempoProximaTroca + intervaloTroca)}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Histórico de Sabores Passados */}
      {saboresPassados.length > 0 && (
        <Card className="shadow-sm border border-amber-200">
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-amber-600 text-sm">
              📜 Sabores Já Passados ({saboresPassados.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 pt-0">
            <TooltipProvider delayDuration={100}>
              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                {[...saboresPassados]
                  .map((sabor, idx) => ({ sabor, numero: idx + 1 }))
                  .reverse()
                  .map(({ sabor, numero }) => (
                    <Tooltip key={sabor.id}>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1.5 px-1.5 py-1 bg-amber-50 rounded border border-amber-200 cursor-default">
                          <span className="text-[10px] font-semibold text-amber-700">#{numero}</span>
                          <span
                            className="inline-block rounded-full border border-black/10"
                            style={{
                              width: 14,
                              height: 14,
                              backgroundColor: sabor.sabor?.cor || '#9CA3AF',
                            }}
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        <div className="font-medium">{sabor.sabor?.nome || 'Sabor não encontrado'}</div>
                        {sabor.tempoFinalizado && (
                          <div className="text-[10px] opacity-70">
                            {new Date(sabor.tempoFinalizado).toLocaleTimeString('pt-BR')}
                          </div>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  ))}
              </div>
            </TooltipProvider>
          </CardContent>
        </Card>
      )}

      {/* Informações da Sequência */}
      <Card className="shadow-lg border-2 border-gray-200">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="bg-green-100 p-3 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{saborAtualIndex + 1}</div>
              <div className="text-sm text-green-700">Pizza Atual</div>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{saboresPassados.length}</div>
              <div className="text-sm text-blue-700">Finalizadas</div>
            </div>
            <div className="bg-orange-100 p-3 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{totalSabores - saborAtualIndex - 1}</div>
              <div className="text-sm text-orange-700">Restantes</div>
            </div>
            <div className="bg-gray-100 p-3 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">{formatarTempo(intervaloTroca)}</div>
              <div className="text-sm text-gray-700">Por Pizza</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SaborAutomaticoDisplay;
