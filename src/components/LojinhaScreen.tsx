import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOptimizedRodadas } from '@/hooks/useOptimizedRodadas';
import { usePizzas } from '@/hooks/usePizzas';
import { useEquipes } from '@/hooks/useEquipes';
import { useCompras } from '@/hooks/useCompras';
import { useSabores } from '@/hooks/useSabores';
import { usePersistedState } from '@/hooks/usePersistedState';
import GerenciadorItens from './GerenciadorItens';
import VendasLoja from './VendasLoja';
import HistoricoLoja from './HistoricoLoja';
import { toast } from 'sonner';

const LojinhaScreen = () => {
  const {
    rodadaAtual
  } = useOptimizedRodadas();
  const {
    equipes
  } = useEquipes();
  const {
    pizzas
  } = usePizzas();
  const {
    compras
  } = useCompras();
  const {
    sabores
  } = useSabores();

  // Persistir estado da tela ativa - alterado para itens como padrão
  const [activeTab, setActiveTab] = usePersistedState('lojinha-active-tab', 'itens');

  // Estados para estatísticas
  const [estatisticasGerais, setEstatisticasGerais] = useState({
    totalPizzas: 0,
    pizzasAprovadas: 0,
    pizzasReprovadas: 0,
    pizzasPendentes: 0,
    totalGastos: 0,
    totalGanhos: 0,
    equipesAtivas: 0
  });

  // Calcular estatísticas em tempo real
  useEffect(() => {
    const totalPizzas = pizzas.length;
    const pizzasAprovadas = pizzas.filter(p => p.resultado === 'aprovada').length;
    const pizzasReprovadas = pizzas.filter(p => p.resultado === 'reprovada').length;
    const pizzasPendentes = pizzas.filter(p => p.status === 'pronta').length;
    const totalGastos = compras.reduce((sum, c) => sum + c.valor_total, 0);
    const totalGanhos = equipes.reduce((sum, e) => sum + (e.ganho_total || 0), 0);
    const equipesAtivas = equipes.length;
    setEstatisticasGerais({
      totalPizzas,
      pizzasAprovadas,
      pizzasReprovadas,
      pizzasPendentes,
      totalGastos,
      totalGanhos,
      equipesAtivas
    });
  }, [pizzas, compras, equipes]);

  // Escutar eventos globais para feedback em tempo real
  useEffect(() => {
    const handlePizzaEnviada = (event: CustomEvent) => {
      const {
        pizza
      } = event.detail;
      toast.success(`🍕 Nova pizza ${pizza.sabor?.nome || 'sem sabor'} enviada para avaliação!`, {
        duration: 3000
      });
    };
    const handlePizzaAvaliada = (event: CustomEvent) => {
      const {
        resultado
      } = event.detail;
      const emoji = resultado === 'aprovada' ? '✅' : '❌';
      toast.info(`${emoji} Pizza ${resultado}!`, {
        duration: 3000
      });
    };
    const handleCompraRealizada = (event: CustomEvent) => {
      const {
        valor
      } = event.detail;
      toast.info(`💰 Nova compra: $ ${valor.toFixed(2)}`, {
        duration: 2000
      });
    };
    window.addEventListener('pizza-enviada-com-sabor', handlePizzaEnviada as EventListener);
    window.addEventListener('pizza-avaliada', handlePizzaAvaliada as EventListener);
    window.addEventListener('compra-realizada', handleCompraRealizada as EventListener);
    return () => {
      window.removeEventListener('pizza-enviada-com-sabor', handlePizzaEnviada as EventListener);
      window.removeEventListener('pizza-avaliada', handlePizzaAvaliada as EventListener);
      window.removeEventListener('compra-realizada', handleCompraRealizada as EventListener);
    };
  }, []);
  const getSaborNome = (saborId: string) => {
    const sabor = sabores.find(s => s.id === saborId);
    return sabor?.nome || 'Sabor não informado';
  };
  return <div className="min-h-screen bg-gradient-to-br from-blue-100 to-purple-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-blue-600 mb-2">🛒 Loja</h1>
          <p className="text-gray-600">Gerencie compras, vendas e monitore o progresso das equipes</p>
          
          {/* Status da Rodada */}
          <Card className="mt-4 shadow-lg border-2 border-blue-200">
            <CardContent className="p-4">
              {rodadaAtual ? <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                  <div>
                    <div className="text-xl font-bold text-blue-600">Rodada {rodadaAtual.numero}</div>
                    <div className="text-sm text-gray-600 capitalize">{rodadaAtual.status}</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-green-600">{estatisticasGerais.pizzasAprovadas}</div>
                    <div className="text-sm text-gray-600">Aprovadas</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-orange-600">{estatisticasGerais.pizzasPendentes}</div>
                    <div className="text-sm text-gray-600">Pendentes</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-purple-600">$ {estatisticasGerais.totalGastos.toFixed(2)}</div>
                    <div className="text-sm text-gray-600">Total Gastos</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-emerald-600">$ {estatisticasGerais.totalGanhos.toFixed(2)}</div>
                    <div className="text-sm text-gray-600">Total Ganhos</div>
                  </div>
                </div> : <div className="text-lg text-gray-600">Nenhuma rodada ativa</div>}
            </CardContent>
          </Card>
        </div>

        {/* Conteúdo Principal com 2 Abas */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="itens">📦 Gerenciar Itens</TabsTrigger>
            <TabsTrigger value="vendas">💰 Vendas</TabsTrigger>
          </TabsList>
          
          <TabsContent value="itens" className="mt-6">
            <GerenciadorItens />
          </TabsContent>
          
          <TabsContent value="vendas" className="mt-6">
            <VendasLoja />
          </TabsContent>
        </Tabs>

        {/* Estatísticas Rápidas */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="text-center p-4 bg-white shadow-lg">
            <div className="text-2xl font-bold text-blue-600">{estatisticasGerais.totalPizzas}</div>
            <div className="text-sm text-gray-600">Total de Pizzas</div>
          </Card>
          <Card className="text-center p-4 bg-white shadow-lg">
            <div className="text-2xl font-bold text-green-600">{estatisticasGerais.pizzasAprovadas}</div>
            <div className="text-sm text-gray-600">Aprovadas</div>
          </Card>
          <Card className="text-center p-4 bg-white shadow-lg">
            <div className="text-2xl font-bold text-red-600">{estatisticasGerais.pizzasReprovadas}</div>
            <div className="text-sm text-gray-600">Reprovadas</div>
          </Card>
          <Card className="text-center p-4 bg-white shadow-lg">
            <div className="text-2xl font-bold text-purple-600">{estatisticasGerais.equipesAtivas}</div>
            <div className="text-sm text-gray-600">Equipes Ativas</div>
          </Card>
          <Card className="text-center p-4 bg-white shadow-lg">
            <div className="text-2xl font-bold text-emerald-600">$ {estatisticasGerais.totalGanhos.toFixed(2)}</div>
            <div className="text-sm text-gray-600">Total Ganhos</div>
          </Card>
        </div>
      </div>
    </div>;
};

export default LojinhaScreen;
