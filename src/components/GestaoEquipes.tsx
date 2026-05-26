
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useEquipes } from '@/hooks/useEquipes';
import { useCompras } from '@/hooks/useCompras';
import { toast } from 'sonner';

const GestaoEquipes = () => {
  const { equipes, criarEquipe, atualizarEquipe, removerEquipe } = useEquipes();
  const { compras, loading: loadingCompras } = useCompras();
  const [novaEquipe, setNovaEquipe] = useState({
    nome: '',
    saldoInicial: 100,
    professorResponsavel: '',
    quantidadePessoas: 1
  });
  const [editandoEquipe, setEditandoEquipe] = useState<string | null>(null);

  // Debug: verificar se as compras estão sendo carregadas
  useEffect(() => {
    console.log('Compras carregadas:', compras.length, compras);
    console.log('Loading compras:', loadingCompras);
  }, [compras, loadingCompras]);

  // Função para calcular o gasto total de uma equipe baseado nas compras do banco
  const calcularGastoTotalEquipe = (equipeId: string) => {
    const comprasEquipe = compras.filter(compra => compra.equipe_id === equipeId);
    const total = comprasEquipe.reduce((total, compra) => total + compra.valor_total, 0);
    
    console.log(`Calculando gasto para equipe ${equipeId}:`, {
      comprasEquipe,
      totalCalculado: total
    });
    
    return total;
  };

  const handleCriarEquipe = async () => {
    if (!novaEquipe.nome || !novaEquipe.professorResponsavel) {
      toast.error('Nome e professor responsável são obrigatórios!');
      return;
    }

    try {
      const cores = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
      const emblemas = ['⚡', '🔥', '🌟', '🚀', '💎', '🎯'];
      
      const corTema = cores[Math.floor(Math.random() * cores.length)];
      const emblema = emblemas[Math.floor(Math.random() * emblemas.length)];

      await criarEquipe(
        novaEquipe.nome,
        novaEquipe.saldoInicial,
        novaEquipe.professorResponsavel,
        corTema,
        emblema,
        novaEquipe.quantidadePessoas
      );
      
      setNovaEquipe({
        nome: '',
        saldoInicial: 100,
        professorResponsavel: '',
        quantidadePessoas: 1
      });
      
      toast.success('Equipe criada com sucesso!');
    } catch (error) {
      toast.error('Erro ao criar equipe');
    }
  };

  const handleAtualizarSaldo = async (equipeId: string, novoSaldo: number) => {
    try {
      await atualizarEquipe(equipeId, { saldo_inicial: novoSaldo });
      toast.success('Saldo atualizado com sucesso!');
      setEditandoEquipe(null);
    } catch (error) {
      toast.error('Erro ao atualizar saldo');
    }
  };

  const handleAtualizarQuantidadePessoas = async (equipeId: string, novaQuantidade: number) => {
    try {
      await atualizarEquipe(equipeId, { quantidade_pessoas: novaQuantidade });
      toast.success('Quantidade de pessoas atualizada com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar quantidade de pessoas');
    }
  };

  const handleRemoverEquipe = async (equipeId: string, nomeEquipe: string) => {
    if (confirm(`Tem certeza que deseja remover a equipe "${nomeEquipe}"?`)) {
      try {
        await removerEquipe(equipeId);
        toast.success('Equipe removida com sucesso!');
      } catch (error) {
        toast.error('Erro ao remover equipe');
      }
    }
  };

  // Mostrar loading se as compras ainda estão carregando
  if (loadingCompras) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">Carregando dados das equipes...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Criar Nova Equipe */}
      <Card>
        <CardHeader>
          <CardTitle className="text-blue-600">➕ Criar Nova Equipe</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Nome da equipe"
              value={novaEquipe.nome}
              onChange={(e) => setNovaEquipe(prev => ({ ...prev, nome: e.target.value }))}
            />
            <Input
              placeholder="Professor responsável"
              value={novaEquipe.professorResponsavel}
              onChange={(e) => setNovaEquipe(prev => ({ ...prev, professorResponsavel: e.target.value }))}
            />
            <Input
              type="number"
              placeholder="Saldo inicial"
              value={novaEquipe.saldoInicial}
              onChange={(e) => setNovaEquipe(prev => ({ ...prev, saldoInicial: Number(e.target.value) }))}
            />
            <Input
              type="number"
              placeholder="Quantidade de pessoas"
              value={novaEquipe.quantidadePessoas}
              min="1"
              max="10"
              onChange={(e) => setNovaEquipe(prev => ({ ...prev, quantidadePessoas: Number(e.target.value) }))}
            />
          </div>
          <Button onClick={handleCriarEquipe} className="w-full">
            Criar Equipe
          </Button>
        </CardContent>
      </Card>

      {/* Lista de Equipes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-blue-600">👥 Equipes Cadastradas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {equipes.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <div className="text-4xl mb-2">👥</div>
                <p>Nenhuma equipe cadastrada</p>
              </div>
            ) : (
              equipes.map((equipe) => {
                const gastoTotalCalculado = calcularGastoTotalEquipe(equipe.id);
                const saldoDisponivel = equipe.saldo_inicial - gastoTotalCalculado;
                
                console.log(`Equipe ${equipe.nome} - ID: ${equipe.id}:`, {
                  saldoInicial: equipe.saldo_inicial,
                  gastoTotalBanco: equipe.gasto_total,
                  gastoTotalCalculado,
                  saldoDisponivel,
                  comprasEquipe: compras.filter(c => c.equipe_id === equipe.id)
                });
                
                return (
                  <div key={equipe.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-lg font-semibold">{equipe.nome}</h3>
                          <Badge style={{ backgroundColor: equipe.cor_tema }}>
                            {equipe.emblema}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">
                          <strong>Professor:</strong> {equipe.professor_responsavel}
                        </p>
                        <p className="text-sm text-gray-600 mb-1">
                          <strong>Pessoas na equipe:</strong> {equipe.quantidade_pessoas || 1}
                        </p>
                        <div className="flex items-center space-x-4 text-sm">
                          <span className="text-green-600">
                            <strong>Saldo Inicial:</strong> $ {equipe.saldo_inicial.toFixed(2)}
                          </span>
                          <span className="text-red-600">
                            <strong>Gasto Total:</strong> $ {gastoTotalCalculado.toFixed(2)}
                          </span>
                          <span className={`font-bold ${saldoDisponivel >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                            <strong>Disponível:</strong> $ {saldoDisponivel.toFixed(2)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          ID da Equipe: {equipe.id} | Compras encontradas: {compras.filter(c => c.equipe_id === equipe.id).length}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditandoEquipe(editandoEquipe === equipe.id ? null : equipe.id)}
                        >
                          {editandoEquipe === equipe.id ? 'Cancelar' : 'Editar'}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoverEquipe(equipe.id, equipe.nome)}
                        >
                          Remover
                        </Button>
                      </div>
                    </div>
                    
                    {editandoEquipe === equipe.id && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex items-center space-x-2">
                            <Input
                              type="number"
                              placeholder="Novo saldo inicial"
                              defaultValue={equipe.saldo_inicial}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  const input = e.target as HTMLInputElement;
                                  handleAtualizarSaldo(equipe.id, Number(input.value));
                                }
                              }}
                            />
                            <Button
                              size="sm"
                              onClick={(e) => {
                                const input = e.currentTarget.parentElement?.querySelector('input') as HTMLInputElement;
                                handleAtualizarSaldo(equipe.id, Number(input.value));
                              }}
                            >
                              Atualizar Saldo
                            </Button>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Input
                              type="number"
                              placeholder="Quantidade de pessoas"
                              defaultValue={equipe.quantidade_pessoas || 1}
                              min="1"
                              max="10"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  const input = e.target as HTMLInputElement;
                                  handleAtualizarQuantidadePessoas(equipe.id, Number(input.value));
                                }
                              }}
                            />
                            <Button
                              size="sm"
                              onClick={(e) => {
                                const input = e.currentTarget.parentElement?.querySelector('input') as HTMLInputElement;
                                handleAtualizarQuantidadePessoas(equipe.id, Number(input.value));
                              }}
                            >
                              Atualizar Pessoas
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GestaoEquipes;
