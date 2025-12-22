
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabase';
import { Vaga, User } from '../types';
import { 
  ArrowLeft, BarChart2, Filter, Users, MapPin, Clock, 
  ChevronDown, Check, ShieldCheck, X, Eye, Briefcase, Calendar, Info,
  UserPlus, UserCheck, TrendingUp, UserCircle
} from 'lucide-react';
import VagaDetailsModal from './VagaDetailsModal';

interface IndicatorsProps {
  user: User;
  onBack: () => void;
}

const Indicators: React.FC<IndicatorsProps> = ({ user, onBack }) => {
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGerentes, setSelectedGerentes] = useState<string[]>([]);
  const [selectedCriadores, setSelectedCriadores] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // Estados para o Modal de Detalhamento
  const [vagasParaExibir, setVagasParaExibir] = useState<Vaga[]>([]);
  const [tituloDetalhamento, setTituloDetalhamento] = useState('');
  const [vagaSelecionadaParaDetalhes, setVagaSelecionadaParaDetalhes] = useState<Vaga | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('vagas')
      .select('*');

    if (!error && data) {
      setVagas(data);
      const openVagas = data.filter(v => !v.FECHAMENTO);
      
      const uniqueGerentes = Array.from(new Set(openVagas.map(v => v.GERENTE))).filter(Boolean) as string[];
      if (selectedGerentes.length === 0) {
        setSelectedGerentes(uniqueGerentes);
      }

      const uniqueCriadores = Array.from(new Set(openVagas.map(v => v['usuário_criador'] || v.RECRUTADOR || 'NÃO INFORMADO'))).filter(Boolean) as string[];
      if (selectedCriadores.length === 0) {
        setSelectedCriadores(uniqueCriadores);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const uniqueGerentesList = useMemo(() => {
    return Array.from(new Set(vagas.filter(v => !v.FECHAMENTO).map(v => v.GERENTE))).filter(Boolean).sort() as string[];
  }, [vagas]);

  const toggleGerente = (gerente: string) => {
    setSelectedGerentes(prev => 
      prev.includes(gerente) ? prev.filter(g => g !== gerente) : [...prev, gerente]
    );
  };

  const toggleCriador = (criador: string) => {
    setSelectedCriadores(prev => 
      prev.includes(criador) ? prev.filter(c => c !== criador) : [...prev, criador]
    );
  };

  const vagasAbertas = useMemo(() => vagas.filter(v => !v.FECHAMENTO), [vagas]);
  const vagasFechadas = useMemo(() => vagas.filter(v => !!v.FECHAMENTO), [vagas]);

  const handleShowVagas = (vagasList: Vaga[], titulo: string) => {
    setVagasParaExibir(vagasList);
    setTituloDetalhamento(titulo);
  };

  // Cálculo Indicador: Aberturas por Criador (Somente as abertas, com fallback)
  const aberturasPorUsuario = useMemo(() => {
    const stats: Record<string, Vaga[]> = {};
    vagasAbertas.forEach(v => {
      const criador = v['usuário_criador'] || v.RECRUTADOR || 'NÃO INFORMADO';
      if (!stats[criador]) stats[criador] = [];
      stats[criador].push(v);
    });
    return Object.entries(stats).sort((a, b) => b[1].length - a[1].length);
  }, [vagasAbertas]);

  // Vagas filtradas pelos seletores de criadores para a tabela de gerentes
  const vagasAbertasFiltradasPorCriador = useMemo(() => {
    if (selectedCriadores.length === 0) return vagasAbertas;
    return vagasAbertas.filter(v => {
      const criador = v['usuário_criador'] || v.RECRUTADOR || 'NÃO INFORMADO';
      return selectedCriadores.includes(criador);
    });
  }, [vagasAbertas, selectedCriadores]);

  const gerenteStats = useMemo(() => {
    const stats: Record<string, { aumento: number, substituicao: number, total: number }> = {};
    
    vagasAbertasFiltradasPorCriador.forEach(v => {
      const gerente = v.GERENTE || 'NÃO INFORMADO';
      if (!selectedGerentes.includes(gerente)) return;
      
      if (!stats[gerente]) stats[gerente] = { aumento: 0, substituicao: 0, total: 0 };
      
      if (v.TIPO === 'Aumento de Quadro') {
        stats[gerente].aumento++;
      } else if (v.TIPO === 'Substituição') {
        stats[gerente].substituicao++;
      }
      stats[gerente].total++;
    });

    return Object.entries(stats).sort((a, b) => b[1].total - a[1].total);
  }, [vagasAbertasFiltradasPorCriador, selectedGerentes]);

  const fechamentosPorUsuario = useMemo(() => {
    const stats: Record<string, Vaga[]> = {};
    vagasFechadas.forEach(v => {
      const fechador = v.usuario_fechador || 'SISTEMA';
      if (!stats[fechador]) stats[fechador] = [];
      stats[fechador].push(v);
    });
    return Object.entries(stats).sort((a, b) => b[1].length - a[1].length);
  }, [vagasFechadas]);

  const unitStats = useMemo(() => {
    const stats: Record<string, number> = {};
    vagasAbertasFiltradasPorCriador.forEach(v => {
      stats[v.UNIDADE] = (stats[v.UNIDADE] || 0) + 1;
    });
    return Object.entries(stats).sort((a, b) => b[1] - a[1]);
  }, [vagasAbertasFiltradasPorCriador]);

  const agingStats = useMemo(() => {
    const ranges = { '0-15 DIAS': 0, '16-30 DIAS': 0, '31-45 DIAS': 0, '45+ DIAS': 0 };
    vagasAbertasFiltradasPorCriador.forEach(v => {
      const start = new Date(v.ABERTURA);
      const diff = Math.ceil(Math.abs(new Date().getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diff <= 15) ranges['0-15 DIAS']++;
      else if (diff <= 30) ranges['16-30 DIAS']++;
      else if (diff <= 45) ranges['31-45 DIAS']++;
      else ranges['45+ DIAS']++;
    });
    return Object.entries(ranges);
  }, [vagasAbertasFiltradasPorCriador]);

  return (
    <div className="min-h-screen bg-[#f1f3f5] flex flex-col font-sans">
      <header className="bg-black text-white px-8 py-6 flex items-center justify-between shadow-2xl relative z-10 border-b-4 border-[#adff2f]">
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
        
        {/* FILTRO DE GERENTES E CRIADORES */}
        <div className="bg-white rounded-3xl shadow-xl border-2 border-gray-100 overflow-hidden">
          <button 
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="w-full px-8 py-5 flex items-center justify-between bg-black text-white hover:bg-gray-900 transition-colors"
          >
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-3">
                <Filter size={20} className="text-[#adff2f]" />
                <span className="font-black uppercase tracking-widest text-xs italic">Filtros Avançados</span>
              </div>
              <div className="hidden md:flex space-x-4">
                 <span className="px-3 py-1 bg-[#adff2f] text-black text-[9px] font-black rounded-lg uppercase">{selectedGerentes.length} Gerentes</span>
                 <span className="px-3 py-1 bg-[#e31e24] text-white text-[9px] font-black rounded-lg uppercase">{selectedCriadores.length} Criadores</span>
              </div>
            </div>
            <ChevronDown size={24} className={`transition-transform duration-300 ${isFilterOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isFilterOpen && (
            <div className="p-8 bg-gray-50 border-t border-gray-200 animate-in slide-in-from-top-2 space-y-8">
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4 block">Filtrar por Gerentes Responsáveis</label>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {uniqueGerentesList.map(gerente => (
                    <button
                      key={gerente}
                      onClick={() => toggleGerente(gerente)}
                      className={`flex items-center justify-between px-4 py-2.5 rounded-xl border-2 transition-all text-[10px] font-black uppercase ${
                        selectedGerentes.includes(gerente)
                        ? 'bg-black border-black text-[#adff2f] shadow-md scale-105'
                        : 'bg-white border-gray-200 text-gray-400 hover:border-black'
                      }`}
                    >
                      <span className="truncate mr-2">{gerente}</span>
                      {selectedGerentes.includes(gerente) && <Check size={14} strokeWidth={4} />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4 block">Filtrar por Usuário Criador (Somente Abertas)</label>
                <div className="flex flex-wrap gap-4">
                  {aberturasPorUsuario.map(([criador, items]) => (
                    <button
                      key={criador}
                      onClick={() => toggleCriador(criador)}
                      className={`flex items-center space-x-3 px-5 py-3 rounded-full border-2 transition-all group ${
                        selectedCriadores.includes(criador)
                        ? 'bg-[#e31e24] border-black text-white shadow-lg scale-105'
                        : 'bg-white border-gray-200 text-gray-500 hover:border-[#e31e24] hover:text-[#e31e24]'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-[10px] uppercase shadow-inner ${
                        selectedCriadores.includes(criador) ? 'bg-black text-[#adff2f]' : 'bg-gray-100 text-gray-400 group-hover:bg-red-50'
                      }`}>
                        {criador.substring(0, 2)}
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] font-black uppercase leading-none">{criador}</p>
                        <p className={`text-[9px] font-bold uppercase mt-0.5 ${selectedCriadores.includes(criador) ? 'text-red-100' : 'text-gray-400'}`}>
                          {items.length} Vagas
                        </p>
                      </div>
                      {selectedCriadores.includes(criador) && <Check size={14} strokeWidth={4} />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-6 pt-6 border-t border-gray-200">
                <button 
                  onClick={() => { setSelectedGerentes(uniqueGerentesList); setSelectedCriadores(aberturasPorUsuario.map(a => a[0])); }}
                  className="text-[10px] font-black uppercase text-black hover:text-[#e31e24] transition-colors border-b-2 border-black"
                >
                  Selecionar Tudo
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
          
          {/* INDICADOR 1: TABELA GERENTES */}
          <div className="xl:col-span-2 space-y-6">
            <div className="flex items-center space-x-3 ml-2">
              <ShieldCheck className="text-[#e31e24]" size={24} strokeWidth={3} />
              <h2 className="text-xl font-black uppercase italic tracking-tighter">Vagas em Aberto por Gerente</h2>
            </div>
            <div className="bg-white rounded-[40px] shadow-2xl border-4 border-white overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-black text-white">
                    <th className="px-10 py-6 text-[11px] font-black uppercase tracking-widest italic border-r border-white/10">Gerente</th>
                    <th className="px-10 py-6 text-[11px] font-black uppercase tracking-widest italic text-center border-r border-white/10">Aumento de Quadro</th>
                    <th className="px-10 py-6 text-[11px] font-black uppercase tracking-widest italic text-center border-r border-white/10">Substituição</th>
                    <th className="px-10 py-6 text-[11px] font-black uppercase tracking-widest italic text-center text-[#adff2f]">Total Geral</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-gray-50">
                  {gerenteStats.map(([gerente, data]) => (
                    <tr key={gerente} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-10 py-5">
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-8 bg-[#e31e24] rounded-full group-hover:scale-y-125 transition-transform"></div>
                          <span className="text-sm font-black uppercase tracking-tight text-gray-900">{gerente}</span>
                        </div>
                      </td>
                      <td 
                        className={`px-10 py-5 text-center ${data.aumento > 0 ? 'cursor-pointer hover:bg-red-50' : ''}`}
                        onClick={() => data.aumento > 0 && handleShowVagas(vagasAbertasFiltradasPorCriador.filter(v => (v.GERENTE || 'NÃO INFORMADO') === gerente && v.TIPO === 'Aumento de Quadro'), `${gerente} - Aumento de Quadro`)}
                      >
                        <span className={`text-base font-black ${data.aumento > 0 ? 'text-[#e31e24] underline' : 'text-gray-300'}`}>{data.aumento}</span>
                      </td>
                      <td 
                        className={`px-10 py-5 text-center ${data.substituicao > 0 ? 'cursor-pointer hover:bg-red-50' : ''}`}
                        onClick={() => data.substituicao > 0 && handleShowVagas(vagasAbertasFiltradasPorCriador.filter(v => (v.GERENTE || 'NÃO INFORMADO') === gerente && v.TIPO === 'Substituição'), `${gerente} - Substituição`)}
                      >
                        <span className={`text-base font-black ${data.substituicao > 0 ? 'text-[#e31e24] underline' : 'text-gray-300'}`}>{data.substituicao}</span>
                      </td>
                      <td 
                        className={`px-10 py-5 text-center bg-gray-50/50 cursor-pointer hover:bg-black group/total`}
                        onClick={() => data.total > 0 && handleShowVagas(vagasAbertasFiltradasPorCriador.filter(v => (v.GERENTE || 'NÃO INFORMADO') === gerente), `${gerente} - Total Abertas`)}
                      >
                        <span className={`text-lg font-black text-black group-hover/total:text-[#adff2f] transition-colors`}>{data.total}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-10">
            {/* INDICADOR 2: UNIDADES */}
            <div className="space-y-5">
              <div className="flex items-center space-x-3 ml-2">
                <MapPin className="text-[#e31e24]" size={24} strokeWidth={3} />
                <h2 className="text-xl font-black uppercase italic tracking-tighter">Vagas por Unidade</h2>
              </div>
              <div className="bg-black rounded-[40px] p-8 shadow-2xl border-t-8 border-[#adff2f]">
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-4 custom-scrollbar">
                  {unitStats.map(([unit, count]) => (
                    <div key={unit} className="bg-white/5 rounded-2xl p-4 border border-white/10 hover:border-[#adff2f] transition-all flex items-center justify-between group">
                      <p className="text-sm font-black text-white uppercase tracking-tighter">{unit}</p>
                      <div className="bg-[#adff2f] px-4 py-2 rounded-xl text-black font-black text-xl">{count}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* INDICADOR 3: AGING */}
            <div className="space-y-5">
              <div className="flex items-center space-x-3 ml-2">
                <Clock className="text-[#e31e24]" size={24} strokeWidth={3} />
                <h2 className="text-xl font-black uppercase italic tracking-tighter">Tempo de Abertura (Aging)</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {agingStats.map(([range, count]) => (
                  <div key={range} className={`p-6 rounded-[30px] border-4 flex flex-col items-center justify-center space-y-2 shadow-xl ${
                    range === '45+ DIAS' && count > 0 ? 'bg-[#e31e24] border-black text-white' : 'bg-white border-gray-100 text-black'
                  }`}>
                    <span className="text-[10px] font-black uppercase tracking-widest text-center">{range}</span>
                    <span className="text-4xl font-black">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* SEÇÃO: INDICADORES EM "MOEDAS" POR CRIADOR */}
        <div className="space-y-10">
          <div className="flex items-center space-x-4 ml-2">
             <UserCircle className="text-[#adff2f] bg-black p-2 rounded-xl" size={40} strokeWidth={3} />
             <div>
               <h2 className="text-2xl font-black uppercase italic tracking-tighter leading-none">Vagas Abertas por Criador</h2>
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Lógica: Criador ou Recrutador da Vaga</p>
             </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {aberturasPorUsuario.map(([usuario, items]) => (
              <button 
                key={usuario}
                onClick={() => handleShowVagas(items, `Vagas abertas por: ${usuario}`)}
                className="group relative flex flex-col items-center justify-center p-8 bg-white rounded-[40px] shadow-xl hover:shadow-2xl border-4 border-transparent hover:border-black transition-all hover:-translate-y-2 overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-2 bg-[#e31e24]"></div>
                <div className="w-16 h-16 rounded-full bg-black flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform">
                   <span className="text-[#adff2f] font-black text-lg uppercase">{usuario.substring(0, 2)}</span>
                </div>
                <h3 className="text-xs font-black uppercase text-center text-gray-900 tracking-tighter mb-2 truncate w-full px-2">{usuario}</h3>
                <div className="bg-[#e31e24] text-white px-4 py-1.5 rounded-full text-[14px] font-black shadow-md">
                   {items.length}
                </div>
                <p className="text-[8px] font-black text-gray-400 uppercase mt-2 tracking-widest group-hover:text-black transition-colors">VAGAS ATIVAS</p>
              </button>
            ))}
          </div>
        </div>

        {/* PERFORMANCE DE FECHAMENTOS */}
        <div className="space-y-8">
          <div className="flex items-center space-x-4 ml-2">
             <UserCheck className="text-white bg-green-600 p-2 rounded-xl" size={40} strokeWidth={3} />
             <div>
               <h2 className="text-2xl font-black uppercase italic tracking-tighter leading-none">Vagas Finalizadas por Colaborador</h2>
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Histórico completo de finalizações</p>
             </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {fechamentosPorUsuario.map(([usuario, items]) => (
              <button 
                key={usuario}
                onClick={() => handleShowVagas(items, `Vagas finalizadas por: ${usuario}`)}
                className="group relative flex flex-col items-center justify-center p-8 bg-white rounded-[40px] shadow-xl hover:shadow-2xl border-4 border-transparent hover:border-green-600 transition-all hover:-translate-y-2 overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-2 bg-green-600"></div>
                <div className="w-16 h-16 rounded-full bg-green-600 flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform">
                   <span className="text-white font-black text-lg uppercase">{usuario.substring(0, 2)}</span>
                </div>
                <h3 className="text-xs font-black uppercase text-center text-gray-900 tracking-tighter mb-2 truncate w-full px-2">{usuario}</h3>
                <div className="bg-black text-white px-4 py-1.5 rounded-full text-[14px] font-black shadow-md">
                   {items.length}
                </div>
                <p className="text-[8px] font-black text-gray-400 uppercase mt-2 tracking-widest group-hover:text-green-600 transition-colors">FINALIZADAS</p>
              </button>
            ))}
            {fechamentosPorUsuario.length === 0 && (
               <div className="col-span-full py-20 text-center text-gray-300 font-black uppercase italic text-xs tracking-widest border-4 border-dashed border-gray-100 rounded-[40px]">
                  Nenhuma vaga finalizada no histórico do sistema.
               </div>
            )}
          </div>
        </div>
      </main>

      {/* MODAL DE LISTAGEM DE VAGAS DETALHADAS */}
      {vagasParaExibir.length > 0 && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
          <div className="bg-white w-full max-w-5xl rounded-[40px] shadow-2xl overflow-hidden border-t-[12px] border-[#e31e24] flex flex-col max-h-[90vh]">
            <div className="px-10 py-8 border-b border-gray-100 bg-gray-50 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-5">
                <div className="bg-black p-3 rounded-2xl text-[#adff2f] shadow-lg transform -rotate-3">
                  <Briefcase size={28} strokeWidth={3} />
                </div>
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tighter italic text-black leading-none">Listagem Detalhada</h2>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1.5">{tituloDetalhamento}</p>
                </div>
              </div>
              <button 
                onClick={() => setVagasParaExibir([])}
                className="p-3 bg-gray-200 hover:bg-black hover:text-[#adff2f] text-black rounded-full transition-all active:scale-90"
              >
                <X size={32} strokeWidth={3} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 space-y-6 custom-scrollbar bg-[#f8f9fa]">
              {vagasParaExibir.map((vaga) => {
                const isClosed = !!vaga.FECHAMENTO;
                const days = Math.ceil(Math.abs((isClosed ? new Date(vaga.FECHAMENTO!) : new Date()).getTime() - new Date(vaga.ABERTURA).getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={vaga.id} className="bg-white p-8 rounded-[30px] border-2 border-gray-100 shadow-sm hover:shadow-xl hover:border-black transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => setVagaSelecionadaParaDetalhes(vaga)}
                        className="bg-black text-[#adff2f] p-3 rounded-2xl shadow-lg flex items-center space-x-2"
                      >
                        <Eye size={20} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Ver Completo</span>
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                      <div className="md:col-span-2">
                        <label className="text-[9px] font-black text-[#e31e24] uppercase tracking-widest block mb-1">Cargo / Unidade</label>
                        <h3 className="text-xl font-black uppercase text-black italic leading-tight mb-2">{vaga.CARGO}</h3>
                        <div className="flex items-center space-x-2 text-gray-500 text-[10px] font-black uppercase">
                          <MapPin size={12} className="text-gray-400" />
                          <span>{vaga.UNIDADE} • {vaga.SETOR}</span>
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Gestor / Gerente</label>
                        <p className="text-xs font-black text-black uppercase tracking-tighter">{vaga.GESTOR}</p>
                        <p className="text-[9px] font-bold text-gray-400 uppercase">{vaga.GERENTE || 'Sem Gerente'}</p>
                      </div>

                      <div className="flex flex-col justify-center items-end">
                        <div className="text-right">
                          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">{isClosed ? 'Tempo de Processo' : 'Aberta há'}</label>
                          <div className="flex items-center justify-end space-x-2">
                             <span className={`text-xl font-black ${days > 30 ? 'text-[#e31e24]' : 'text-black'}`}>{days} DIAS</span>
                             {isClosed ? <UserCheck className="text-green-600" size={18} /> : <Clock size={18} className="text-gray-300" />}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between">
                      <div className="flex space-x-3">
                         <span className={`px-2 py-1 ${isClosed ? 'bg-green-600 text-white' : 'bg-black text-[#adff2f]'} text-[8px] font-black uppercase rounded-lg tracking-widest`}>
                           {isClosed ? 'FINALIZADA' : 'ATIVA'}
                         </span>
                         <span className="px-2 py-1 bg-gray-100 text-gray-500 text-[8px] font-black uppercase rounded-lg tracking-widest border border-gray-200">{vaga.TIPO}</span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-[8px] font-black text-gray-400 uppercase">
                          Abertura: <span className="text-gray-900">{new Date(vaga.ABERTURA).toLocaleDateString('pt-BR')}</span> por <span className="text-[#e31e24]">{vaga['usuário_criador'] || vaga.RECRUTADOR || 'SISTEMA'}</span>
                        </div>
                        {isClosed && (
                          <div className="text-[8px] font-black text-gray-400 uppercase">
                            Finalizada: <span className="text-gray-900">{new Date(vaga.FECHAMENTO!).toLocaleDateString('pt-BR')}</span> por <span className="text-green-600">{vaga.usuario_fechador}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="p-8 border-t border-gray-100 bg-white flex justify-center shrink-0">
               <button 
                onClick={() => setVagasParaExibir([])}
                className="px-12 py-4 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:bg-[#e31e24] transition-all active:scale-95 shadow-xl border-b-4 border-black/20"
               >
                 Fechar Detalhamento
               </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE DETALHES COMPLETOS (REUTILIZADO) */}
      {vagaSelecionadaParaDetalhes && (
        <VagaDetailsModal 
          user={user} 
          vaga={vagaSelecionadaParaDetalhes} 
          onClose={() => setVagaSelecionadaParaDetalhes(null)} 
          onUpdate={() => {
            fetchData();
          }} 
        />
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #adff2f;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #000;
        }
      `}</style>
    </div>
  );
};

export default Indicators;
