
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabase';
import { Vaga, User } from '../types';
import { 
  Plus, LogOut, Clock, CheckCircle, AlertCircle, TrendingUp, 
  User as UserIcon, Eye, ShieldCheck, Users, Search as SearchIcon, 
  UserMinus, UserPlus, ChevronsUpDown, ArrowUp, ArrowDown, MapPin, XCircle, X, Hash, Map, Download, BarChart2, UserCircle, UserCheck, HelpCircle, Settings,
  Snowflake, Flame, Lock
} from 'lucide-react';
import * as XLSX from 'xlsx';
import NewVagaModal from './NewVagaModal';
import CloseVagaModal from './CloseVagaModal';
import VagaDetailsModal from './VagaDetailsModal';

interface DashboardProps {
  user: User;
  onLogout: () => void;
  onNavigateToUsers: () => void;
  onNavigateToUnits: () => void;
  onNavigateToIndicators: () => void;
  onNavigateToAdminVagas?: () => void;
}

type SortKey = keyof Vaga | 'DAYS_OPEN';

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout, onNavigateToUsers, onNavigateToUnits, onNavigateToIndicators, onNavigateToAdminVagas }) => {
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNewVagaModalOpen, setIsNewVagaModalOpen] = useState(false);
  const [selectedVagaForClosing, setSelectedVagaForClosing] = useState<Vaga | null>(null);
  const [selectedVagaForDetails, setSelectedVagaForDetails] = useState<Vaga | null>(null);
  const [vagaToAssignCreator, setVagaToAssignCreator] = useState<Vaga | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'closed'>('open');
  const [filterFrozen, setFilterFrozen] = useState<'all' | 'frozen' | 'not_frozen'>('not_frozen');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
  const [selectedCreators, setSelectedCreators] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>(null);

  const isAllAccess = Array.isArray(user.unidades) && user.unidades.some(u => u?.toString().trim().toUpperCase() === 'ALL');
  const isAdmin = user.role === 'admin';

  const fetchVagas = useCallback(async () => {
    if (vagas.length === 0) setLoading(true);
    
    try {
      let query = supabase.from('vagas').select('*');
      
      if (!isAllAccess) {
        if (user.unidades && user.unidades.length > 0) {
          query = query.in('UNIDADE', user.unidades);
        } else {
          setVagas([]);
          setLoading(false);
          return;
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      setVagas(data || []);
      
      if (selectedVagaForDetails) {
        const updatedVaga = (data || []).find(v => v.id === selectedVagaForDetails.id);
        if (updatedVaga) {
          setSelectedVagaForDetails(updatedVaga);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar vagas:', error);
    } finally {
      setLoading(false);
    }
  }, [user.unidades, isAllAccess, selectedVagaForDetails?.id]);

  useEffect(() => {
    fetchVagas();
  }, [user.unidades, isAllAccess]);

  useEffect(() => {
    const channel = supabase
      .channel('vagas_realtime_dashboard')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vagas'
        },
        () => {
          fetchVagas();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchVagas]);

  const calculateDaysOpen = (abertura: string, fechamento?: string | null) => {
    const start = new Date(abertura);
    const end = fechamento ? new Date(fechamento) : new Date();
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getVagaCreator = (v: Vaga) => {
    return v['usuário_criador'] && v['usuário_criador'].trim() !== '' 
      ? v['usuário_criador'] 
      : (v.RECRUTADOR || 'SISTEMA');
  };

  const handleAssignSelfAsCreator = async () => {
    if (!vagaToAssignCreator) return;
    
    setLoading(true);
    const dateStr = new Date().toLocaleDateString('pt-BR');
    const newObs = `${dateStr} ${user.username}: Usuário assumiu a autoria da abertura desta vaga manualmente.`;
    const updatedObservations = [...(vagaToAssignCreator.OBSERVACOES || []), newObs];

    const { error } = await supabase
      .from('vagas')
      .update({ 
        'usuário_criador': user.username,
        OBSERVACOES: updatedObservations
      })
      .eq('id', vagaToAssignCreator.id);

    if (error) {
      alert('Erro ao vincular criador: ' + error.message);
    } else {
      setVagaToAssignCreator(null);
      fetchVagas();
    }
    setLoading(false);
  };

  const creatorStats = useMemo(() => {
    const stats: Record<string, number> = {};
    vagas.forEach(v => {
      const matchesFrozenFilter = 
        filterFrozen === 'all' ? true : 
        filterFrozen === 'frozen' ? v.CONGELADA : !v.CONGELADA;

      if (!v.FECHAMENTO && matchesFrozenFilter) {
        const creator = getVagaCreator(v);
        stats[creator] = (stats[creator] || 0) + 1;
      }
    });
    return Object.entries(stats).sort((a, b) => b[1] - a[1]);
  }, [vagas, filterFrozen]);

  const unitStats = useMemo(() => {
    const stats: Record<string, number> = {};
    vagas.forEach(v => {
      const matchesFrozenFilter = 
        filterFrozen === 'all' ? true : 
        filterFrozen === 'frozen' ? v.CONGELADA : !v.CONGELADA;

      if (!v.FECHAMENTO && matchesFrozenFilter) {
        if (!stats[v.UNIDADE]) stats[v.UNIDADE] = 0;
        stats[v.UNIDADE]++;
      }
    });
    return Object.entries(stats).sort(([a], [b]) => a.localeCompare(b));
  }, [vagas, filterFrozen]);

  const toggleUnit = (unit: string) => {
    setSelectedUnits(prev => 
      prev.includes(unit) ? prev.filter(u => u !== unit) : [...prev, unit]
    );
  };

  const toggleCreator = (creator: string) => {
    setSelectedCreators(prev => 
      prev.includes(creator) ? prev.filter(c => c !== creator) : [...prev, creator]
    );
  };

  const counts = useMemo(() => {
    return {
      all: vagas.length,
      open: vagas.filter(v => !v.FECHAMENTO && !v.CONGELADA).length,
      closed: vagas.filter(v => !!v.FECHAMENTO).length,
      frozen: vagas.filter(v => v.CONGELADA && !v.FECHAMENTO).length
    };
  }, [vagas]);

  const processedVagas = useMemo(() => {
    let filtered = vagas.filter(v => {
      if (filterStatus === 'open' && v.FECHAMENTO) return false;
      if (filterStatus === 'closed' && !v.FECHAMENTO) return false;

      if (filterFrozen === 'frozen' && !v.CONGELADA) return false;
      if (filterFrozen === 'not_frozen' && v.CONGELADA) return false;

      const s = searchTerm.toLowerCase();
      const matchesSearch = (
        v.CARGO?.toLowerCase().includes(s) ||
        v.GESTOR?.toLowerCase().includes(s) ||
        v.GERENTE?.toLowerCase().includes(s) ||
        v.NOME_SUBSTITUIDO?.toLowerCase().includes(s) ||
        v.NOME_SUBSTITUICAO?.toLowerCase().includes(s) ||
        v.UNIDADE?.toLowerCase().includes(s) ||
        v.VAGA?.toString().includes(s)
      );
      
      const matchesUnit = selectedUnits.length === 0 || selectedUnits.includes(v.UNIDADE);
      
      const creator = getVagaCreator(v);
      const matchesCreator = selectedCreators.length === 0 || selectedCreators.includes(creator);
      
      return matchesSearch && matchesUnit && matchesCreator;
    });

    if (sortConfig) {
      filtered.sort((a, b) => {
        let aVal: any = a[sortConfig.key as keyof Vaga];
        let bVal: any = b[sortConfig.key as keyof Vaga];

        if (sortConfig.key === 'DAYS_OPEN') {
          aVal = calculateDaysOpen(a.ABERTURA, a.FECHAMENTO);
          bVal = calculateDaysOpen(b.ABERTURA, b.FECHAMENTO);
        }

        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
      filtered.sort((a, b) => new Date(b.ABERTURA).getTime() - new Date(a.ABERTURA).getTime());
    }

    return filtered;
  }, [vagas, searchTerm, selectedUnits, selectedCreators, sortConfig, filterStatus, filterFrozen]);

  const handleSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const renderSortIcon = (key: SortKey) => {
    if (!sortConfig || sortConfig.key !== key) return <ChevronsUpDown size={12} className="ml-1 opacity-30" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={12} className="ml-1 text-[#e31e24]" /> : <ArrowDown size={12} className="ml-1 text-[#e31e24]" />;
  };

  const formatExcelDate = (dateStr?: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleExport = () => {
    if (processedVagas.length === 0) return;

    const excelData = processedVagas.map(v => ({
      'ID': v.id,
      'DATA_CRIACAO': formatExcelDate(v.created_at),
      'NUMERO_VAGA': v.VAGA || '',
      'DATA_ABERTURA': formatExcelDate(v.ABERTURA),
      'UNIDADE': v.UNIDADE || '',
      'SETOR': v.SETOR || '',
      'TIPO_CARGO': v.TIPO_CARGO || '',
      'CARGO': v.CARGO || '',
      'TIPO': v.TIPO || '',
      'MOTIVO': v.MOTIVO || '',
      'NOME_SUBSTITUIDO': v.NOME_SUBSTITUIDO || '',
      'TURNO': v.TURNO || '',
      'GESTOR': v.GESTOR || '',
      'GERENTE': v.GERENTE || '',
      'DIAS_ABERTO': calculateDaysOpen(v.ABERTURA, v.FECHAMENTO),
      'DATA_FECHAMENTO': formatExcelDate(v.FECHAMENTO),
      'NOME_CONTRATADO': v.NOME_SUBSTITUICAO || '',
      'CAPTACAO': v.CAPTACAO || '',
      'RECRUTADOR': v.RECRUTADOR || '',
      'OBSERVACOES': (v.OBSERVACOES || []).join(' | '),
      'USUARIO_CRIADOR': v['usuário_criador'] || '',
      'USUARIO_FECHADOR': v.usuario_fechador || '',
      'CONGELADA': v.CONGELADA ? 'SIM' : 'NÃO'
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Vagas");
    XLSX.writeFile(workbook, `REITERLOG_Vagas_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const isSearching = searchTerm.length > 0;

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col font-sans">
      <header className="bg-black text-white px-8 py-5 flex items-center justify-between shadow-2xl relative z-10">
        <div className="flex items-center space-x-4">
          <div className="bg-[#e31e24] p-2 rounded-lg transform -skew-x-12">
            <TrendingUp size={24} className="text-white transform skew-x-12" />
          </div>
          <h1 className="text-2xl font-black tracking-tighter uppercase italic">
            REITER<span className="text-[#e31e24]">LOG</span>
          </h1>
          <div className="h-4 w-[1px] bg-gray-700 hidden md:block"></div>
          <p className="text-gray-400 text-[10px] font-bold tracking-[0.3em] uppercase hidden md:block">Portal de Vagas</p>
        </div>
        
        <div className="flex items-center space-x-3 md:space-x-4">
          {isAdmin && (
            <>
              <button 
                onClick={onNavigateToAdminVagas}
                className="flex items-center space-x-2 bg-white text-black px-4 py-2 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest border-2 border-black shadow-lg hover:bg-black hover:text-[#41a900]"
              >
                <Settings size={16} strokeWidth={3} />
                <span className="hidden sm:inline">Gestão Global</span>
              </button>
              <button 
                onClick={onNavigateToIndicators}
                className="flex items-center space-x-2 bg-[#41a900] text-black px-4 py-2 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest border border-black shadow-lg hover:bg-white"
              >
                <BarChart2 size={16} strokeWidth={3} />
                <span className="hidden sm:inline">Indicadores</span>
              </button>
              <button 
                onClick={onNavigateToUnits}
                className="flex items-center space-x-2 bg-gray-800 hover:bg-gray-700 text-[#41a900] px-4 py-2 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest border border-gray-700"
              >
                <Map size={16} />
                <span className="hidden sm:inline">Unidades</span>
              </button>
              <button 
                onClick={onNavigateToUsers}
                className="flex items-center space-x-2 bg-gray-800 hover:bg-gray-700 text-[#41a900] px-4 py-2 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest border border-gray-700"
              >
                <Users size={16} />
                <span className="hidden sm:inline">Usuários</span>
              </button>
            </>
          )}

          <div className="flex items-center space-x-3 bg-[#111] px-4 py-2 rounded-xl border border-gray-800">
            <ShieldCheck size={16} className={isAllAccess ? "text-[#41a900]" : "text-orange-500"} />
            <div className="text-right">
              <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest leading-none">Acesso</p>
              <p className="font-bold text-white text-xs uppercase">
                {isAllAccess ? 'TOTAL' : `${user.unidades?.length || 0} UNID.`}
              </p>
            </div>
          </div>

          <div className="text-right hidden lg:block">
            <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Colaborador</p>
            <p className="font-bold text-[#41a900] text-sm">{user.username}</p>
          </div>

          <button 
            onClick={onLogout}
            className="p-3 bg-[#1a1a1a] hover:bg-[#e31e24] hover:text-white rounded-xl transition-all text-[#e31e24] border border-gray-800"
            title="Sair"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <div className="bg-white border-b border-gray-200 px-8 py-6 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-4 w-full lg:w-auto">
            <div className="bg-white p-1.5 rounded-2xl flex shrink-0 border-2 border-gray-100 shadow-inner">
              {[
                { id: 'open', label: 'Fluxo Normal', count: counts.open, activeColor: 'bg-orange-500 text-white', badgeColor: 'bg-white text-orange-500' },
                { id: 'closed', label: 'Finalizadas', count: counts.closed, activeColor: 'bg-black text-white', badgeColor: 'bg-[#41a900] text-black' },
                { id: 'all', label: 'Ver Todas', count: counts.all, activeColor: 'bg-gray-800 text-white', badgeColor: 'bg-gray-400 text-white' }
              ].map((filter) => (
                <button 
                  key={filter.id}
                  onClick={() => {
                    setFilterStatus(filter.id as any);
                    if (filter.id === 'open') setFilterFrozen('not_frozen');
                    else if (filter.id === 'all') setFilterFrozen('all');
                  }}
                  className={`px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center space-x-3 ${filterStatus === filter.id ? filter.activeColor + ' shadow-md scale-105' : 'text-gray-400 hover:text-gray-900'}`}
                >
                  <span>{filter.label}</span>
                  <span className={`flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[9px] font-black transition-colors ${filterStatus === filter.id ? filter.badgeColor : 'bg-gray-100 text-gray-400'}`}>
                    {filter.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="bg-white p-1.5 rounded-2xl flex shrink-0 border-2 border-gray-100 shadow-inner ml-2">
              {[
                { id: 'not_frozen', label: 'Ativas', icon: <Flame size={12} />, activeColor: 'bg-black text-white' },
                { id: 'frozen', label: 'Congeladas', icon: <Snowflake size={12} />, activeColor: 'bg-blue-600 text-white' }
              ].map((f) => (
                <button 
                  key={f.id}
                  onClick={() => setFilterFrozen(f.id as any)}
                  className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center space-x-2 ${filterFrozen === f.id ? f.activeColor + ' shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  {f.icon}
                  <span>{f.label}</span>
                </button>
              ))}
            </div>

            <div className={`relative w-full md:w-80 group transition-all duration-300 ${isSearching ? 'scale-105' : ''}`}>
              <SearchIcon className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isSearching ? 'text-[#e31e24]' : 'text-gray-400 group-focus-within:text-[#e31e24]'}`} size={18} />
              <input 
                type="text" 
                placeholder="Vaga, Cargo, Gestor, Nomes..."
                className={`w-full pl-12 pr-12 py-3 rounded-xl border-2 outline-none font-bold text-xs uppercase tracking-wider transition-all shadow-sm
                  ${isSearching 
                    ? 'border-[#e31e24] bg-red-50/30 ring-4 ring-red-500/5' 
                    : 'border-gray-200 bg-gray-50/50 focus:border-[#e31e24] focus:bg-white focus:ring-4 focus:ring-red-500/5'}`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {isSearching && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500 hover:text-red-700 transition-colors p-1 hover:bg-red-100 rounded-full"
                  title="Limpar Pesquisa"
                >
                  <X size={16} strokeWidth={3} />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {counts.frozen > 0 && (
              <div className="bg-blue-50 border-2 border-blue-200 px-6 py-3 rounded-2xl flex items-center space-x-3 shadow-sm animate-pulse">
                <Snowflake size={20} className="text-blue-600" />
                <div>
                  <p className="text-[9px] font-black text-blue-400 uppercase leading-none">Vagas Congeladas</p>
                  <p className="text-xl font-black text-blue-700 leading-none">{counts.frozen}</p>
                </div>
              </div>
            )}
            <button 
              onClick={() => setIsNewVagaModalOpen(true)}
              className="bg-[#e31e24] hover:bg-[#c0191e] text-white px-8 py-3.5 rounded-xl flex items-center justify-center font-black text-xs tracking-widest uppercase shadow-[0_10px_20px_-5px_rgba(227,30,36,0.3)] transform transition active:scale-95 space-x-3 w-full lg:w-auto"
            >
              <Plus size={20} strokeWidth={3} />
              <span>Abrir Nova Vaga</span>
            </button>
          </div>
        </div>

        <div className="space-y-5">
          <div className="flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <MapPin size={14} className="text-[#e31e24]" />
                <span>Unidades Operacionais ({filterFrozen === 'frozen' ? 'Vagas Congeladas' : 'Vagas Ativas'}):</span>
              </div>
              {selectedUnits.length > 0 && (
                <button 
                  onClick={() => setSelectedUnits([])}
                  className="text-[9px] font-black uppercase text-red-600 hover:underline"
                >
                  Limpar Unidades
                </button>
              )}
            </div>
            <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-hide">
              <div className="flex space-x-2">
                {unitStats.map(([unit, count]) => (
                  <button
                    key={unit}
                    onClick={() => toggleUnit(unit)}
                    className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-tighter transition-all border-2 whitespace-nowrap flex items-center space-x-2 ${
                      selectedUnits.includes(unit) 
                      ? 'bg-[#41a900] border-black text-black shadow-md' 
                      : 'bg-white border-gray-100 text-gray-500 hover:border-[#41a900]'
                    }`}
                  >
                    <span>{unit}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${selectedUnits.includes(unit) ? 'bg-black text-[#41a900]' : 'bg-gray-100 text-gray-400'}`}>
                      {count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <UserCircle size={14} className="text-[#41a900]" />
                <span>Responsáveis pela Abertura ({filterFrozen === 'frozen' ? 'Vagas Congeladas' : 'Vagas Ativas'}):</span>
              </div>
              {selectedCreators.length > 0 && (
                <button 
                  onClick={() => setSelectedCreators([])}
                  className="text-[9px] font-black uppercase text-red-600 hover:underline"
                >
                  Limpar Criadores
                </button>
              )}
            </div>
            <div className="flex items-center space-x-3 overflow-x-auto pb-4 scrollbar-hide">
              <div className="flex space-x-3">
                {creatorStats.map(([creator, count]) => (
                  <button
                    key={creator}
                    onClick={() => toggleCreator(creator)}
                    className={`flex items-center space-x-3 px-4 py-2.5 rounded-full border-2 transition-all group shrink-0 ${
                      selectedCreators.includes(creator)
                      ? 'bg-black border-black text-white shadow-xl scale-105'
                      : 'bg-white border-gray-100 text-gray-500 hover:border-black'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-[10px] uppercase transition-colors ${
                      selectedCreators.includes(creator) ? 'bg-[#41a900] text-black' : 'bg-gray-100 text-gray-400 group-hover:bg-black group-hover:text-[#41a900]'
                    }`}>
                      {creator.substring(0, 2)}
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-black uppercase leading-tight">{creator}</p>
                      <p className={`text-[8px] font-bold uppercase mt-0.5 ${selectedCreators.includes(creator) ? 'text-[#41a900]' : 'text-[#e31e24]'}`}>
                        {count} Vagas {filterFrozen === 'frozen' ? 'Congeladas' : 'Ativas'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 p-8">
        <div className="flex justify-end mb-3">
          <button 
            onClick={handleExport}
            disabled={processedVagas.length === 0}
            className="flex items-center space-x-2 bg-white hover:bg-green-50 text-green-700 px-4 py-2 rounded-lg border-2 border-green-100 text-[10px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95 disabled:opacity-30"
          >
            <Download size={16} strokeWidth={3} />
            <span>Exportar Excel</span>
          </button>
        </div>
        
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-96 space-y-4">
              <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-[#e31e24]"></div>
              <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Acessando base de dados...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead>
                  <tr className="bg-[#fafafa]">
                    <th onClick={() => handleSort('VAGA')} className="px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] cursor-pointer hover:bg-gray-100/50 transition-colors">
                      <div className="flex items-center">Vaga {renderSortIcon('VAGA')}</div>
                    </th>
                    <th onClick={() => handleSort('UNIDADE')} className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] cursor-pointer hover:bg-gray-100/50 transition-colors">
                      <div className="flex items-center">Unidade / Setor {renderSortIcon('UNIDADE')}</div>
                    </th>
                    <th onClick={() => handleSort('CARGO')} className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] cursor-pointer hover:bg-gray-100/50 transition-colors">
                      <div className="flex items-center">Cargo / Responsáveis {renderSortIcon('CARGO')}</div>
                    </th>
                    <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                      Substituído / Contratado
                    </th>
                    <th onClick={() => handleSort('ABERTURA')} className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] cursor-pointer hover:bg-gray-100/50 transition-colors">
                      <div className="flex items-center">Abertura / Dias {renderSortIcon('ABERTURA')}</div>
                    </th>
                    {(filterStatus === 'closed' || filterStatus === 'all') && (
                      <th onClick={() => handleSort('FECHAMENTO')} className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] cursor-pointer hover:bg-gray-100/50 transition-colors">
                        <div className="flex items-center">Fechamento {renderSortIcon('FECHAMENTO')}</div>
                      </th>
                    )}
                    <th onClick={() => handleSort('TIPO')} className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] cursor-pointer hover:bg-gray-100/50 transition-colors">
                      <div className="flex items-center">Status / Tipo {renderSortIcon('TIPO')}</div>
                    </th>
                    <th className="px-8 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {processedVagas.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-8 py-24 text-center">
                        <div className="flex flex-col items-center justify-center space-y-3 opacity-30">
                           <AlertCircle size={48} />
                           <p className="font-bold uppercase tracking-widest text-xs">
                             Nenhuma vaga encontrada para os filtros aplicados
                           </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    processedVagas.map((vaga) => {
                      const hasCreator = vaga['usuário_criador'] && vaga['usuário_criador'].trim() !== '';
                      const isFrozen = vaga.CONGELADA && !vaga.FECHAMENTO;
                      
                      return (
                        <tr 
                          key={vaga.id} 
                          className={`cursor-pointer transition-colors group ${isFrozen ? 'bg-blue-50/60 hover:bg-blue-100/80 border-l-4 border-blue-500' : 'hover:bg-gray-50/80'}`}
                          onClick={() => setSelectedVagaForDetails(vaga)}
                        >
                          <td className="px-6 py-6">
                            <span className={`px-3 py-1.5 rounded-lg text-xs font-black shadow-sm border ${isFrozen ? 'bg-blue-600 text-white border-blue-700' : 'bg-gray-100 text-gray-900 border-gray-200'}`}>
                              {vaga.VAGA || '---'}
                            </span>
                          </td>
                          <td className="px-8 py-6">
                            <div className="text-sm font-black text-black uppercase tracking-tighter">{vaga.UNIDADE}</div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{vaga.SETOR}</div>
                          </td>
                          <td className="px-8 py-6">
                            <div className={`text-sm font-bold uppercase italic ${isFrozen ? 'text-blue-700' : 'text-[#e31e24]'}`}>{vaga.CARGO}</div>
                            <div className="text-[10px] text-gray-500 font-black uppercase">GEST: {vaga.GESTOR}</div>
                            <div className="text-[9px] text-gray-400 font-bold uppercase italic">GER: {vaga.GERENTE || '---'}</div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="space-y-1">
                              {vaga.NOME_SUBSTITUIDO && (
                                <div className="flex items-center space-x-2 text-[10px] font-bold text-gray-600 uppercase">
                                  <UserMinus size={12} className="text-gray-400" />
                                  <span>Subst: <span className="text-black font-black">{vaga.NOME_SUBSTITUIDO}</span></span>
                                </div>
                              )}
                              {vaga.NOME_SUBSTITUICAO && (
                                <div className="flex items-center space-x-2 text-[10px] font-bold text-green-700 uppercase">
                                  <UserPlus size={12} className="text-green-500" />
                                  <span>Contr: <span className="text-green-900 font-black">{vaga.NOME_SUBSTITUICAO}</span></span>
                                </div>
                              )}
                              {!vaga.NOME_SUBSTITUIDO && !vaga.NOME_SUBSTITUICAO && (
                                <span className="text-[10px] text-gray-300 italic">Nenhum registro</span>
                              )}
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex items-center space-x-2 text-gray-700">
                              <Clock size={14} className="text-gray-300" />
                              <span className="text-xs font-bold">{new Date(vaga.ABERTURA).toLocaleDateString('pt-BR')}</span>
                            </div>
                            <div className={`text-[10px] font-black mt-1 ${calculateDaysOpen(vaga.ABERTURA, vaga.FECHAMENTO) > 30 ? 'text-orange-500' : 'text-gray-400'}`}>
                              {calculateDaysOpen(vaga.ABERTURA, vaga.FECHAMENTO)} DIAS
                            </div>
                          </td>
                          {(filterStatus === 'closed' || filterStatus === 'all') && (
                            <td className="px-8 py-6">
                              {vaga.FECHAMENTO ? (
                                <div className="flex items-center space-x-2 text-green-700">
                                  <CheckCircle size={14} className="text-green-400" />
                                  <span className="text-xs font-bold">{new Date(vaga.FECHAMENTO).toLocaleDateString('pt-BR')}</span>
                                </div>
                              ) : (
                                <span className="text-[10px] text-gray-300 italic font-bold">ATIVA</span>
                              )}
                            </td>
                          )}
                          <td className="px-8 py-6">
                            <div className="flex flex-col space-y-1.5">
                              {vaga.FECHAMENTO ? (
                                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700 text-[10px] font-black uppercase tracking-widest border border-green-100 w-fit">
                                  <CheckCircle size={10} />
                                  <span>Finalizada</span>
                                </span>
                              ) : isFrozen ? (
                                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-widest border border-blue-200 w-fit">
                                  <Snowflake size={10} />
                                  <span>Congelada</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-orange-50 text-orange-700 text-[10px] font-black uppercase tracking-widest border border-orange-100 w-fit">
                                  <AlertCircle size={10} />
                                  <span>Em Aberto</span>
                                </span>
                              )}
                              <span className="text-[9px] font-black text-gray-400 uppercase ml-1 italic">{vaga.TIPO}</span>
                            </div>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              {!vaga.FECHAMENTO && !hasCreator && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setVagaToAssignCreator(vaga);
                                  }}
                                  className="p-2 bg-[#41a900] text-black rounded-xl hover:bg-black hover:text-[#41a900] transition-all animate-pulse shadow-lg border border-black/10"
                                  title="Assumir Vaga como Criador"
                                >
                                  <UserPlus size={18} strokeWidth={3} />
                                </button>
                              )}
                              <button className="p-2 text-gray-300 group-hover:text-black transition-colors" title="Visualizar Detalhes">
                                <Eye size={18} />
                              </button>
                              {!vaga.FECHAMENTO && !vaga.CONGELADA && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedVagaForClosing(vaga);
                                  }}
                                  className="bg-black hover:bg-[#e31e24] text-white px-5 py-2 rounded-lg transition-all shadow-md text-[10px] font-black uppercase tracking-widest active:scale-95"
                                >
                                  Finalizar
                                </button>
                              )}
                              {isFrozen && (
                                <div className="p-2 text-blue-400 cursor-not-allowed" title="Vaga Congelada - Descongele para finalizar">
                                  <Lock size={18} />
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <footer className="bg-white border-t border-gray-100 py-4 px-8 flex justify-between items-center mt-auto">
        <p className="text-[9px] text-gray-400 font-black uppercase tracking-[0.3em]">
          Reiterlog Logística • Tecnologia de Gestão de Talentos
        </p>
      </footer>

      {vagaToAssignCreator && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
          <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden border-t-[12px] border-[#41a900] transform transition-all animate-in zoom-in duration-300">
            <div className="p-10 flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-[#41a900] rounded-full flex items-center justify-center mb-8 shadow-2xl animate-bounce">
                <UserPlus size={48} className="text-black" strokeWidth={3} />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tighter italic text-black leading-none mb-4">
                VINCULAR <span className="text-[#e31e24]">CRIADOR</span>
              </h2>
              <div className="bg-gray-50 p-6 rounded-2xl border-2 border-dashed border-gray-200 w-full mb-8">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-widest leading-relaxed">
                  Deseja se vincular à vaga <span className="text-black font-black">#{vagaToAssignCreator.VAGA} - {vagaToAssignCreator.CARGO}</span> como o Recrutador responsável pela abertura?
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 w-full">
                <button 
                  onClick={() => setVagaToAssignCreator(null)}
                  className="px-6 py-4 bg-gray-100 text-gray-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all active:scale-95"
                >
                  Agora não
                </button>
                <button 
                  onClick={handleAssignSelfAsCreator}
                  className="px-6 py-4 bg-black text-[#41a900] rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#e31e24] hover:text-white transition-all shadow-xl active:scale-95 border-b-4 border-black/20"
                >
                  Sim, vincular
                </button>
              </div>
              <p className="mt-6 text-[9px] font-black text-gray-400 uppercase italic">
                Ação registrada por: {user.username}
              </p>
            </div>
          </div>
        </div>
      )}

      {isNewVagaModalOpen && (
        <NewVagaModal user={user} onClose={() => setIsNewVagaModalOpen(false)} onSuccess={() => { setIsNewVagaModalOpen(false); fetchVagas(); }} />
      )}
      {selectedVagaForClosing && (
        <CloseVagaModal user={user} vaga={selectedVagaForClosing} onClose={() => setSelectedVagaForClosing(null)} onSuccess={() => { setSelectedVagaForClosing(null); fetchVagas(); }} />
      )}
      {selectedVagaForDetails && (
        <VagaDetailsModal 
          user={user} 
          vaga={selectedVagaForDetails} 
          onClose={() => setSelectedVagaForDetails(null)} 
          onUpdate={fetchVagas} 
          onCloseVagaAction={(v) => {
            setSelectedVagaForDetails(null);
            setSelectedVagaForClosing(v);
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;
