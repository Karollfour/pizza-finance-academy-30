import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useProdutos } from '@/hooks/useProdutos';
import { useCompras } from '@/hooks/useCompras';
import { useRodadas } from '@/hooks/useRodadas';
import { usePizzas } from '@/hooks/usePizzas';
import { useSabores } from '@/hooks/useSabores';
import { toast } from 'sonner';

interface MontadorPizzaProps {
  equipeId: string;
  equipeNome: string;
  saldoDisponivel: number;
  onPizzaMontada: () => void;
}

const MontadorPizza = ({ equipeId, equipeNome, saldoDisponivel, onPizzaMontada }: MontadorPizzaProps) => {
  const { produtos } = useProdutos();
  const { registrarCompra } = useCompras();
  const { rodadaAtual, loading: rodadaLoading } = useRodadas();
  const { marcarPizzaPronta } = usePizzas();
  const { sabores } = useSabores();
  const [ingredientesSelecionados, setIngredientesSelecionados] = useState<string[]>([]);
  const [montandoPizza, setMontandoPizza] = useState(false);
  const [saborSelecionado, setSaborSelecionado] = useState<string>('');

  // Ingredientes base necessários (por nome - podem ser configurados no banco)
  const ingredientesBaseNomes = ['massa de pizza', 'molho', 'caneta do molho'];
  
  // Filtrar produtos disponíveis
  const produtosDisponiveis = produtos.filter(produto => produto.disponivel);
  
  // Identificar ingredientes base
  const ingredientesBase = produtosDisponiveis.filter(produto => 
    ingredientesBaseNomes.some(nomeBase => 
      produto.nome.toLowerCase().includes(nomeBase.toLowerCase())
    )
  );
  
  // Identificar toppings (todos os outros produtos)
  const toppings = produtosDisponiveis.filter(produto => 
    !ingredientesBaseNomes.some(nomeBase => 
      produto.nome.toLowerCase().includes(nomeBase.toLowerCase())
    )
  );

  const toggleIngrediente = (produtoId: string) => {
    setIngredientesSelecionados(prev => {
      if (prev.includes(produtoId)) {
        return prev.filter(id => id !== produtoId);
      } else {
        return [...prev, produtoId];
      }
    });
  };

  const calcularPrecoTotal = () => {
    const custoViagem = 5; // Cobrança fixa por viagem à loja
    const custoIngredientes = ingredientesSelecionados.reduce((total, produtoId) => {
      const produto = produtosDisponiveis.find(p => p.id === produtoId);
      return total + (produto?.valor_unitario || 0);
    }, 0);
    return custoViagem + custoIngredientes;
  };

  const verificarIngredientesValidos = () => {
    // Verificar se pelo menos um ingrediente base está selecionado
    return ingredientesBase.some(base => ingredientesSelecionados.includes(base.id));
  };

  const confirmarPizza = async () => {
    if (!verificarIngredientesValidos()) {
      toast.error('Pizza deve ter pelo menos um ingrediente base (massa ou molho)!');
      return;
    }

    if (!saborSelecionado) {
      toast.error('Selecione o sabor da pizza!');
      return;
    }

    const precoTotal = calcularPrecoTotal();
    if (precoTotal > saldoDisponivel) {
      toast.error('Saldo insuficiente para esta pizza!');
      return;
    }

    try {
      setMontandoPizza(true);

      // Registrar a viagem (custo fixo de $5)
      await registrarCompra(
        equipeId,
        null, // produto_id null para viagem
        rodadaAtual?.id || null,
        1,
        5,
        'viagem',
        'Viagem para comprar ingredientes'
      );

      // Registrar cada ingrediente comprado
      for (const produtoId of ingredientesSelecionados) {
        const produto = produtosDisponiveis.find(p => p.id === produtoId);
        if (produto) {
          await registrarCompra(
            equipeId,
            produto.id,
            rodadaAtual?.id || null,
            1,
            produto.valor_unitario,
            'material',
            `Ingrediente: ${produto.nome}`
          );
        }
      }

      // Criar a pizza no banco de dados com o sabor selecionado
      await marcarPizzaPronta(equipeId, rodadaAtual?.id || '', saborSelecionado);

      toast.success('🍕 Pizza montada e enviada para avaliação com sucesso!');
      setIngredientesSelecionados([]);
      setSaborSelecionado('');
      onPizzaMontada();
    } catch (error) {
      toast.error('Erro ao montar pizza');
    } finally {
      setMontandoPizza(false);
    }
  };

  const renderProdutoCard = (produto: any, tipo: 'base' | 'topping') => {
    const isSelected = ingredientesSelecionados.includes(produto.id);
    const corBase = tipo === 'base' ? 'orange' : 'green';
    
    return (
      <Button
        key={produto.id}
        variant={isSelected ? "default" : "outline"}
        className={`h-24 flex flex-col items-center justify-center space-y-1 p-2 ${
          isSelected 
            ? `bg-${corBase}-500 hover:bg-${corBase}-600` 
            : `hover:bg-${corBase}-50`
        }`}
        onClick={() => toggleIngrediente(produto.id)}
      >
        {produto.imagem ? (
          <img 
            src={produto.imagem} 
            alt={produto.nome}
            className="w-8 h-8 object-cover rounded"
          />
        ) : (
          <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center">
            <span className="text-xs">📦</span>
          </div>
        )}
        <span className="text-xs font-medium text-center">{produto.nome}</span>
        <span className="text-xs">$ {produto.valor_unitario.toFixed(2)}</span>
      </Button>
    );
  };

  const saboresDisponiveis = sabores.filter(sabor => sabor.disponivel);

  return (
    <Card className="shadow-lg border-2 border-orange-200">
      <CardHeader className="bg-orange-50">
        <CardTitle className="text-orange-600">🍕 Montador de Pizza - {equipeNome}</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Saldo Disponível */}
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              $ {saldoDisponivel.toFixed(2)}
            </div>
            <div className="text-sm text-blue-700">Saldo Disponível</div>
          </div>

          {/* Seleção de Sabor */}
          <div className="space-y-3">
            <h3 className="font-semibold text-purple-600">Sabor da Pizza (Obrigatório)</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {saboresDisponiveis.map((sabor) => (
                <Button
                  key={sabor.id}
                  variant={saborSelecionado === sabor.id ? "default" : "outline"}
                  className={`h-20 flex flex-col items-center justify-center space-y-1 p-2 ${
                    saborSelecionado === sabor.id 
                      ? 'bg-purple-500 hover:bg-purple-600' 
                      : 'hover:bg-purple-50'
                  }`}
                  onClick={() => setSaborSelecionado(sabor.id)}
                >
                  {sabor.imagem ? (
                    <img 
                      src={sabor.imagem} 
                      alt={sabor.nome}
                      className="w-8 h-8 object-cover rounded"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-purple-200 rounded flex items-center justify-center">
                      <span className="text-xs">🍕</span>
                    </div>
                  )}
                  <span className="text-xs font-medium text-center">{sabor.nome}</span>
                </Button>
              ))}
            </div>
            {saboresDisponiveis.length === 0 && (
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <p className="text-yellow-700">
                  Nenhum sabor disponível. Entre em contato com o professor.
                </p>
              </div>
            )}
          </div>

          {/* Ingredientes Base (Obrigatórios) */}
          {ingredientesBase.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-orange-600">Ingredientes Base (Obrigatórios)</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {ingredientesBase.map((produto) => renderProdutoCard(produto, 'base'))}
              </div>
            </div>
          )}

          {/* Toppings Opcionais */}
          {toppings.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-green-600">Toppings (Opcionais)</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {toppings.map((produto) => renderProdutoCard(produto, 'topping'))}
              </div>
            </div>
          )}

          {/* Mensagem se não há produtos */}
          {produtosDisponiveis.length === 0 && (
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <p className="text-yellow-700">
                Nenhum produto disponível na loja. Aguarde o professor adicionar ingredientes.
              </p>
            </div>
          )}

          {/* Resumo da Pizza */}
          {(ingredientesSelecionados.length > 0 || saborSelecionado) && (
            <div className="p-4 bg-yellow-50 rounded-lg">
              <h4 className="font-medium text-yellow-700 mb-2">Resumo da Pizza:</h4>
              <div className="space-y-1">
                {saborSelecionado && (
                  <div className="flex justify-between text-sm items-center">
                    <div className="flex items-center gap-2">
                      <span>🍕</span>
                      <span>Sabor: {saboresDisponiveis.find(s => s.id === saborSelecionado)?.nome}</span>
                    </div>
                    <span className="text-purple-600 font-medium">Incluído</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span>Viagem à loja:</span>
                  <span>$ 5,00</span>
                </div>
                {ingredientesSelecionados.map(produtoId => {
                  const produto = produtosDisponiveis.find(p => p.id === produtoId);
                  return produto ? (
                    <div key={produtoId} className="flex justify-between text-sm items-center">
                      <div className="flex items-center gap-2">
                        {produto.imagem ? (
                          <img 
                            src={produto.imagem} 
                            alt={produto.nome}
                            className="w-4 h-4 object-cover rounded"
                          />
                        ) : (
                          <span>📦</span>
                        )}
                        <span>{produto.nome}</span>
                      </div>
                      <span>$ {produto.valor_unitario.toFixed(2)}</span>
                    </div>
                  ) : null;
                })}
                <hr className="my-2" />
                <div className="flex justify-between font-bold">
                  <span>Total:</span>
                  <span className="text-green-600">$ {calcularPrecoTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Validações */}
          {!saborSelecionado && (
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="text-red-600 text-sm">
                ⚠️ Selecione o sabor da pizza!
              </p>
            </div>
          )}

          {!verificarIngredientesValidos() && ingredientesSelecionados.length > 0 && (
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="text-red-600 text-sm">
                ⚠️ Adicione pelo menos um ingrediente base para fazer uma pizza válida!
              </p>
            </div>
          )}

          {calcularPrecoTotal() > saldoDisponivel && (
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="text-red-600 text-sm">
                ⚠️ Saldo insuficiente! Remova alguns ingredientes.
              </p>
            </div>
          )}

          {rodadaAtual?.status === 'pausada' && (
            <div className="p-3 bg-orange-50 rounded-lg">
              <p className="text-orange-700 text-sm text-center font-medium">
                ⏸️ Rodada pausada pelo professor. Aguarde para confirmar pizzas.
              </p>
            </div>
          )}

          {/* Botão Confirmar */}
          <Button
            onClick={confirmarPizza}
            disabled={
              !verificarIngredientesValidos() || 
              !saborSelecionado ||
              calcularPrecoTotal() > saldoDisponivel || 
              montandoPizza || 
              produtosDisponiveis.length === 0 ||
              saboresDisponiveis.length === 0 ||
              rodadaAtual?.status !== 'ativa' ||
              rodadaLoading
            }
            className="w-full h-14 text-lg bg-green-500 hover:bg-green-600"
          >
            {rodadaLoading ? '⏳ Sincronizando...' : montandoPizza ? '🔄 Montando Pizza...' : rodadaAtual?.status === 'pausada' ? '⏸️ Rodada Pausada' : '🍕 Confirmar Pizza'}
          </Button>

        </div>
      </CardContent>
    </Card>
  );
};

export default MontadorPizza;
