import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useCompras } from '@/hooks/useCompras';
import { useEquipes } from '@/hooks/useEquipes';
import { useProdutos } from '@/hooks/useProdutos';
import { useRodadas } from '@/hooks/useRodadas';
import { usePizzas } from '@/hooks/usePizzas';
import { useTodasRodadas } from '@/hooks/useTodasRodadas';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ChevronsUpDown, X } from 'lucide-react';
import TaktTimeChart from './TaktTimeChart';

// Cores das categorias de gastos
const COR_MP = '#ef4444';   // vermelho
const COR_EQ = '#f59e0b';   // amarelo/laranja
const COR_V  = '#3B82F6';   // azul (Viagem)
const COR_MO = '#10b981';   // verde (Mão de Obra)

// Custo de mão de obra por pessoa por rodada (valor padrão)
const MAO_DE_OBRA_POR_PESSOA_RODADA = 10;

const DashboardLojinha = () => {
  const { compras } = useCompras();
  const { equipes } = useEquipes();
  const { produtos } = useProdutos();
  const { rodadaAtual } = useRodadas();
  const { rodadas } = useTodasRodadas();
  const { pizzas } = usePizzas();
  const [rodadasSelecionadas, setRodadasSelecionadas] = useState<number[]>([]);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const rodadasDisponiveis = useMemo(() => {
    return rodadas
      .filter(r => pizzas.some(p => p.rodada_id === r.id) || compras.some(c => c.rodada_id === r.id))
      .map(r => r.numero)
      .sort((a, b) => a - b);
  }, [rodadas, pizzas, compras]);

  const rodadasAlvo = useMemo(() => {
    if (rodadasSelecionadas.length === 0) return rodadas;
    return rodadas.filter(r => rodadasSelecionadas.includes(r.numero));
  }, [rodadas, rodadasSelecionadas]);
  const rodadaIds = useMemo(() => new Set(rodadasAlvo.map(r => r.id)), [rodadasAlvo]);

  const toggleRodada = (n: number) => {
    setRodadasSelecionadas(prev =>
      prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n].sort((a, b) => a - b)
    );
  };

  const labelFiltro = rodadasSelecionadas.length === 0
    ? 'Todas as rodadas'
    : `Rodadas selecionadas: ${rodadasSelecionadas.join(', ')}`;

  // helpers de tipo (usa coluna tipo de produtos_loja)
  const isMP = (produtoId: string | null) => {
    if (!produtoId) return false;
    const p = produtos.find(pr => pr.id === produtoId);
    return ((p as any)?.tipo || 'MP') === 'MP';
  };
  const isEQ = (produtoId: string | null) => {
    if (!produtoId) return false;
    const p = produtos.find(pr => pr.id === produtoId);
    return (p as any)?.tipo === 'EQ';
  };
  const isViagem = (compra: any) => compra.tipo === 'taxa_entrega' || compra.tipo === 'viagem';

  // Pizzas por equipe nas rodadas-alvo (empilhado)
  const dadosPizzasFiltradas = equipes.map(equipe => {
    const pizzasEquipe = pizzas.filter(p => p.equipe_id === equipe.id && rodadaIds.has(p.rodada_id) && p.status === 'avaliada');
    const aprovadas = pizzasEquipe.filter(p => p.resultado === 'aprovada').length;
    const reprovadas = pizzasEquipe.filter(p => p.resultado === 'reprovada').length;
    return {
      equipe: equipe.nome,
      aprovadas,
      reprovadas,
      total: aprovadas + reprovadas,
    };
  }).filter(d => d.total > 0);

  // Produtividade: pizzas APROVADAS / quantidade_pessoas (guard /0)
  const dadosProdutividade = equipes.map(equipe => {
    const aprovadasEquipe = pizzas.filter(
      p => p.equipe_id === equipe.id && rodadaIds.has(p.rodada_id) && p.resultado === 'aprovada'
    ).length;
    const qtd = Number(equipe.quantidade_pessoas) || 0;
    const pizzasPorPessoa = qtd > 0 ? Number((aprovadasEquipe / qtd).toFixed(2)) : 0;
    return {
      equipe: equipe.nome,
      pizzasPorPessoa,
      pizzasAprovadas: aprovadasEquipe,
      quantidadePessoas: qtd,
    };
  });

  // Análise de Lucro por Pizza (empilhado por equipe: MP + EQ + V + MO)
  const dadosAnaliseLucro = equipes.map(equipe => {
    const comprasEquipe = compras.filter(c => c.equipe_id === equipe.id && c.rodada_id && rodadaIds.has(c.rodada_id));
    const mp = comprasEquipe.filter(c => !isViagem(c) && isMP(c.produto_id)).reduce((s, c) => s + c.valor_total, 0);
    const eq = comprasEquipe.filter(c => !isViagem(c) && isEQ(c.produto_id)).reduce((s, c) => s + c.valor_total, 0);
    const v  = comprasEquipe.filter(c => isViagem(c)).reduce((s, c) => s + c.valor_total, 0);
    const mo = (Number(equipe.quantidade_pessoas) || 0) * MAO_DE_OBRA_POR_PESSOA_RODADA * Math.max(rodadasAlvo.length, 1);
    const pizzasAprovadas = pizzas.filter(p => p.equipe_id === equipe.id && rodadaIds.has(p.rodada_id) && p.resultado === 'aprovada').length;
    const custoTotal = mp + eq + v + mo;
    const lucro = pizzasAprovadas > 0 ? custoTotal / pizzasAprovadas : 0;
    return {
      equipe: equipe.nome,
      mp, eq, v, mo, custoTotal, pizzasAprovadas,
      lucro: Number(lucro.toFixed(2)),
      corEquipe: equipe.cor_tema || '#3b82f6',
    };
  }).filter(d => d.pizzasAprovadas > 0);

  // Gastos por equipe — TODAS as equipes (left join), mesmo $0
  const dadosGastos = equipes.map(equipe => {
    const comprasEquipe = compras.filter(c => c.equipe_id === equipe.id && c.rodada_id && rodadaIds.has(c.rodada_id));
    return {
      nome: equipe.nome,
      gasto: comprasEquipe.reduce((s, c) => s + c.valor_total, 0),
    };
  });

  const dadosGanhos = equipes.map(equipe => {
    const aprovadas = pizzas.filter(p => p.equipe_id === equipe.id && rodadaIds.has(p.rodada_id) && p.resultado === 'aprovada');
    return {
      nome: equipe.nome,
      ganho: aprovadas.length * 10,
    };
  });

  const produtosMaisComprados = produtos.map(produto => {
    const comprasProd = compras.filter(c => c.produto_id === produto.id && c.rodada_id && rodadaIds.has(c.rodada_id));
    return {
      nome: produto.nome,
      quantidade: comprasProd.reduce((s, c) => s + (c.quantidade || 0), 0),
    };
  }).filter(p => p.quantidade > 0).sort((a, b) => b.quantidade - a.quantidade);

  // Distribuição de Gastos — empilhado por equipe em % (MP + EQ + V + Mão de Obra)
  const dadosDistribuicaoGastos = equipes.map(equipe => {
    const comprasEquipe = compras.filter(c => c.equipe_id === equipe.id && c.rodada_id && rodadaIds.has(c.rodada_id));
    const mpAbs = comprasEquipe.filter(c => !isViagem(c) && isMP(c.produto_id)).reduce((s, c) => s + c.valor_total, 0);
    const eqAbs = comprasEquipe.filter(c => !isViagem(c) && isEQ(c.produto_id)).reduce((s, c) => s + c.valor_total, 0);
    const vAbs  = comprasEquipe.filter(c => isViagem(c)).reduce((s, c) => s + c.valor_total, 0);
    const moAbs = (Number(equipe.quantidade_pessoas) || 0) * MAO_DE_OBRA_POR_PESSOA_RODADA * Math.max(rodadasAlvo.length, 1);
    const total = mpAbs + eqAbs + vAbs + moAbs;
    const pct = (n: number) => total > 0 ? Number(((n / total) * 100).toFixed(2)) : 0;
    return {
      equipe: equipe.nome,
      mp: pct(mpAbs), eq: pct(eqAbs), v: pct(vAbs), mo: pct(moAbs),
      mpAbs, eqAbs, vAbs, moAbs, total,
    };
  });

  const comprasFiltradas = compras.filter(c => c.rodada_id && rodadaIds.has(c.rodada_id));

  return (
    <div className="space-y-6">
      {/* Filtro Global */}
      <Card className="shadow-lg border-2 border-blue-200">
        <CardHeader>
          <CardTitle className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <span>🎯 Filtro Global de Análise</span>
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full md:w-72 justify-between bg-white">
                  <span className="truncate text-sm">{labelFiltro}</span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 bg-white z-50 p-2" align="end">
                <div className="flex items-center justify-between p-2">
                  <span className="text-sm font-medium">Selecione rodadas</span>
                  {rodadasSelecionadas.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => setRodadasSelecionadas([])}>
                      Limpar
                    </Button>
                  )}
                </div>
                <div className="max-h-72 overflow-auto space-y-1">
                  {rodadasDisponiveis.length === 0 ? (
                    <div className="p-3 text-sm text-gray-500">Nenhuma rodada disponível</div>
                  ) : rodadasDisponiveis.map(n => (
                    <label key={n} className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 cursor-pointer">
                      <Checkbox
                        checked={rodadasSelecionadas.includes(n)}
                        onCheckedChange={() => toggleRodada(n)}
                      />
                      <span className="text-sm">Rodada {n}</span>
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 items-center">
            {rodadasSelecionadas.length === 0 ? (
              <span className="text-gray-600 text-sm">📈 Analisando dados de todas as rodadas</span>
            ) : rodadasSelecionadas.map(n => (
              <Badge key={n} variant="outline" className="gap-1">
                Rodada {n}
                <button onClick={() => toggleRodada(n)} className="ml-1 hover:text-red-600">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 1. Análise de Lucro por Pizza (MP + EQ + V + MO) */}
      <Card className="shadow-lg border-2 border-green-200">
        <CardHeader>
          <CardTitle>💰 Análise de Lucro por Pizza — {labelFiltro}</CardTitle>
        </CardHeader>
        <CardContent>
          {dadosAnaliseLucro.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={dadosAnaliseLucro} margin={{ top: 30, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="equipe" />
                  <YAxis />
                  <Tooltip
                    formatter={(value, name) => {
                      const labels: Record<string, string> = {
                        mp: 'MP (Matéria-Prima)',
                        eq: 'EQ (Equipamento)',
                        v:  'V (Viagem)',
                        mo: 'MO (Mão de Obra)',
                      };
                      return [`$ ${Number(value).toFixed(2)}`, labels[name as string] || name];
                    }}
                  />
                  <Legend />
                  <Bar dataKey="mp" stackId="custo" fill={COR_MP} name="MP" />
                  <Bar dataKey="eq" stackId="custo" fill={COR_EQ} name="EQ" />
                  <Bar dataKey="v"  stackId="custo" fill={COR_V}  name="V (Viagem)" />
                  <Bar dataKey="mo" stackId="custo" fill={COR_MO} name="MO" />
                </BarChart>
              </ResponsiveContainer>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dadosAnaliseLucro.map((dados, i) => (
                  <Card key={i} className="border-2" style={{ borderColor: dados.corEquipe }}>
                    <CardContent className="p-4">
                      <h4 className="font-bold text-lg mb-3 text-center" style={{ color: dados.corEquipe }}>
                        {dados.equipe}
                      </h4>
                      <div className="bg-green-100 p-3 rounded-lg mb-3 text-center">
                        <div className="text-2xl font-bold text-green-700">$ {dados.lucro}</div>
                        <div className="text-sm text-green-600">Custo por Pizza</div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between bg-red-50 p-2 rounded">
                          <span className="text-red-700">MP (Matéria-Prima):</span>
                          <span className="font-bold">$ {dados.mp.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between bg-yellow-50 p-2 rounded">
                          <span className="text-yellow-700">EQ (Equipamento):</span>
                          <span className="font-bold">$ {dados.eq.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between bg-blue-50 p-2 rounded">
                          <span className="text-blue-700">V (Viagem):</span>
                          <span className="font-bold">$ {dados.v.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between bg-green-50 p-2 rounded">
                          <span className="text-green-700">MO (Mão de Obra):</span>
                          <span className="font-bold">$ {dados.mo.toFixed(2)}</span>
                        </div>
                        <div className="border-t pt-2 mt-2 font-bold flex justify-between">
                          <span>Custo Total:</span>
                          <span>$ {dados.custoTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-blue-600">
                          <span>Pizzas Aprovadas:</span>
                          <span>{dados.pizzasAprovadas}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p className="text-lg mb-2">📊 Nenhum dado encontrado para o filtro</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Takt Time por Equipe + 3. Ranking de Desempenho (dentro do TaktTimeChart) */}
      <TaktTimeChart rodadaSelecionada={rodadasSelecionadas.length === 1 ? rodadasSelecionadas[0] : null} />

      {/* 4. Produtividade de Mão de Obra */}
      <Card>
        <CardHeader>
          <CardTitle>👷‍♂️ Produtividade de Mão de Obra (Pizzas Aprovadas por Pessoa)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={dadosProdutividade}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="equipe" />
              <YAxis />
              <Tooltip
                formatter={(value: any, name: any, props: any) => {
                  if (name === 'pizzasPorPessoa') {
                    const p = props?.payload;
                    return [
                      `${value} (${p?.pizzasAprovadas ?? 0} aprovadas ÷ ${p?.quantidadePessoas ?? 0} pessoas)`,
                      'Pizzas por Pessoa'
                    ];
                  }
                  return [value, name];
                }}
              />
              <Bar dataKey="pizzasPorPessoa" fill="#8b5cf6" name="Pizzas por Pessoa" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 5. Análise de Pizzas (empilhado) */}
      <Card>
        <CardHeader>
          <CardTitle>🍕 Análise de Pizzas (Aprovadas vs Reprovadas)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={dadosPizzasFiltradas}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="equipe" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="aprovadas" stackId="pizzas" fill="#22c55e" name="Aprovadas" />
              <Bar dataKey="reprovadas" stackId="pizzas" fill="#ef4444" name="Reprovadas" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 6 + 7. Gastos por Equipe & Vendas por Equipe */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>💰 Gastos por Equipe</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dadosGastos}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nome" />
                <YAxis />
                <Tooltip formatter={(v) => [`$ ${Number(v).toFixed(2)}`, 'Gasto Total']} />
                <Bar dataKey="gasto" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>🎉 Vendas por Equipe (Pizzas Aprovadas)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dadosGanhos}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nome" />
                <YAxis />
                <Tooltip formatter={(v) => [`$ ${Number(v).toFixed(2)}`, 'Ganho Total']} />
                <Bar dataKey="ganho" fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 8. Distribuição de Gastos (% empilhado por equipe: MP + EQ + V + Mão de Obra) — largura total */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle>📊 Distribuição de Gastos por Equipe (%) — MP / EQ / V / Mão de Obra</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={dadosDistribuicaoGastos} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="equipe" />
              <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} label={{ value: '%', angle: -90, position: 'insideLeft' }} />
              <Tooltip
                formatter={(value, name, props: any) => {
                  const labels: Record<string, string> = {
                    mp: 'MP (Matéria-Prima)',
                    eq: 'EQ (Equipamento)',
                    v:  'V (Viagem)',
                    mo: 'Mão de Obra',
                  };
                  const absKey = `${name}Abs` as 'mpAbs' | 'eqAbs' | 'vAbs' | 'moAbs';
                  const abs = props?.payload?.[absKey] ?? 0;
                  return [`${value}% ($ ${Number(abs).toFixed(2)})`, labels[name as string] || name];
                }}
              />
              <Legend />
              <Bar dataKey="mp" stackId="dist" fill={COR_MP} name="MP" />
              <Bar dataKey="eq" stackId="dist" fill={COR_EQ} name="EQ" />
              <Bar dataKey="v"  stackId="dist" fill={COR_V}  name="V (Viagem)" />
              <Bar dataKey="mo" stackId="dist" fill={COR_MO} name="Mão de Obra" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 9. Resumo Geral */}
      <Card>
        <CardHeader><CardTitle>📈 Resumo Geral</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-100 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">
                $ {comprasFiltradas.reduce((s, c) => s + c.valor_total, 0).toFixed(2)}
              </div>
              <div className="text-sm text-blue-700">Total Gasto (filtro)</div>
            </div>
            <div className="bg-green-100 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">
                $ {equipes.reduce((s, e) => s + (e.ganho_total || 0), 0).toFixed(2)}
              </div>
              <div className="text-sm text-green-700">Total Ganho (Pizzas)</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 10. Produtos Mais Comprados (depois do Resumo Geral) */}
      <Card>
        <CardHeader><CardTitle>🛒 Produtos Mais Comprados</CardTitle></CardHeader>
        <CardContent>
          {produtosMaisComprados.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={produtosMaisComprados.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nome" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="quantidade" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="text-center py-8 text-gray-500">Sem dados</div>}
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardLojinha;
