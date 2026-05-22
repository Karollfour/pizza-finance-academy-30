import { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useHistoricoSaboresRodada } from '@/hooks/useHistoricoSaboresRodada';
import { useSabores } from '@/hooks/useSabores';
import { useSaborAutomatico } from '@/hooks/useSaborAutomatico';
import { Rodada } from '@/types/database';

interface VisualizadorSaboresRodadaProps {
  rodada: Rodada | null;
  numeroPizzas: number;
}

const VisualizadorSaboresRodada = ({
  rodada,
  numeroPizzas
}: VisualizadorSaboresRodadaProps) => {
  const {
    historico,
    loading: loadingHistorico,
    refetch
  } = useHistoricoSaboresRodada(rodada?.id);
  const {
    sabores,
    loading: loadingSabores
  } = useSabores();

  // Usar o sistema automático de sabores
  const {
    saborAtual,
    proximoSabor,
    segundoProximoSabor,
    saboresPassados,
    saborAtualIndex,
    intervaloTroca,
    tempoProximaTroca
  } = useSaborAutomatico({
    rodada,
    numeroPizzas
  });

  // Escutar eventos globais para atualização imediata
  useEffect(() => {
    const handleGlobalUpdate = (event: CustomEvent) => {
      const { table } = event.detail;
      if (table === 'historico_sabores_rodada' || table === 'rodadas') {
        setTimeout(() => {
          refetch();
        }, 100);
      }
    };

    const handleRodadaEvent = () => {
      setTimeout(() => {
        refetch();
      }, 100);
    };

    window.addEventListener('global-data-changed', handleGlobalUpdate as EventListener);
    window.addEventListener('rodada-iniciada', handleRodadaEvent);
    window.addEventListener('rodada-updated', handleRodadaEvent);
    window.addEventListener('sabor-automatico-alterado', handleRodadaEvent);

    return () => {
      window.removeEventListener('global-data-changed', handleGlobalUpdate as EventListener);
      window.removeEventListener('rodada-iniciada', handleRodadaEvent);
      window.removeEventListener('rodada-updated', handleRodadaEvent);
      window.removeEventListener('sabor-automatico-alterado', handleRodadaEvent);
    };
  }, [refetch]);

  console.log('VisualizadorSaboresRodada - rodada:', rodada);
  console.log('VisualizadorSaboresRodada - historico:', historico);
  console.log('VisualizadorSaboresRodada - saborAtual:', saborAtual);

  if (!rodada) {
    return <Card className="shadow-lg border-2 border-gray-200">
        <CardContent className="p-6 text-center">
          <div className="text-4xl mb-4">🍕</div>
          <p className="text-gray-500">Aguardando rodada ativa...</p>
        </CardContent>
      </Card>;
  }

  if (loadingHistorico || loadingSabores) {
    return <Card className="shadow-lg border-2 border-gray-200">
        <CardContent className="p-6 text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-500">Carregando sequência de sabores...</p>
        </CardContent>
      </Card>;
  }

  if (historico.length === 0) {
    return <Card className="shadow-lg border-2 border-gray-200">
        <CardContent className="p-6 text-center">
          <div className="text-4xl mb-4">🍕</div>
          <p className="text-gray-500">Sequência de sabores não criada ainda...</p>
        </CardContent>
      </Card>;
  }

  // Helper: retorna a cor cadastrada no banco ou fallback cinza
  const getSaborCor = (item: any): string => {
    if (item?.sabor?.cor) return item.sabor.cor;
    const saborEncontrado = sabores.find(s => s.id === item?.sabor_id);
    return (saborEncontrado as any)?.cor || '#9CA3AF';
  };

  const getSaborNome = (item: any) => {
    if (item?.sabor?.nome) {
      return item.sabor.nome;
    }
    const saborEncontrado = sabores.find(s => s.id === item?.sabor_id);
    return saborEncontrado?.nome || 'Sabor não encontrado';
  };

  const getSaborDescricao = (item: any) => {
    if (item?.sabor?.descricao) {
      return item.sabor.descricao;
    }
    const saborEncontrado = sabores.find(s => s.id === item?.sabor_id);
    return saborEncontrado?.descricao;
  };

  const formatarTempo = (segundos: number) => {
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Se a rodada não está ativa, mostrar apenas o primeiro sabor
  if (rodada.status !== 'ativa') {
    const primeiroSabor = historico[0];
    const segundoSabor = historico[1];
    const terceiroSabor = historico[2];

    return <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Primeiro Sabor */}
        <div className="lg:col-span-2">
          <Card className="shadow-xl border-4 bg-white" style={{ borderColor: getSaborCor(primeiroSabor) }}>
            <CardContent className="p-8 text-center">
              <Badge className="text-white text-lg px-4 py-2 mb-4" style={{ backgroundColor: getSaborCor(primeiroSabor) }}>
                🍕 PRIMEIRO SABOR
              </Badge>
              <div className="text-6xl mb-4">🍕</div>
              <h2 className="text-4xl font-bold mb-2" style={{ color: getSaborCor(primeiroSabor) }}>
                {getSaborNome(primeiroSabor)}
              </h2>
              {getSaborDescricao(primeiroSabor) && <p className="text-lg mb-4" style={{ color: getSaborCor(primeiroSabor) }}>
                  {getSaborDescricao(primeiroSabor)}
                </p>}
              <div className="text-lg" style={{ color: getSaborCor(primeiroSabor) }}>
                Pizza #{primeiroSabor?.ordem || 1}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Próximos Sabores */}
        <div className="space-y-4">
          {segundoSabor && <Card className="shadow-lg border-2 bg-white" style={{ borderColor: getSaborCor(segundoSabor) }}>
              <CardContent className="p-4 text-center">
                <Badge className="text-white text-sm px-3 py-1 mb-2" style={{ backgroundColor: getSaborCor(segundoSabor) }}>
                  SEGUNDO
                </Badge>
                <div className="text-3xl mb-2">🍕</div>
                <h3 className="text-xl font-bold" style={{ color: getSaborCor(segundoSabor) }}>
                  {getSaborNome(segundoSabor)}
                </h3>
                <div className="text-sm" style={{ color: getSaborCor(segundoSabor) }}>
                  Pizza #{segundoSabor.ordem}
                </div>
              </CardContent>
            </Card>}

          {terceiroSabor && <Card className="shadow-lg border-2 bg-white" style={{ borderColor: getSaborCor(terceiroSabor) }}>
              <CardContent className="p-4 text-center">
                <Badge className="text-white text-sm px-3 py-1 mb-2" style={{ backgroundColor: getSaborCor(terceiroSabor) }}>
                  TERCEIRO
                </Badge>
                <div className="text-3xl mb-2">🍕</div>
                <h3 className="text-xl font-bold" style={{ color: getSaborCor(terceiroSabor) }}>
                  {getSaborNome(terceiroSabor)}
                </h3>
                <div className="text-sm" style={{ color: getSaborCor(terceiroSabor) }}>
                  Pizza #{terceiroSabor.ordem}
                </div>
              </CardContent>
            </Card>}
        </div>
      </div>;
  }

  // Para rodadas ativas, usar o sistema automático
  if (!saborAtual) {
    return <Card className="shadow-lg border-2 border-gray-200">
        <CardContent className="p-6 text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-500">Carregando sabor atual...</p>
        </CardContent>
      </Card>;
  }

  return <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sabor Atual - Automático */}
        <div className="lg:col-span-2">
          <Card className="shadow-xl border-4 bg-white" style={{ borderColor: getSaborCor(saborAtual) }}>
            <CardContent className="p-8 text-center">
              <Badge className="text-white text-lg px-4 py-2 mb-4" style={{ backgroundColor: getSaborCor(saborAtual) }}>
                🍕 SABOR ATUAL - AUTOMÁTICO
              </Badge>
              <div className="text-6xl mb-4">🍕</div>
              <h2 className="text-4xl font-bold mb-2" style={{ color: getSaborCor(saborAtual) }}>
                {getSaborNome(saborAtual)}
              </h2>
              {getSaborDescricao(saborAtual) && <p className="text-lg mb-4" style={{ color: getSaborCor(saborAtual) }}>
                  {getSaborDescricao(saborAtual)}
                </p>}
              <div className="text-lg mb-4" style={{ color: getSaborCor(saborAtual) }}>
                Pizza #{saborAtualIndex + 1} de {historico.length}
              </div>
              
              {/* Tempo para próxima troca */}
              <div className="p-3 rounded-lg" style={{ backgroundColor: getSaborCor(saborAtual) + '20' }}>
                <div className="text-sm font-medium" style={{ color: getSaborCor(saborAtual) }}>
                  Próxima troca em: {formatarTempo(tempoProximaTroca)}
                </div>
                <div className="text-xs" style={{ color: getSaborCor(saborAtual) }}>
                  (Intervalo: {formatarTempo(intervaloTroca)} por pizza)
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Próximos 2 Sabores e Estatísticas */}
        <div className="space-y-4">
          {proximoSabor ? <Card className="shadow-lg border-2 bg-white" style={{ borderColor: getSaborCor(proximoSabor) }}>
              <CardContent className="p-4 text-center">
                <Badge className="text-white text-sm px-3 py-1 mb-2" style={{ backgroundColor: getSaborCor(proximoSabor) }}>
                  PRÓXIMO
                </Badge>
                <div className="text-3xl mb-2">🍕</div>
                <h3 className="text-xl font-bold" style={{ color: getSaborCor(proximoSabor) }}>
                  {getSaborNome(proximoSabor)}
                </h3>
                <div className="text-sm" style={{ color: getSaborCor(proximoSabor) }}>
                  Pizza #{saborAtualIndex + 2}
                </div>
                <div className="text-xs mt-1" style={{ color: getSaborCor(proximoSabor) }}>
                  Em {formatarTempo(tempoProximaTroca)}
                </div>
              </CardContent>
            </Card> : <Card className="shadow-lg border-2 border-gray-200">
              <CardContent className="p-4 text-center">
                <div className="text-2xl mb-2">🏁</div>
                <p className="text-sm text-gray-500">
                  Último sabor da sequência
                </p>
              </CardContent>
            </Card>}

          {segundoProximoSabor && <Card className="shadow-lg border-2 bg-white" style={{ borderColor: getSaborCor(segundoProximoSabor) }}>
              <CardContent className="p-4 text-center">
                <Badge className="text-white text-sm px-3 py-1 mb-2" style={{ backgroundColor: getSaborCor(segundoProximoSabor) }}>
                  DEPOIS
                </Badge>
                <div className="text-3xl mb-2">🍕</div>
                <h3 className="text-lg font-bold" style={{ color: getSaborCor(segundoProximoSabor) }}>
                  {getSaborNome(segundoProximoSabor)}
                </h3>
                <div className="text-sm" style={{ color: getSaborCor(segundoProximoSabor) }}>
                  Pizza #{saborAtualIndex + 3}
                </div>
                <div className="text-xs mt-1" style={{ color: getSaborCor(segundoProximoSabor) }}>
                  Em {formatarTempo(tempoProximaTroca + intervaloTroca)}
                </div>
              </CardContent>
            </Card>}

          {/* Estatísticas */}
          <Card className="shadow-lg border-2 border-gray-200">
            <CardContent className="p-4 text-center">
              <div className="text-lg font-bold text-gray-700 mb-2">
                Progresso da Rodada
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-green-600 font-bold">{saboresPassados.length}</div>
                  <div className="text-gray-500">Finalizados</div>
                </div>
                <div>
                  <div className="text-blue-600 font-bold">{historico.length - saborAtualIndex - 1}</div>
                  <div className="text-gray-500">Restantes</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Histórico Visual da Rodada Atual */}
      {rodada && rodada.status === 'ativa' && historico.length > 0 && (
        <Card className="shadow-lg border-2 border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <h4 className="text-lg font-semibold text-yellow-800 mb-4 text-center">
              📊 Sequência de Sabores - Rodada Atual
            </h4>
            <div className="grid grid-cols-10 md:grid-cols-15 lg:grid-cols-20 gap-2">
              {historico.map((sabor, index) => {
                const saborNome = getSaborNome(sabor);
                const cor = getSaborCor(sabor);
                const isAtual = index === saborAtualIndex;
                const isPassado = index < saborAtualIndex;
                
                return (
                  <div
                    key={sabor.id}
                    className={`relative group cursor-pointer transition-all duration-200 ${
                      isAtual ? 'scale-125 z-10' : ''
                    }`}
                    title={`Pizza #${index + 1}: ${saborNome}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold text-white shadow-md ${
                        isAtual 
                          ? 'animate-pulse' 
                          : isPassado 
                            ? 'opacity-60' 
                            : ''
                      }`}
                      style={{ 
                        backgroundColor: isPassado ? cor + 'aa' : cor,
                        borderColor: isAtual ? '#ffffff' : cor
                      }}
                    >
                      {index + 1}
                    </div>
                    
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-20">
                      Pizza #{index + 1}: {saborNome}
                    </div>
                    
                    {/* Indicador de status */}
                    {isAtual && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full border border-white animate-pulse" style={{ backgroundColor: cor }}></div>
                    )}
                    {isPassado && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-gray-400 rounded-full border border-white">
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-1 h-1 bg-white rounded-full"></div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Legenda dinâmica - sabores únicos presentes na sequência */}
            <div className="mt-4 flex flex-wrap justify-center gap-3 text-xs">
              {Array.from(
                new Map(
                  historico.map(item => [item.sabor_id, { nome: getSaborNome(item), cor: getSaborCor(item) }])
                ).values()
              ).map(({ nome, cor }) => (
                <div key={nome} className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cor }}></div>
                  <span className="text-gray-600">{nome}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>;
};

export default VisualizadorSaboresRodada;
