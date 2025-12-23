
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabase';
import { Vaga, User } from '../types';
import { 
  ArrowLeft, BarChart2, Filter, Clock, 
  ChevronDown, X, Eye, UserCheck, TrendingUp, LayoutGrid,
  CalendarRange, PieChart as PieChartIcon, ChevronRight, ChevronsDownUp, ChevronsUpDown,
  Snowflake, Flame, ToggleLeft, ToggleRight
} from 'lucide-react';
import VagaDetailsModal from './VagaDetailsModal';

interface IndicatorsProps {
  user: User;
  onBack: () => void;
}

const Indicators: React.FC<IndicatorsProps> = ({ user, onBack }) => {
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFrozenColumn, setShowFrozenColumn] = useState(false);
  
  // Controle de Expansão do Mapa Geral (Unidades)
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());
  
  // Filtros Avançados
  const [selectedRecrutadores, setSelectedRecrutadores] = useState<string[]>([]);
  const [selectedTurnos, setSelectedTurnos] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Filtros de Período (Para Fechamentos)
  const defaultStartDate = useMemo(() => {
    const d = new Date();
    d.setDate(1); 
    return d.toISOString().split('T')[0];
  }, []);
  const defaultEndDate = useMemo(() => new Date().toISOString().split('T')[0], []);

  const [closingStartDate, setClosingStartDate] = useState(defaultStartDate);
  const [closingEndDate, setClosingEndDate] = useState(defaultEndDate);
  
  // Estados para o Modal de Detalhamento
  const [vagasParaExibir, setVagasParaExibir] = useState<Vaga[]>([]);
  const [tituloDetalhamento, setTituloDetalhamento] = useState('');
  const [vagaSelecionadaParaDetalhes, setVagaSelecionadaParaDetalhes] = useState<Vaga | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('vagas').select('*');
    if (!error && data) {
      setVagas(data);
      const openVagas = data.filter(v => !v.FECHAMENTO && !v.CONGELADA);
      const r = Array.from(new Set(openVagas.map(v => v['usuário_criador'] || v.RECRUTADOR || 'NÃO INFORMADO'))).filter(Boolean) as string[];
      setSelectedRecrutadores(r);
      const t = Array.from(new Set(openVagas.map(v => v.TURNO))).filter(Boolean) as string[];
      setSelectedTurnos(t);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Base para o Mapa: Inclui tudo o que não está fechado (ativas + congeladas)
  const allOpenVagasForMap = useMemo(() => vagas.filter(v => !v.FECHAMENTO), [vagas]);
  
  // Base para Indicadores: Apenas o fluxo normal (não fechadas e não congeladas)
  const activeOpenVagas = useMemo(() => vagas.filter(v => !v.FECHAMENTO && !v.CONGELADA), [vagas]);

  const totalFrozenCount = useMemo(() => vagas.filter(v => !v.FECHAMENTO && v.CONGELADA).length, [vagas]);

  const filterOptions = useMemo(() => {
    const active = activeOpenVagas;
    return {
      recrutadores: Array.from(new Set(active.map(v => v['usuário_criador'] || v.RECRUTADOR || 'NÃO INFORMADO'))).filter(Boolean).sort(),
      turnos: Array.from(new Set(active.map(v => v.TURNO))).filter(Boolean).sort()
    };
  }, [activeOpenVagas]);

  const toggleFilter = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, value: string) => {
    setList(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
  };

  const filteredVagasFechadasPeriodo = useMemo(() => {
    return vagas.filter(v => {
      if (!v.FECHAMENTO) return false;
      const fechamentoDate = v.FECHAMENTO.split('T')[0];
      const rec = v['usuário_criador'] || v.RECRUTADOR || 'NÃO INFORMADO';
      const matchPeriodo = fechamentoDate >= closingStartDate && fechamentoDate <= closingEndDate;
      const matchRecrutador = selectedRecrutadores.length === 0 || selectedRecrutadores.includes(rec);
      const matchTurno = selectedTurnos.length === 0 || selectedTurnos.includes(v.TURNO);
      return matchPeriodo && matchRecrutador && matchTurno;
    });
  }, [vagas, closingStartDate, closingEndDate, selectedRecrutadores, selectedTurnos]);

  // Pivot Data para o Mapa Geral
  const pivotData = useMemo(() => {
    const tree: any = {};
    allOpenVagasForMap.forEach(v => {
      const tc = v.TIPO_CARGO || 'Outras Funções';
      const un = v.UNIDADE || 'N/A';
      const set = v.SETOR || 'N/A';
      
      let tipo: string;
      if (v.CONGELADA) {
        tipo = 'congelada';
      } else {
        tipo = v.TIPO === 'Aumento de Quadro' ? 'aumento' : 'substituicao';
      }

      if (!tree[tc]) tree[tc] = { units: {}, totalAumento: 0, totalSub: 0, totalCong: 0, totalGeral: 0 };
      if (!tree[tc].units[un]) tree[tc].units[un] = { sectors: {}, totalAumento: 0, totalSub: 0, totalCong: 0, totalGeral: 0 };
      if (!tree[tc].units[un].sectors[set]) tree[tc].units[un].sectors[set] = { aumento: 0, substituicao: 0, congelada: 0, items: [] };

      tree[tc].units[un].sectors[set][tipo]++;
      tree[tc].units[un].sectors[set].items.push(v);
      
      tree[tc].units[un].totalAumento = Object.values(tree[tc].units[un].sectors).reduce((a:any, c:any) => a + c.aumento, 0);
      tree[tc].units[un].totalSub = Object.values(tree[tc].units[un].sectors).reduce((a:any, c:any) => a + c.substituicao, 0);
      tree[tc].units[un].totalCong = Object.values(tree[tc].units[un].sectors).reduce((a:any, c:any) => a + c.congelada, 0);
      tree[tc].units[un].totalGeral = tree[tc].units[un].totalAumento + tree[tc].units[un].totalSub + (showFrozenColumn ? tree[tc].units[un].totalCong : 0);
      
      tree[tc].totalAumento = Object.values(tree[tc].units).reduce((acc: any, curr: any) => acc + curr.totalAumento, 0);
      tree[tc].totalSub = Object.values(tree[tc].units).reduce((acc: any, curr: any) => acc + curr.totalSub, 0);
      tree[tc].totalCong = Object.values(tree[tc].units).reduce((acc: any, curr: any) => acc + curr.totalCong, 0);
      tree[tc].totalGeral = tree[tc].totalAumento + tree[tc].totalSub + (showFrozenColumn ? tree[tc].totalCong : 0);
    });
    return tree;
  }, [allOpenVagasForMap, showFrozenColumn]);

  // Totais Gerais para a última linha da tabela
  const grandTotals = useMemo(() => {
    let aum = 0;
    let sub = 0;
    let cong = 0;
    Object.values(pivotData).forEach((cargoData: any) => {
      aum += cargoData.totalAumento;
      sub += cargoData.totalSub;
      cong += cargoData.totalCong;
    });
    return { 
      aum, 
      sub, 
      cong, 
      total: aum + sub + (showFrozenColumn ? cong : 0) 
    };
  }, [pivotData, showFrozenColumn]);

  const allUnitNames = useMemo(() => {
    const names: string[] = [];
    Object.values(pivotData).forEach((cargoData: any) => {
      Object.keys(cargoData.units).forEach(un => names.push(un));
    });
    return Array.from(new Set(names));
  }, [pivotData]);

  const toggleUnitExpansion = (unit: string) => {
    const newExpanded = new Set(expandedUnits);
    if (newExpanded.has(unit)) {
      newExpanded.delete(unit);
    } else {
      newExpanded.add(unit);
    }
    setExpandedUnits(newExpanded);
  };

  const handleExpandAll = () => {
    setExpandedUnits(new Set(allUnitNames));
  };

  const handleCollapseAll = () => {
    setExpandedUnits(new Set());
  };

  const pieChartData = useMemo(() => {
    const counts: Record<string, Vaga[]> = {};
    activeOpenVagas.forEach(v => {
      const cargo = v.TIPO_CARGO || 'Outras Funções';
      if (!counts[cargo]) counts[cargo] = [];
      counts[cargo].push(v);
    });
    const total = activeOpenVagas.length;
    return Object.entries(counts).map(([name, items]) => ({
      name,
      items,
      count: items.length,
      percent: total > 0 ? ((items.length / total) * 100).toFixed(1) : '0'
    })).sort((a, b) => b.count - a.count);
  }, [activeOpenVagas]);

  const fechamentosPorUsuario = useMemo(() => {
    const stats: Record<string, Vaga[]> = {};
    filteredVagasFechadasPeriodo.forEach(v => {
      const fechador = v.usuario_fechador || 'SISTEMA';
      if (!stats[fechador]) stats[fechador] = [];
      stats[fechador].push(v);
    });
    return Object.entries(stats).sort((a, b) => b[1].length - a[1].length);
  }, [filteredVagasFechadasPeriodo]);

  const agingStats = useMemo(() => {
    const ranges = { '0-15 DIAS': 0, '16-30 DIAS': 0, '31-45 DIAS': 0, '45+ DIAS': 0 };
    activeOpenVagas.forEach(v => {
      const start = new Date(v.ABERTURA);
      const diff = Math.ceil(Math.abs(new Date().getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      if (diff <= 15) ranges['0-15 DIAS']++;
      else if (diff <= 30) ranges['16-30 DIAS']++;
      else if (diff <= 45) ranges['31-45 DIAS']++;
      else ranges['45+ DIAS']++;
    });
    return Object.entries(ranges);
  }, [activeOpenVagas]);

  const closingAgingStats = useMemo(() => {
    const ranges: Record<string, Vaga[]> = { '0-15 DIAS': [], '16-30 DIAS': [], '31-45 DIAS': [], '45+ DIAS': [] };
    filteredVagasFechadasPeriodo.forEach(v => {
      const start = new Date(v.ABERTURA);
      const end = new Date(v.FECHAMENTO!);
      const diff = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      if (diff <= 15) ranges['0-15 DIAS'].push(v);
      else if (diff <= 30) ranges['16-30 DIAS'].push(v);
      else if (diff <= 45) ranges['31-45 DIAS'].push(v);
      else ranges['45+ DIAS'].push(v);
    });
    return Object.entries(ranges);
  }, [filteredVagasFechadasPeriodo]);

  const handleShowVagas = (vagasList: Vaga[], titulo: string) => {
    setVagasParaExibir(vagasList);
    setTituloDetalhamento(titulo);
  };

  const renderPieChart = () => {
    if (pieChartData.length === 0) return <div className="text-gray-300 italic py-10 text-center uppercase font-black text-[10px]">Sem dados de fluxo normal</div>;
    let cumulativePercent = 0;
    const colors = ['#e31e24', '#000000', '#adff2f', '#666666', '#ff4500', '#4169e1'];
    return (
      <div className="flex flex-col items-center">
        <svg viewBox="0 0 100 100" className="w-48 h-48 transform -rotate-90">
          {pieChartData.map((item, i) => {
            const startX = Math.cos(2 * Math.PI * cumulativePercent);
            const startY = Math.sin(2 * Math.PI * cumulativePercent);
            cumulativePercent += parseFloat(item.percent) / 100;
            const endX = Math.cos(2 * Math.PI * cumulativePercent);
            const endY = Math.sin(2 * Math.PI * cumulativePercent);
            const largeArcFlag = parseFloat(item.percent) > 50 ? 1 : 0;
            const pathData = `M 0 0 L ${startX} ${startY} A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;
            return (
              <path 
                key={item.name} 
                d={pathData} 
                fill={colors[i % colors.length]} 
                transform="translate(50, 50) scale(40)"
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => handleShowVagas(item.items, `Vagas em Fluxo: ${item.name}`)}
              />
            );
          })}
        </svg>
        <div className="mt-8 grid grid-cols-1 gap-3 w-full">
          {pieChartData.map((item, i) => (
            <div key={item.name} className="flex items-center justify-between text-[11px] font-black uppercase">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-sm shadow-sm" style={{ backgroundColor: colors[i % colors.length] }}></div>
                <span className="text-gray-600 truncate max-w-[120px]">{item.name}</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-black">{item.count} un.</span>
                <span className="text-[#e31e24] w-12 text-right">{item.percent}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f1f3f5] flex flex-col font-sans">
      <header className="bg-black text-white px-8 py-6 flex items-center justify-between shadow-2xl relative z-10 border-b-4 border-[#e31e24]">
        <div className="flex items-center space-x-5">
          <button onClick={onBack} className="p-3 hover:bg-gray-800 rounded-2xl transition-all text-[#adff2f] active:scale-90">
            <ArrowLeft size={28} strokeWidth={3} />
          </button>
          <div className="bg-[#e31e24] p-3 rounded-xl transform -skew-x-12">
            <BarChart2 size={28} className="text-white transform skew-x-12" strokeWidth={3} />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter uppercase italic leading-none">
              DASHBOARD DE <span className="text-[#adff2f]">INDICADORES</span>
            </h1>
            <p className="text-[10px] font-black text-[#adff2f] uppercase tracking-[0.4em] mt-1 opacity-80 italic">Análise de Performance R&S</p>
          </div>
        </div>
      </header>

      <main className="flex-1 p-8 lg:p-12 space-y-12 pb-24">
        
        {/* FILTROS TOTAIS */}
        <div className="bg-white rounded-3xl shadow-xl border-2 border-gray-100 overflow-hidden">
          <button 
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="w-full px-8 py-5 flex items-center justify-between bg-black text-white hover:bg-gray-900 transition-colors"
          >
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-3">
                <Filter size={20} className="text-[#adff2f]" />
                <span className="font-black uppercase tracking-widest text-xs italic">Filtros de Perfil & Performance (Ativas & Fechadas)</span>
              </div>
            </div>
            <ChevronDown size={24} className={`transition-transform duration-300 ${isFilterOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isFilterOpen && (
            <div className="p-10 bg-gray-50 border-t border-gray-200 animate-in slide-in-from-top-2 space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4 block border-b pb-2">Recrutador / Criador (Fluxo Ativo)</label>
                  <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                    {filterOptions.recrutadores.map(r => (
                      <button
                        key={r}
                        onClick={() => toggleFilter(selectedRecrutadores, setSelectedRecrutadores, r)}
                        className={`px-3 py-1.5 rounded-lg border-2 text-[10px] font-black uppercase transition-all ${selectedRecrutadores.includes(r) ? 'bg-[#e31e24] border-black text-white' : 'bg-white text-gray-400'}`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4 block border-b pb-2">Turno de Trabalho (Fluxo Ativo)</label>
                  <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                    {filterOptions.turnos.map(t => (
                      <button
                        key={t}
                        onClick={() => toggleFilter(selectedTurnos, setSelectedTurnos, t)}
                        className={`px-3 py-1.5 rounded-lg border-2 text-[10px] font-black uppercase transition-all ${selectedTurnos.includes(t) ? 'bg-blue-600 border-black text-white' : 'bg-white text-gray-400'}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 1. MAPA GERAL (PIVOT) */}
        <section className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 ml-2">
            <div className="flex items-center space-x-4">
              <LayoutGrid className="text-[#e31e24] bg-white p-2 rounded-xl shadow-md" size={40} strokeWidth={3} />
              <div>
                <h2 className="text-2xl font-black uppercase italic tracking-tighter leading-none">Mapa Geral de Vagas Abertas (Global)</h2>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1 italic">Estrutura por Unidade e Setor</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => setShowFrozenColumn(!showFrozenColumn)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${showFrozenColumn ? 'bg-blue-50 border-blue-600 text-blue-700' : 'bg-white border-gray-100 text-gray-400 hover:border-blue-200'}`}
                title="Exibir/Ocultar Vagas Congeladas no Mapa"
              >
                <Snowflake size={14} className={showFrozenColumn ? 'animate-spin-slow' : ''} />
                <span>Congeladas</span>
                {showFrozenColumn ? <ToggleRight size={20} className="text-blue-600" /> : <ToggleLeft size={20} />}
              </button>

              <div className="w-[1px] h-6 bg-gray-200 mx-2"></div>

              <button 
                onClick={handleExpandAll}
                className="flex items-center space-x-2 px-4 py-2 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#e31e24] transition-all"
              >
                <ChevronsDownUp size={14} />
                <span>Expandir Tudo</span>
              </button>
              <button 
                onClick={handleCollapseAll}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-200 text-gray-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black hover:text-[#adff2f] transition-all"
              >
                <ChevronsUpDown size={14} />
                <span>Recolher Tudo</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-[40px] shadow-2xl border-4 border-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-black text-white">
                    <th className="px-8 py-6 text-[11px] font-black uppercase tracking-widest italic border-r border-white/5">Estrutura Hierárquica (Filial / Setor)</th>
                    <th className="px-6 py-6 text-[11px] font-black uppercase tracking-widest italic text-center border-r border-white/5 w-36">Aumento de Quadro</th>
                    <th className="px-6 py-6 text-[11px] font-black uppercase tracking-widest italic text-center border-r border-white/5 w-36">Substituição</th>
                    {showFrozenColumn && (
                      <th className="px-6 py-6 text-[11px] font-black uppercase tracking-widest italic text-center border-r border-white/5 w-36 bg-blue-900/50">Congeladas</th>
                    )}
                    <th className="px-8 py-6 text-[11px] font-black uppercase tracking-widest italic text-center text-[#adff2f] w-36 bg-gray-900">Total Geral</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {Object.entries(pivotData).map(([tipoCargo, cargoData]: [string, any]) => (
                    <React.Fragment key={tipoCargo}>
                      <tr className="bg-gray-100/80">
                        <td className="px-8 py-4">
                          <span className="text-base font-black uppercase tracking-tighter text-black">{tipoCargo}</span>
                        </td>
                        <td className="px-6 py-4 text-center font-black text-[#e31e24] text-lg">{cargoData.totalAumento}</td>
                        <td className="px-6 py-4 text-center font-black text-[#e31e24] text-lg">{cargoData.totalSub}</td>
                        {showFrozenColumn && (
                          <td className="px-6 py-4 text-center font-black text-blue-600 text-lg bg-blue-50/30">{cargoData.totalCong}</td>
                        )}
                        <td className="px-8 py-4 text-center font-black text-black text-xl bg-gray-200/50">{cargoData.totalGeral}</td>
                      </tr>
                      {Object.entries(cargoData.units).map(([unidade, unitData]: [string, any]) => (
                        <React.Fragment key={unidade}>
                           <tr 
                              className={`cursor-pointer transition-all border-l-8 hover:bg-gray-50 ${expandedUnits.has(unidade) ? 'bg-gray-50/80 border-[#adff2f]' : 'bg-gray-50/30 border-[#e31e24]'}`}
                              onClick={() => toggleUnitExpansion(unidade)}
                           >
                              <td className="px-12 py-3 flex items-center space-x-3">
                                 <ChevronRight size={16} className={`transition-transform ${expandedUnits.has(unidade) ? 'rotate-90 text-[#adff2f]' : 'text-[#e31e24]'}`} />
                                 <span className="text-[12px] font-black uppercase text-gray-600">{unidade}</span>
                              </td>
                              <td className="px-6 py-3 text-center text-sm font-bold text-gray-500">{unitData.totalAumento}</td>
                              <td className="px-6 py-3 text-center text-sm font-bold text-gray-500">{unitData.totalSub}</td>
                              {showFrozenColumn && (
                                <td className="px-6 py-3 text-center text-sm font-bold text-blue-400 bg-blue-50/10">{unitData.totalCong}</td>
                              )}
                              <td className="px-8 py-3 text-center text-sm font-black text-black bg-gray-100/30">{unitData.totalGeral}</td>
                           </tr>
                           {expandedUnits.has(unidade) && Object.entries(unitData.sectors).map(([setor, sectorData]: [string, any]) => (
                             <tr key={setor} className="bg-white hover:bg-red-50/30 transition-colors animate-in slide-in-from-left-2 duration-200">
                                <td className="px-24 py-2 border-l-8 border-gray-100">
                                   <div className="flex items-center space-x-2">
                                     <div className="w-1.5 h-1.5 rounded-full bg-gray-200"></div>
                                     <span className="text-[11px] font-bold uppercase text-gray-400">{setor}</span>
                                   </div>
                                </td>
                                <td 
                                  className="px-6 py-2 text-center text-xs font-black text-gray-300 cursor-pointer hover:bg-white transition-all hover:text-[#e31e24]"
                                  onClick={() => sectorData.aumento > 0 && handleShowVagas(sectorData.items.filter((v:any) => v.TIPO === 'Aumento de Quadro' && !v.CONGELADA), `${unidade} > ${setor} - Aumento`)}
                                >
                                  {sectorData.aumento}
                                </td>
                                <td 
                                  className="px-6 py-2 text-center text-xs font-black text-gray-300 cursor-pointer hover:bg-white transition-all hover:text-[#e31e24]"
                                  onClick={() => sectorData.substituicao > 0 && handleShowVagas(sectorData.items.filter((v:any) => v.TIPO === 'Substituição' && !v.CONGELADA), `${unidade} > ${setor} - Substituição`)}
                                >
                                  {sectorData.substituicao}
                                </td>
                                {showFrozenColumn && (
                                  <td 
                                    className="px-6 py-2 text-center text-xs font-black text-blue-200 cursor-pointer hover:bg-blue-50 transition-all hover:text-blue-600 bg-blue-50/5"
                                    onClick={() => sectorData.congelada > 0 && handleShowVagas(sectorData.items.filter((v:any) => v.CONGELADA), `${unidade} > ${setor} - Congeladas`)}
                                  >
                                    {sectorData.congelada}
                                  </td>
                                )}
                                <td 
                                  className="px-8 py-2 text-center text-xs font-black text-black bg-gray-50/50 cursor-pointer hover:bg-black hover:text-[#adff2f]"
                                  onClick={() => handleShowVagas(sectorData.items, `${unidade} > ${setor}`)}
                                >
                                  {sectorData.aumento + sectorData.substituicao + (showFrozenColumn ? sectorData.congelada : 0)}
                                </td>
                             </tr>
                           ))}
                        </React.Fragment>
                      ))}
                    </React.Fragment>
                  ))}
                  
                  {/* LINHA DE TOTAL GERAL */}
                  <tr className="bg-black text-[#adff2f]">
                    <td className="px-8 py-6 text-base font-black uppercase tracking-widest italic">TOTAL GERAL</td>
                    <td className="px-6 py-6 text-center text-2xl font-black">{grandTotals.aum}</td>
                    <td className="px-6 py-6 text-center text-2xl font-black">{grandTotals.sub}</td>
                    {showFrozenColumn && (
                      <td className="px-6 py-6 text-center text-2xl font-black text-blue-400 bg-blue-900/40">{grandTotals.cong}</td>
                    )}
                    <td className="px-8 py-6 text-center text-3xl font-black bg-gray-900 shadow-inner">{grandTotals.total}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* SEÇÃO DE INDICADORES: RANKING (LEFT), PIE (MIDDLE), AGING (RIGHT) */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-10 items-start">
          
          {/* RANKING DE FINALIZAÇÕES (ESQUERDA) */}
          <div className="bg-white p-10 rounded-[40px] shadow-2xl border-2 border-gray-50 h-full">
            <div className="flex items-center space-x-4 mb-10">
               <UserCheck className="text-white bg-green-600 p-2 rounded-xl" size={36} />
               <h2 className="text-xl font-black uppercase italic tracking-tighter">Ranking de Fechamentos</h2>
            </div>
            <div className="space-y-6 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
              {fechamentosPorUsuario.length > 0 ? (
                fechamentosPorUsuario.map(([usuario, items]) => (
                  <button 
                    key={usuario}
                    onClick={() => handleShowVagas(items, `Finalizações: ${usuario}`)}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-green-50 rounded-2xl border-2 border-transparent hover:border-green-200 transition-all group"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center text-[10px] font-black uppercase">{usuario.substring(0, 2)}</div>
                      <span className="text-[11px] font-black uppercase text-gray-700 truncate max-w-[120px]">{usuario}</span>
                    </div>
                    <span className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-black">{items.length}</span>
                  </button>
                ))
              ) : (
                <p className="text-gray-300 text-[10px] font-black uppercase text-center py-20">Sem dados no período</p>
              )}
            </div>
          </div>

          {/* GRÁFICO DE PIZZA (MEIO) */}
          <div className="bg-white p-10 rounded-[40px] shadow-2xl border-2 border-gray-50 h-full flex flex-col items-center">
            <div className="flex items-center space-x-4 mb-10 w-full">
               <PieChartIcon className="text-white bg-black p-2 rounded-xl" size={36} />
               <h2 className="text-xl font-black uppercase italic tracking-tighter">Proporção (Fluxo Ativo)</h2>
            </div>
            {renderPieChart()}
          </div>

          {/* AGING SIDEBAR (DIREITA) */}
          <div className="space-y-10">
            {/* Aging Abertura */}
            <div className="bg-white p-10 rounded-[40px] shadow-2xl border-2 border-gray-50">
              <div className="flex items-center space-x-4 mb-8">
                <Clock className="text-[#e31e24]" size={28} />
                <h2 className="text-xl font-black uppercase italic tracking-tighter">Lead Time (Abertas)</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {agingStats.map(([range, count]) => (
                  <div key={range} className={`p-6 rounded-[30px] border-4 flex flex-col items-center shadow-md ${range === '45+ DIAS' && count > 0 ? 'bg-[#e31e24] border-black text-white' : 'bg-white border-gray-100'}`}>
                    <span className="text-[9px] font-black uppercase text-center mb-1">{range}</span>
                    <span className="text-3xl font-black">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tempo de Fechamento (Lead Time) */}
            <div className="bg-white p-10 rounded-[40px] shadow-2xl border-2 border-gray-50">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <CalendarRange className="text-green-600" size={28} />
                  <div className="flex flex-col">
                    <h2 className="text-xl font-black uppercase italic tracking-tighter leading-none">Tempo Processo</h2>
                    <span className="text-[9px] font-black text-green-700 uppercase tracking-widest mt-1">
                      Total: {filteredVagasFechadasPeriodo.length} un.
                    </span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-6">
                 <div>
                   <label className="text-[8px] font-black uppercase text-gray-400 ml-1">Início</label>
                   <input type="date" className="w-full text-[10px] p-2 bg-gray-50 border rounded-lg font-black" value={closingStartDate} onChange={(e) => setClosingStartDate(e.target.value)} />
                 </div>
                 <div>
                   <label className="text-[8px] font-black uppercase text-gray-400 ml-1">Fim</label>
                   <input type="date" className="w-full text-[10px] p-2 bg-gray-50 border rounded-lg font-black" value={closingEndDate} onChange={(e) => setClosingEndDate(e.target.value)} />
                 </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {closingAgingStats.map(([range, items]: [string, any]) => {
                  const totalFechadas = filteredVagasFechadasPeriodo.length;
                  const percent = totalFechadas > 0 ? ((items.length / totalFechadas) * 100).toFixed(1) : '0';
                  
                  return (
                    <button 
                      key={range}
                      disabled={items.length === 0}
                      onClick={() => handleShowVagas(items, `Tempo Fechamento: ${range}`)}
                      className={`p-5 rounded-[30px] border-4 flex flex-col items-center transition-all shadow-md active:scale-95 ${items.length > 0 ? 'bg-green-50 border-green-600 hover:bg-green-100' : 'bg-gray-50 border-gray-100 text-gray-300'}`}
                    >
                      <span className="text-[8px] font-black uppercase text-center mb-1">{range}</span>
                      <span className="text-2xl font-black leading-none">{items.length}</span>
                      <span className={`text-[10px] font-black uppercase mt-1 ${items.length > 0 ? 'text-[#e31e24]' : 'text-gray-300'}`}>
                        {percent}%
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* RESUMO OPERACIONAL INFERIOR */}
        <div className="bg-black rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden border-b-[12px] border-[#adff2f]">
           <TrendingUp className="absolute -bottom-10 -right-10 text-[#adff2f]/10" size={200} />
           <h3 className="text-[11px] font-black uppercase tracking-[0.4em] mb-6 text-[#adff2f]">Resumo Operacional Global</h3>
           <div className="grid grid-cols-1 md:grid-cols-4 gap-10 relative z-10">
              <div>
                <p className="text-[10px] font-black text-gray-500 uppercase">Vagas em Fluxo (Ativas)</p>
                <p className="text-4xl font-black italic">{activeOpenVagas.length}</p>
              </div>
              <div className="bg-blue-900/20 p-4 rounded-2xl border border-blue-500/30">
                <p className="text-[10px] font-black text-blue-400 uppercase flex items-center space-x-2">
                  <Snowflake size={12} />
                  <span>Vagas Congeladas</span>
                </p>
                <p className="text-4xl font-black italic text-blue-500">{totalFrozenCount}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-500 uppercase">Total de Abertas</p>
                <p className="text-4xl font-black italic">{allOpenVagasForMap.length}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-500 uppercase">Finalizadas (Período)</p>
                <p className="text-4xl font-black italic text-[#adff2f]">{filteredVagasFechadasPeriodo.length}</p>
              </div>
           </div>
        </div>
      </main>

      {/* MODAL DE LISTAGEM */}
      {vagasParaExibir.length > 0 && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
          <div className="bg-white w-full max-w-5xl rounded-[40px] shadow-2xl overflow-hidden border-t-[12px] border-[#e31e24] flex flex-col max-h-[90vh]">
            <div className="px-10 py-8 border-b border-gray-100 bg-gray-50 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tighter italic text-black leading-none">Vagas Identificadas</h2>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1.5">{tituloDetalhamento}</p>
              </div>
              <button onClick={() => setVagasParaExibir([])} className="p-3 bg-gray-200 hover:bg-black hover:text-[#adff2f] text-black rounded-full transition-all active:scale-90">
                <X size={32} strokeWidth={3} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-10 space-y-6 custom-scrollbar bg-[#f8f9fa]">
              {vagasParaExibir.map((vaga) => {
                const isClosed = !!vaga.FECHAMENTO;
                const days = Math.ceil(Math.abs((isClosed ? new Date(vaga.FECHAMENTO!) : new Date()).getTime() - new Date(vaga.ABERTURA).getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={vaga.id} className={`bg-white p-8 rounded-[30px] border-2 shadow-sm hover:shadow-xl hover:border-black transition-all group relative overflow-hidden ${vaga.CONGELADA ? 'border-blue-100' : 'border-gray-100'}`}>
                    {vaga.CONGELADA && (
                      <div className="absolute top-0 left-0 w-2 h-full bg-blue-600"></div>
                    )}
                    <button onClick={() => setVagaSelecionadaParaDetalhes(vaga)} className="absolute top-4 right-4 text-gray-300 hover:text-black transition-colors"><Eye size={20} /></button>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                      <div className="md:col-span-2">
                        <label className="text-[9px] font-black text-[#e31e24] uppercase mb-1">Cargo</label>
                        <h3 className="text-xl font-black uppercase text-black italic leading-tight">
                          {vaga.CARGO}
                          {vaga.CONGELADA && <span className="ml-3 text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded-md not-italic">CONGELADA</span>}
                        </h3>
                        <p className="text-[10px] font-bold text-gray-400">{vaga.UNIDADE} • {vaga.SETOR}</p>
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-gray-400 uppercase mb-1">Responsável</label>
                        <p className="text-xs font-black text-black uppercase">{vaga['usuário_criador'] || vaga.RECRUTADOR || '---'}</p>
                      </div>
                      <div className="text-right">
                        <label className="text-[9px] font-black text-gray-400 uppercase mb-1">{isClosed ? 'Processo' : 'Aberta há'}</label>
                        <p className="text-xl font-black text-black">{days} DIAS</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-8 bg-white border-t border-gray-100 flex justify-center">
              <button onClick={() => setVagasParaExibir([])} className="px-12 py-4 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-[0.3em]">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {vagaSelecionadaParaDetalhes && <VagaDetailsModal user={user} vaga={vagaSelecionadaParaDetalhes} onClose={() => setVagaSelecionadaParaDetalhes(null)} onUpdate={fetchData} />}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e31e24; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #000; }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default Indicators;
