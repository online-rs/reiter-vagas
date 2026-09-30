
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabase';
import { Vaga, User } from '../types';
import { 
  Plus, LogOut, Clock, CheckCircle, AlertCircle, TrendingUp, 
  User as UserIcon, Eye, ShieldCheck, Users, Search as SearchIcon, 
  UserMinus, UserPlus, ChevronsUpDown, ArrowUp, ArrowDown, MapPin, XCircle, X, Hash, Map, Download, BarChart2, UserCircle, UserCheck, HelpCircle, Settings,
  Snowflake, Flame, Lock, PieChart, ChevronUp, ChevronDown
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
  onNavigateToMetrics?: () => void;
}

type SortKey = keyof Vaga | 'DAYS_OPEN';

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout, onNavigateToUsers, onNavigateToUnits, onNavigateToIndicators, onNavigateToAdminVagas, onNavigateToMetrics }) => {
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
  const [selectedCargos, setSelectedCargos] = useState<string[]>([]);
  const [isCoinsExpanded, setIsCoinsExpanded] = useState(true);
  // Configuração inicial de ordenação alterada para VAGA descendente
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>({ key: 'VAGA', direction: 'desc' });

  const isAllAccess = Array.isArray(user.unidades) && user.unidades.some(u => u?.toString().trim().toUpperCase() === 'ALL');

  const isAdmin = user.role === 'admin';

  const fetchVagas = useCallback(async () => {
    if (vagas.length === 0) setLoading(true);
    
    try {
      if (!isAllAccess && (!user.unidades || user.unidades.length === 0)) {
        setVagas([]);
        setLoading(false);
        return;
      }

      let allData: Vaga[] = [];
      const pageSize = 1000;
      let currentOffset = 0;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from('vagas')
          .select('*')
          .order('created_at', { ascending: false })
          .range(currentOffset, currentOffset + pageSize - 1);
        
        if (!isAllAccess) {
          query = query.in('UNIDADE', user.unidades);
        }

        const { data, error } = await query;
        if (error) throw error;

        if (data && data.length > 0) {
          allData = [...allData, ...data];
          currentOffset += data.length;
          if (data.length < pageSize) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }

      setVagas(allData);
      
      if (selectedVagaForDetails) {
        const updatedVaga = allData.find(v => v.id === selectedVagaForDetails.id);
        if (updatedVaga) {
          setSelectedVagaForDetails(updatedVaga);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar vagas:', error);
    } finally {
      setLoading(false);
    }
  }, [user.unidades, isAllAccess, selectedVagaForDetails?.id, vagas.length]);

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

  const normalizeCargo = (cargo?: string | null): string => {
    if (!cargo) return 'NÃO INFORMADO';
    const cleaned = cargo
      .toString()
      .replace(/[\u00A0\u1680\u180e\u2000-\u200b\u202f\u205f\u3000\ufeff]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return cleaned ? cleaned.toUpperCase() : 'NÃO INFORMADO';
  };

  const normalizeUnit = (unit?: string | null): string => {
    if (!unit) return 'NÃO INFORMADA';
    const cleaned = unit
      .toString()
      .replace(/[\u00A0\u1680\u180e\u2000-\u200b\u202f\u205f\u3000\ufeff]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return cleaned ? cleaned.toUpperCase() : 'NÃO INFORMADA';
  };

  const getVagaCreator = (v: Vaga): string => {
    const raw = v['usuário_criador'] && v['usuário_criador'].trim() !== '' 
      ? v['usuário_criador'] 
      : (v.RECRUTADOR || 'SISTEMA');
    const cleaned = raw
      .toString()
      .replace(/[\u00A0\u1680\u180e\u2000-\u200b\u202f\u205f\u3000\ufeff]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return cleaned ? cleaned.toUpperCase() : 'SISTEMA';
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

  const baseVagasForStats = useMemo(() => {
    return vagas.filter(v => {
      if (filterStatus === 'open' && v.FECHAMENTO) return false;
      if (filterStatus === 'closed' && !v.FECHAMENTO) return false;

      if (filterFrozen === 'frozen' && !v.CONGELADA) return false;
      if (filterFrozen === 'not_frozen' && v.CONGELADA) return false;

      const s = searchTerm.toLowerCase();
      if (s) {
        return (
          v.CARGO?.toLowerCase().includes(s) ||
          v.GESTOR?.toLowerCase().includes(s) ||
          v.GERENTE?.toLowerCase().includes(s) ||
          v.NOME_SUBSTITUIDO?.toLowerCase().includes(s) ||
          v.NOME_SUBSTITUICAO?.toLowerCase().includes(s) ||
          v.UNIDADE?.toLowerCase().includes(s) ||
          v.VAGA?.toString().includes(s)
        );
      }
      return true;
    });
  }, [vagas, searchTerm, filterStatus, filterFrozen]);

  const creatorStats = useMemo(() => {
    const stats: Record<string, number> = {};
    baseVagasForStats.filter(v => {
      const unit = normalizeUnit(v.UNIDADE);
      const matchesUnit = selectedUnits.length === 0 || selectedUnits.includes(unit);
      const cargo = normalizeCargo(v.CARGO);
      const matchesCargo = selectedCargos.length === 0 || selectedCargos.includes(cargo);
      return matchesUnit && matchesCargo;
    }).forEach(v => {
      const creator = getVagaCreator(v);
      stats[creator] = (stats[creator] || 0) + 1;
    });
    return Object.entries(stats).sort((a, b) => b[1] - a[1]);
  }, [baseVagasForStats, selectedUnits, selectedCargos]);

  const unitStats = useMemo(() => {
    const stats: Record<string, number> = {};
    baseVagasForStats.filter(v => {
      const creator = getVagaCreator(v);
      const matchesCreator = selectedCreators.length === 0 || selectedCreators.includes(creator);
      const cargo = normalizeCargo(v.CARGO);
      const matchesCargo = selectedCargos.length === 0 || selectedCargos.includes(cargo);
      return matchesCreator && matchesCargo;
    }).forEach(v => {
      const unit = normalizeUnit(v.UNIDADE);
      if (!stats[unit]) stats[unit] = 0;
      stats[unit]++;
    });
    return Object.entries(stats).sort(([a], [b]) => a.localeCompare(b));
  }, [baseVagasForStats, selectedCreators, selectedCargos]);

  const cargoStats = useMemo(() => {
    const stats: Record<string, number> = {};
    baseVagasForStats.filter(v => {
      const unit = normalizeUnit(v.UNIDADE);
      const matchesUnit = selectedUnits.length === 0 || selectedUnits.includes(unit);
      const creator = getVagaCreator(v);
      const matchesCreator = selectedCreators.length === 0 || selectedCreators.includes(creator);
      return matchesUnit && matchesCreator;
    }).forEach(v => {
      const cargo = normalizeCargo(v.CARGO);
      if (!stats[cargo]) stats[cargo] = 0;
      stats[cargo]++;
    });
    return Object.entries(stats).sort((a, b) => b[1] - a[1]);
  }, [baseVagasForStats, selectedUnits, selectedCreators]);

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

  const toggleCargo = (cargo: string) => {
    setSelectedCargos(prev => 
      prev.includes(cargo) ? prev.filter(c => c !== cargo) : [...prev, cargo]
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
    let filtered = baseVagasForStats.filter(v => {
      const unit = normalizeUnit(v.UNIDADE);
      const matchesUnit = selectedUnits.length === 0 || selectedUnits.includes(unit);
      
      const creator = getVagaCreator(v);
      const matchesCreator = selectedCreators.length === 0 || selectedCreators.includes(creator);
      
      const cargo = normalizeCargo(v.CARGO);
      const matchesCargo = selectedCargos.length === 0 || selectedCargos.includes(cargo);
      
      return matchesUnit && matchesCreator && matchesCargo;
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
      // Ordenação padrão alterada para VAGA descendente
      filtered.sort((a, b) => {
          const valA = a.VAGA || 0;
          const valB = b.VAGA || 0;
          return valB - valA;
      });
    }

    return filtered;
  }, [baseVagasForStats, selectedUnits, selectedCreators, selectedCargos, sortConfig]);

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
      <header className="bg-black text-white px-6 py-3.5 flex items-center justify-between shadow-2xl relative z-10">
        <div className="flex items-center space-x-3">
          <div className="bg-[#e31e24] p-1.5 rounded-lg transform -skew-x-12">
            <TrendingUp size={22} className="text-white transform skew-x-12" />
          </div>
          <h1 className="text-xl font-black tracking-tighter uppercase italic">
            REITER<span className="text-[#e31e24]">LOG</span>
          </h1>
          <div className="h-4 w-[1px] bg-gray-700 hidden md:block"></div>
          <p className="text-gray-400 text-[9px] font-bold tracking-[0.25em] uppercase hidden md:block">Portal de Vagas</p>
        </div>
        
        <div className="flex items-center space-x-2.5 md:space-x-3">
          {isAdmin && (
            <>
              <button 
                onClick={onNavigateToAdminVagas}
                className="flex items-center space-x-1.5 bg-white text-black px-3 py-1.5 rounded-xl transition-all font-black text-[9px] uppercase tracking-wider border border-black shadow hover:bg-black hover:text-[#41a900]"
              >
                <Settings size={14} strokeWidth={2.5} />
                <span className="hidden sm:inline">Gestão Global</span>
              </button>
              <button 
                onClick={onNavigateToMetrics}
                className="flex items-center space-x-1.5 bg-white text-black px-3 py-1.5 rounded-xl transition-all font-black text-[9px] uppercase tracking-wider border border-black shadow hover:bg-black hover:text-[#41a900]"
              >
                <PieChart size={14} strokeWidth={2.5} />
                <span className="hidden sm:inline">Métricas</span>
              </button>
              <button 
                onClick={onNavigateToIndicators}
                className="flex items-center space-x-1.5 bg-[#41a900] text-black px-3 py-1.5 rounded-xl transition-all font-black text-[9px] uppercase tracking-wider border border-black shadow hover:bg-white"
              >
                <BarChart2 size={14} strokeWidth={2.5} />
                <span className="hidden sm:inline">Indicadores</span>
              </button>
              <button 
                onClick={onNavigateToUnits}
                className="flex items-center space-x-1.5 bg-gray-800 hover:bg-gray-700 text-[#41a900] px-3 py-1.5 rounded-xl transition-all font-black text-[9px] uppercase tracking-wider border border-gray-700"
              >
                <Map size={14} />
                <span className="hidden sm:inline">Unidades</span>
              </button>
              <button 
                onClick={onNavigateToUsers}
                className="flex items-center space-x-1.5 bg-gray-800 hover:bg-gray-700 text-[#41a900] px-3 py-1.5 rounded-xl transition-all font-black text-[9px] uppercase tracking-wider border border-gray-700"
              >
                <Users size={14} />
                <span className="hidden sm:inline">Usuários</span>
              </button>
            </>
          )}

          <button 
            onClick={handleExport}
            disabled={processedVagas.length === 0}
            className="flex items-center space-x-1.5 bg-[#1b5e20] hover:bg-[#2e7d32] text-white px-3 py-1.5 rounded-xl transition-all font-black text-[9px] uppercase tracking-wider border border-green-600/50 shadow-md active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
            title="Exportar dados filtrados para Excel"
          >
            <Download size={14} strokeWidth={2.5} />
            <span className="hidden sm:inline">Exportar Excel</span>
          </button>

          <div className="flex items-center space-x-2 bg-[#111] px-3 py-1.5 rounded-xl border border-gray-800">
            <ShieldCheck size={14} className={isAllAccess ? "text-[#41a900]" : "text-orange-500"} />
            <div className="text-right">
              <p className="text-[8px] text-gray-500 uppercase font-black tracking-widest leading-none">Acesso</p>
              <p className="font-bold text-white text-[10px] uppercase">
                {isAllAccess ? 'TOTAL' : `${user.unidades?.length || 0} UNID.`}
              </p>
            </div>
          </div>

          <div className="text-right hidden lg:block">
            <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest">Colaborador</p>
            <p className="font-bold text-[#41a900] text-xs">{user.username}</p>
          </div>

          <button 
            onClick={onLogout}
            className="p-2 bg-[#1a1a1a] hover:bg-[#e31e24] hover:text-white rounded-xl transition-all text-[#e31e24] border border-gray-800"
            title="Sair"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-col md:flex-row items-start md:items-center space-y-3 md:space-y-0 md:space-x-3 w-full lg:w-auto">
            <div className="bg-white p-1 rounded-xl flex shrink-0 border-2 border-gray-100 shadow-inner">
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
                  className={`px-3.5 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center space-x-2 ${filterStatus === filter.id ? filter.activeColor + ' shadow-md scale-105' : 'text-gray-400 hover:text-gray-900'}`}
                >
                  <span>{filter.label}</span>
                  <span className={`flex items-center justify-center min-w-[18px] h-4 px-1 rounded-full text-[8px] font-black transition-colors ${filterStatus === filter.id ? filter.badgeColor : 'bg-gray-100 text-gray-400'}`}>
                    {filter.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="bg-white p-1 rounded-xl flex shrink-0 border-2 border-gray-100 shadow-inner">
              {[
                { id: 'not_frozen', label: 'Ativas', icon: <Flame size={12} />, activeColor: 'bg-black text-white' },
                { id: 'frozen', label: 'Congeladas', icon: <Snowflake size={12} />, activeColor: 'bg-blue-600 text-white' }
              ].map((f) => (
                <button 
                  key={f.id}
                  onClick={() => setFilterFrozen(f.id as any)}
                  className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center space-x-1.5 ${filterFrozen === f.id ? f.activeColor + ' shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  {f.icon}
                  <span>{f.label}</span>
                </button>
              ))}
            </div>

            <div className={`relative w-full md:w-72 group transition-all duration-300 ${isSearching ? 'scale-105' : ''}`}>
              <SearchIcon className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${isSearching ? 'text-[#e31e24]' : 'text-gray-400 group-focus-within:text-[#e31e24]'}`} size={16} />
              <input 
                type="text" 
                placeholder="Vaga, Cargo, Gestor, Nomes..."
                className={`w-full pl-10 pr-10 py-2 rounded-xl border-2 outline-none font-bold text-xs uppercase tracking-wider transition-all shadow-sm
                  ${isSearching 
                    ? 'border-[#e31e24] bg-red-50/30 ring-4 ring-red-500/5' 
                    : 'border-gray-200 bg-gray-50/50 focus:border-[#e31e24] focus:bg-white focus:ring-4 focus:ring-red-500/5'}`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {isSearching && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500 hover:text-red-700 transition-colors p-1 hover:bg-red-100 rounded-full"
                  title="Limpar Pesquisa"
                >
                  <X size={14} strokeWidth={3} />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {counts.frozen > 0 && (
              <div className="bg-blue-50 border border-blue-200 px-4 py-2 rounded-xl flex items-center space-x-2.5 shadow-sm animate-pulse">
                <Snowflake size={16} className="text-blue-600" />
                <div>
                  <p className="text-[8px] font-black text-blue-400 uppercase leading-none">Vagas Congeladas</p>
                  <p className="text-base font-black text-blue-700 leading-none mt-0.5">{counts.frozen}</p>
                </div>
              </div>
            )}
            <button 
              onClick={() => setIsNewVagaModalOpen(true)}
              className="bg-[#e31e24] hover:bg-[#c0191e] text-white px-5 py-2.5 rounded-xl flex items-center justify-center font-black text-xs tracking-wider uppercase shadow-[0_6px_15px_-3px_rgba(227,30,36,0.3)] transform transition active:scale-95 space-x-2 w-full lg:w-auto"
            >
              <Plus size={16} strokeWidth={3} />
              <span>Abrir Nova Vaga</span>
            </button>
          </div>
        </div>

        {/* Barra de controle com linha fina vermelha (Recolher) / verde (Expandir) e contador */}
        <div className="pt-1 flex items-center justify-between gap-3">
          <div className="flex items-center space-x-1.5 text-gray-500 shrink-0">
            <Hash size={13} className="text-gray-400" />
            <span className="text-[9px] font-black uppercase tracking-wider">
              Vagas Filtradas: <span className="text-black text-xs font-black ml-0.5">{processedVagas.length}</span>
            </span>
          </div>

          <div className="flex-1 relative flex items-center justify-center">
            <div className={`w-full border-t transition-colors ${isCoinsExpanded ? 'border-red-400' : 'border-[#41a900]'}`}></div>
            <button
              onClick={() => setIsCoinsExpanded(!isCoinsExpanded)}
              className={`absolute px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center space-x-1 transition-all shadow-sm ${
                isCoinsExpanded 
                  ? 'bg-red-50 text-red-600 border border-red-400 hover:bg-red-100 hover:border-red-600' 
                  : 'bg-emerald-50 text-[#41a900] border border-[#41a900] hover:bg-emerald-100'
              }`}
              title={isCoinsExpanded ? 'Recolher filtros de Unidades, Responsáveis e Cargos' : 'Expandir filtros'}
            >
              <span>{isCoinsExpanded ? 'Recolher' : 'Expandir'}</span>
              {isCoinsExpanded ? <ChevronUp size={11} strokeWidth={2.5} /> : <ChevronDown size={11} strokeWidth={2.5} />}
            </button>
          </div>

          {(selectedUnits.length > 0 || selectedCreators.length > 0 || selectedCargos.length > 0) && (
            <button
              onClick={() => {
                setSelectedUnits([]);
                setSelectedCreators([]);
                setSelectedCargos([]);
              }}
              className="text-[8px] font-black uppercase text-red-600 hover:underline shrink-0"
            >
              Limpar Filtros ({selectedUnits.length + selectedCreators.length + selectedCargos.length})
            </button>
          )}
        </div>

        {isCoinsExpanded && (
          <div className="space-y-2 pt-1 animate-in fade-in duration-200">
            {/* Unidades */}
            <div className="flex flex-col space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 text-[9px] font-black text-gray-400 uppercase tracking-wider">
                  <MapPin size={12} className="text-[#e31e24]" />
                  <span>Unidades Operacionais ({filterStatus === 'closed' ? 'Finalizadas' : filterStatus === 'all' ? 'Todas' : filterFrozen === 'frozen' ? 'Vagas Congeladas' : 'Vagas Ativas'}):</span>
                </div>
                {selectedUnits.length > 0 && (
                  <button 
                    onClick={() => setSelectedUnits([])}
                    className="text-[8px] font-black uppercase text-red-600 hover:underline"
                  >
                    Limpar Unidades
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {unitStats.map(([unit, count]) => (
                  <button
                    key={unit}
                    onClick={() => toggleUnit(unit)}
                    className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-tight transition-all border whitespace-nowrap flex items-center space-x-1.5 ${
                      selectedUnits.includes(unit) 
                      ? 'bg-[#41a900] border-black text-black shadow-sm' 
                      : 'bg-white border-gray-200 text-gray-600 hover:border-[#41a900]'
                    }`}
                  >
                    <span>{unit}</span>
                    <span className={`px-1 py-0.2 rounded text-[7px] font-black ${selectedUnits.includes(unit) ? 'bg-black text-[#41a900]' : 'bg-gray-100 text-gray-500'}`}>
                      {count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Responsáveis */}
            <div className="flex flex-col space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 text-[9px] font-black text-gray-400 uppercase tracking-wider">
                  <UserCircle size={12} className="text-[#41a900]" />
                  <span>Responsáveis pela Abertura ({filterStatus === 'closed' ? 'Finalizadas' : filterStatus === 'all' ? 'Todas' : filterFrozen === 'frozen' ? 'Vagas Congeladas' : 'Vagas Ativas'}):</span>
                </div>
                {selectedCreators.length > 0 && (
                  <button 
                    onClick={() => setSelectedCreators([])}
                    className="text-[8px] font-black uppercase text-red-600 hover:underline"
                  >
                    Limpar Criadores
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {creatorStats.map(([creator, count]) => (
                  <button
                    key={creator}
                    onClick={() => toggleCreator(creator)}
                    className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full border transition-all group shrink-0 ${
                      selectedCreators.includes(creator)
                      ? 'bg-black border-black text-white shadow-sm'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-black'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-[8px] uppercase transition-colors ${
                      selectedCreators.includes(creator) ? 'bg-[#41a900] text-black' : 'bg-gray-100 text-gray-400 group-hover:bg-black group-hover:text-[#41a900]'
                    }`}>
                      {creator.substring(0, 2)}
                    </div>
                    <div className="text-left flex items-center space-x-1">
                      <p className="text-[9px] font-black uppercase leading-none">{creator}</p>
                      <span className={`px-1 py-0.2 rounded text-[7px] font-black ${selectedCreators.includes(creator) ? 'bg-[#41a900] text-black' : 'bg-gray-100 text-gray-500'}`}>
                        {count}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Cargos */}
            <div className="flex flex-col space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 text-[9px] font-black text-gray-400 uppercase tracking-wider">
                  <Users size={12} className="text-blue-500" />
                  <span>Cargos ({filterStatus === 'closed' ? 'Finalizadas' : filterStatus === 'all' ? 'Todas' : filterFrozen === 'frozen' ? 'Vagas Congeladas' : 'Vagas Ativas'}):</span>
                </div>
                {selectedCargos.length > 0 && (
                  <button 
                    onClick={() => setSelectedCargos([])}
                    className="text-[8px] font-black uppercase text-red-600 hover:underline"
                  >
                    Limpar Cargos
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {cargoStats.map(([cargo, count]) => (
                  <button
                    key={cargo}
                    onClick={() => toggleCargo(cargo)}
                    className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-tight transition-all border whitespace-nowrap flex items-center space-x-1.5 ${
                      selectedCargos.includes(cargo) 
                      ? 'bg-blue-600 border-black text-white shadow-sm' 
                      : 'bg-white border-gray-200 text-gray-600 hover:border-blue-500'
                    }`}
                  >
                    <span>{cargo}</span>
                    <span className={`px-1 py-0.2 rounded text-[7px] font-black ${selectedCargos.includes(cargo) ? 'bg-black text-blue-400' : 'bg-gray-100 text-gray-500'}`}>
                      {count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <main className="flex-1 px-6 py-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-80 space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e31e24]"></div>
              <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Acessando base de dados...</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[calc(100vh-250px)] overflow-y-auto relative">
              <table className="min-w-full border-separate border-spacing-0">
                <thead className="sticky top-0 z-20 bg-[#fafafa]">
                  <tr>
                    <th onClick={() => handleSort('VAGA')} className="sticky top-0 bg-[#fafafa] z-20 px-4 py-3 text-left text-[9px] font-black text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors border-b-2 border-gray-200">
                      <div className="flex items-center">Vaga {renderSortIcon('VAGA')}</div>
                    </th>
                    <th onClick={() => handleSort('created_at')} className="sticky top-0 bg-[#fafafa] z-20 px-4 py-3 text-left text-[9px] font-black text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors border-b-2 border-gray-200">
                      <div className="flex items-center">Criação {renderSortIcon('created_at')}</div>
                    </th>
                    <th onClick={() => handleSort('UNIDADE')} className="sticky top-0 bg-[#fafafa] z-20 px-4 py-3 text-left text-[9px] font-black text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors border-b-2 border-gray-200">
                      <div className="flex items-center">Unidade / Setor {renderSortIcon('UNIDADE')}</div>
                    </th>
                    <th onClick={() => handleSort('CARGO')} className="sticky top-0 bg-[#fafafa] z-20 px-4 py-3 text-left text-[9px] font-black text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors border-b-2 border-gray-200">
                      <div className="flex items-center">Cargo / Responsáveis {renderSortIcon('CARGO')}</div>
                    </th>
                    <th className="sticky top-0 bg-[#fafafa] z-20 px-4 py-3 text-left text-[9px] font-black text-gray-500 uppercase tracking-wider border-b-2 border-gray-200">
                      Aberto Por
                    </th>
                    <th className="sticky top-0 bg-[#fafafa] z-20 px-4 py-3 text-left text-[9px] font-black text-gray-500 uppercase tracking-wider border-b-2 border-gray-200">
                      Substituído / Contratado
                    </th>
                    <th onClick={() => handleSort('ABERTURA')} className="sticky top-0 bg-[#fafafa] z-20 px-4 py-3 text-left text-[9px] font-black text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors border-b-2 border-gray-200">
                      <div className="flex items-center">Abertura / Dias {renderSortIcon('ABERTURA')}</div>
                    </th>
                    {(filterStatus === 'closed' || filterStatus === 'all') && (
                      <th onClick={() => handleSort('FECHAMENTO')} className="sticky top-0 bg-[#fafafa] z-20 px-4 py-3 text-left text-[9px] font-black text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors border-b-2 border-gray-200">
                        <div className="flex items-center">Fechamento {renderSortIcon('FECHAMENTO')}</div>
                      </th>
                    )}
                    <th onClick={() => handleSort('TIPO')} className="sticky top-0 bg-[#fafafa] z-20 px-4 py-3 text-left text-[9px] font-black text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors border-b-2 border-gray-200">
                      <div className="flex items-center">Status / Tipo {renderSortIcon('TIPO')}</div>
                    </th>
                    <th className="sticky top-0 bg-[#fafafa] z-20 px-4 py-3 text-right text-[9px] font-black text-gray-500 uppercase tracking-wider border-b-2 border-gray-200">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {processedVagas.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-6 py-20 text-center">
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
                          <td className="px-4 py-3 border-b border-gray-100">
                            <span className={`px-2.5 py-1 rounded-md text-[11px] font-black shadow-sm border ${isFrozen ? 'bg-blue-600 text-white border-blue-700' : 'bg-gray-100 text-gray-900 border-gray-200'}`}>
                              {vaga.VAGA || '---'}
                            </span>
                          </td>
                          <td className="px-4 py-3 border-b border-gray-100">
                             <div className="flex flex-col">
                                 <span className="text-xs font-black text-gray-900">{new Date(vaga.created_at).toLocaleDateString('pt-BR')}</span>
                                 <span className="text-[10px] font-bold text-gray-400">{new Date(vaga.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</span>
                             </div>
                          </td>
                          <td className="px-4 py-3 border-b border-gray-100">
                            <div className="text-xs font-black text-black uppercase tracking-tight">{vaga.UNIDADE}</div>
                            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">{vaga.SETOR}</div>
                          </td>
                          <td className="px-4 py-3 border-b border-gray-100">
                            <div className={`text-xs font-bold uppercase italic ${isFrozen ? 'text-blue-700' : 'text-[#e31e24]'}`}>{vaga.CARGO}</div>
                            <div className="text-[9px] text-gray-500 font-black uppercase">GEST: {vaga.GESTOR}</div>
                            <div className="text-[9px] text-gray-400 font-bold uppercase italic">GER: {vaga.GERENTE || '---'}</div>
                          </td>
                          <td className="px-4 py-3 border-b border-gray-100">
                            <div className="text-[10px] font-black text-gray-900 uppercase">
                              {getVagaCreator(vaga)}
                            </div>
                          </td>
                          <td className="px-4 py-3 border-b border-gray-100">
                            <div className="space-y-0.5">
                              {vaga.NOME_SUBSTITUIDO && (
                                <div className="flex items-center space-x-1.5 text-[9px] font-bold text-gray-600 uppercase">
                                  <UserMinus size={11} className="text-gray-400" />
                                  <span>Subst: <span className="text-black font-black">{vaga.NOME_SUBSTITUIDO}</span></span>
                                </div>
                              )}
                              {vaga.NOME_SUBSTITUICAO && (
                                <div className="flex items-center space-x-1.5 text-[9px] font-bold text-green-700 uppercase">
                                  <UserPlus size={11} className="text-green-500" />
                                  <span>Contr: <span className="text-green-900 font-black">{vaga.NOME_SUBSTITUICAO}</span></span>
                                </div>
                              )}
                              {!vaga.NOME_SUBSTITUIDO && !vaga.NOME_SUBSTITUICAO && (
                                <span className="text-[9px] text-gray-300 italic">Nenhum registro</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 border-b border-gray-100">
                            <div className="flex items-center space-x-1.5 text-gray-700">
                              <Clock size={12} className="text-gray-300" />
                              <span className="text-xs font-bold">{new Date(vaga.ABERTURA).toLocaleDateString('pt-BR')}</span>
                            </div>
                            <div className={`text-[9px] font-black mt-0.5 ${calculateDaysOpen(vaga.ABERTURA, vaga.FECHAMENTO) > 30 ? 'text-orange-500' : 'text-gray-400'}`}>
                              {calculateDaysOpen(vaga.ABERTURA, vaga.FECHAMENTO)} DIAS
                            </div>
                          </td>
                          {(filterStatus === 'closed' || filterStatus === 'all') && (
                            <td className="px-4 py-3 border-b border-gray-100">
                              {vaga.FECHAMENTO ? (
                                <div className="flex items-center space-x-1.5 text-green-700">
                                  <CheckCircle size={12} className="text-green-400" />
                                  <span className="text-xs font-bold">{new Date(vaga.FECHAMENTO).toLocaleDateString('pt-BR')}</span>
                                </div>
                              ) : (
                                <span className="text-[9px] text-gray-300 italic font-bold">ATIVA</span>
                              )}
                            </td>
                          )}
                          <td className="px-4 py-3 border-b border-gray-100">
                            <div className="flex flex-col space-y-1">
                              {vaga.FECHAMENTO ? (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-green-50 text-green-700 text-[9px] font-black uppercase tracking-wider border border-green-100 w-fit">
                                  <CheckCircle size={9} />
                                  <span>Finalizada</span>
                                </span>
                              ) : isFrozen ? (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[9px] font-black uppercase tracking-wider border border-blue-200 w-fit">
                                  <Snowflake size={9} />
                                  <span>Congelada</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 text-[9px] font-black uppercase tracking-wider border border-orange-100 w-fit">
                                  <AlertCircle size={9} />
                                  <span>Em Aberto</span>
                                </span>
                              )}
                              <span className="text-[8px] font-black text-gray-400 uppercase ml-0.5 italic">{vaga.TIPO}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 border-b border-gray-100 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              {!vaga.FECHAMENTO && !hasCreator && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setVagaToAssignCreator(vaga);
                                  }}
                                  className="p-1.5 bg-[#41a900] text-black rounded-lg hover:bg-black hover:text-[#41a900] transition-all animate-pulse shadow border border-black/10"
                                  title="Assumir Vaga como Criador"
                                >
                                  <UserPlus size={15} strokeWidth={2.5} />
                                </button>
                              )}
                              <button className="p-1.5 text-gray-300 group-hover:text-black transition-colors" title="Visualizar Detalhes">
                                <Eye size={16} />
                              </button>
                              {!vaga.FECHAMENTO && !vaga.CONGELADA && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedVagaForClosing(vaga);
                                  }}
                                  className="bg-black hover:bg-[#e31e24] text-white px-3.5 py-1.5 rounded-lg transition-all shadow text-[9px] font-black uppercase tracking-wider active:scale-95"
                                >
                                  Finalizar
                                </button>
                              )}
                              {isFrozen && (
                                <div className="p-1.5 text-blue-400 cursor-not-allowed" title="Vaga Congelada - Descongele para finalizar">
                                  <Lock size={16} />
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
