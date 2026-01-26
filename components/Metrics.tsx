
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabase';
import { Vaga, User } from '../types';
import { 
  ArrowLeft, 
  Calendar, 
  Filter, 
  PieChart, 
  ChevronRight, 
  ChevronDown, 
  Loader2,
  List,
  User as UserIcon,
  Briefcase,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

interface MetricsProps {
  user: User;
  onBack: () => void;
}

type DateField = 'created_at' | 'FECHAMENTO';
type FilterOpenType = 'all_in_period' | 'only_open';

const Metrics: React.FC<MetricsProps> = ({ user, onBack }) => {
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [dateField, setDateField] = useState<DateField>('created_at');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterOpenType, setFilterOpenType] = useState<FilterOpenType>('all_in_period');

  // Estado de expansão (keys: "YYYY-MM-DD", "YYYY-MM-DD|CARGO", etc)
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  const fetchData = async () => {
    setLoading(true);
    // Adicionado .limit(5000) para garantir que traga todos os registros se houver muitas vagas criadas em lote
    const { data, error } = await supabase
        .from('vagas')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5000); 

    if (!error && data) {
      setVagas(data);
    } else if (error) {
      console.error("Erro ao buscar vagas para métricas:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleExpand = (key: string) => {
    const newSet = new Set(expandedKeys);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setExpandedKeys(newSet);
  };

  const groupedData = useMemo(() => {
    const tree: any = {};
    let totalFiltered = 0;
    
    // Preparar datas de filtro (Início do dia Start e Fim do dia End)
    const startObj = new Date(`${startDate}T00:00:00`);
    const endObj = new Date(`${endDate}T23:59:59.999`);

    // Filtrar e Agrupar
    vagas.forEach(v => {
        // 1. Verificação de existência da data alvo
        const dateVal = v[dateField];
        if (!dateVal) return; // Pula se não tiver a data (ex: filtrando fechamento de vaga aberta)

        // 2. Conversão correta para objeto Date para comparação
        const recordDate = new Date(dateVal);

        // 3. Filtro de Período (Comparação de Timestamp)
        if (recordDate < startObj || recordDate > endObj) return;

        // 4. Filtro de Escopo (Apenas Abertas vs Todas)
        if (filterOpenType === 'only_open') {
            if (v.FECHAMENTO) return; // Se quer apenas abertas, ignora as fechadas
        }

        // --- Passou nos filtros ---
        totalFiltered++;

        // Definir a chave do dia baseada na DATA LOCAL (YYYY-MM-DD)
        // O uso de split('T') no ISO String pegava a data UTC, causando erro de dia.
        // Usamos toLocaleDateString com 'en-CA' para obter formato YYYY-MM-DD local.
        const year = recordDate.getFullYear();
        const month = String(recordDate.getMonth() + 1).padStart(2, '0');
        const dayOfMonth = String(recordDate.getDate()).padStart(2, '0');
        const dayKey = `${year}-${month}-${dayOfMonth}`;

        if (!tree[dayKey]) tree[dayKey] = { count: 0, items: [], cargos: {} };
        
        tree[dayKey].count++;
        tree[dayKey].items.push(v);

        // Nível Cargo
        const cargo = v.CARGO || 'SEM CARGO';
        if (!tree[dayKey].cargos[cargo]) tree[dayKey].cargos[cargo] = { count: 0, items: [], gerentes: {} };
        tree[dayKey].cargos[cargo].count++;
        tree[dayKey].cargos[cargo].items.push(v);

        // Nível Gerente
        const gerente = v.GERENTE || 'SEM GERENTE';
        if (!tree[dayKey].cargos[cargo].gerentes[gerente]) tree[dayKey].cargos[cargo].gerentes[gerente] = { count: 0, items: [], gestores: {} };
        tree[dayKey].cargos[cargo].gerentes[gerente].count++;
        tree[dayKey].cargos[cargo].gerentes[gerente].items.push(v);

        // Nível Gestor
        const gestor = v.GESTOR || 'SEM GESTOR';
        if (!tree[dayKey].cargos[cargo].gerentes[gerente].gestores[gestor]) tree[dayKey].cargos[cargo].gerentes[gerente].gestores[gestor] = { count: 0, items: [] };
        tree[dayKey].cargos[cargo].gerentes[gerente].gestores[gestor].count++;
        tree[dayKey].cargos[cargo].gerentes[gerente].gestores[gestor].items.push(v);
    });

    // Ordenar chaves (dias) decrescente
    const sortedDays = Object.keys(tree).sort((a, b) => b.localeCompare(a));
    
    return { tree, sortedDays, totalFiltered };
  }, [vagas, dateField, startDate, endDate, filterOpenType]);

  const formatDate = (dateStr: string) => {
      // dateStr é YYYY-MM-DD
      const parts = dateStr.split('-');
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  return (
    <div className="min-h-screen bg-[#f1f3f5] flex flex-col font-sans">
      <header className="bg-black text-white px-8 py-6 flex items-center justify-between shadow-2xl relative z-10 border-b-4 border-[#e31e24]">
        <div className="flex items-center space-x-5">
          <button onClick={onBack} className="p-3 hover:bg-gray-800 rounded-2xl transition-all text-[#41a900] active:scale-90">
            <ArrowLeft size={28} strokeWidth={3} />
          </button>
          <div className="bg-[#e31e24] p-3 rounded-xl transform -skew-x-12">
            <PieChart size={28} className="text-white transform skew-x-12" strokeWidth={3} />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter uppercase italic leading-none">
              MÉTRICAS <span className="text-[#41a900]">ANALÍTICAS</span>
            </h1>
            <p className="text-[10px] font-black text-[#41a900] uppercase tracking-[0.4em] mt-1 opacity-80 italic">Detalhamento Diário</p>
          </div>
        </div>
        <div>
           <button 
             onClick={fetchData}
             disabled={loading}
             className="p-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-all disabled:opacity-50"
             title="Recarregar Dados"
           >
             <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
           </button>
        </div>
      </header>

      <main className="flex-1 p-8 lg:p-12 space-y-8">
        {/* BARRA DE FILTROS */}
        <div className="bg-white p-6 rounded-3xl shadow-xl border-2 border-gray-100 flex flex-col md:flex-row md:items-end gap-6">
            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest block ml-1">Período Base</label>
                <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button 
                        onClick={() => setDateField('created_at')}
                        className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${dateField === 'created_at' ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:text-black'}`}
                    >
                        Data Criação
                    </button>
                    <button 
                        onClick={() => setDateField('FECHAMENTO')}
                        className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${dateField === 'FECHAMENTO' ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:text-black'}`}
                    >
                        Data Fechamento
                    </button>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest block ml-1">Intervalo</label>
                <div className="flex items-center space-x-2 bg-gray-50 border-2 border-gray-100 rounded-xl px-2">
                    <input 
                        type="date" 
                        value={startDate} 
                        onChange={(e) => setStartDate(e.target.value)}
                        className="bg-transparent py-3 px-2 font-black text-sm outline-none text-gray-700 uppercase"
                    />
                    <span className="text-gray-300">|</span>
                    <input 
                        type="date" 
                        value={endDate} 
                        onChange={(e) => setEndDate(e.target.value)}
                        className="bg-transparent py-3 px-2 font-black text-sm outline-none text-gray-700 uppercase"
                    />
                </div>
            </div>

            <div className="space-y-2 flex-1">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest block ml-1">Considerar Vagas</label>
                <div className="flex bg-gray-100 p-1 rounded-xl w-fit">
                    <button 
                        onClick={() => setFilterOpenType('all_in_period')}
                        className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all flex items-center space-x-2 ${filterOpenType === 'all_in_period' ? 'bg-[#e31e24] text-white shadow-md' : 'text-gray-500 hover:text-black'}`}
                    >
                        <List size={14} />
                        <span>Todas do Período</span>
                    </button>
                    <button 
                        onClick={() => setFilterOpenType('only_open')}
                        className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all flex items-center space-x-2 ${filterOpenType === 'only_open' ? 'bg-[#41a900] text-black shadow-md' : 'text-gray-500 hover:text-black'}`}
                    >
                        <AlertCircle size={14} />
                        <span>Apenas Abertas (Ativas)</span>
                    </button>
                </div>
            </div>

            <div className="hidden md:block">
                <div className="bg-black text-white px-6 py-4 rounded-2xl shadow-lg">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#41a900]">Total Filtrado</p>
                    <p className="text-3xl font-black italic leading-none">{groupedData.totalFiltered}</p>
                </div>
            </div>
        </div>

        {/* LISTA HIERÁRQUICA */}
        <div className="space-y-4">
            {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#e31e24]" size={40} /></div>
            ) : groupedData.sortedDays.length === 0 ? (
                <div className="text-center py-20 opacity-50 font-black uppercase tracking-widest text-gray-400">Nenhum registro encontrado no período selecionado.</div>
            ) : (
                groupedData.sortedDays.map(day => {
                    const dayData = groupedData.tree[day];
                    const isDayExpanded = expandedKeys.has(day);

                    return (
                        <div key={day} className="bg-white rounded-[30px] border-2 border-gray-100 shadow-lg overflow-hidden transition-all">
                            {/* NÍVEL 1: DIA */}
                            <div 
                                onClick={() => toggleExpand(day)}
                                className="bg-gray-900 hover:bg-black text-white p-5 cursor-pointer flex items-center justify-between transition-colors"
                            >
                                <div className="flex items-center space-x-4">
                                    <Calendar size={20} className="text-[#41a900]" />
                                    <span className="text-lg font-black uppercase tracking-widest italic">{formatDate(day)}</span>
                                </div>
                                <div className="flex items-center space-x-4">
                                    <span className="bg-[#e31e24] px-3 py-1 rounded-full text-xs font-black text-white">{dayData.count} Vagas</span>
                                    <ChevronRight size={20} className={`transition-transform duration-300 ${isDayExpanded ? 'rotate-90' : ''}`} />
                                </div>
                            </div>

                            {/* CONTEÚDO DO DIA */}
                            {isDayExpanded && (
                                <div className="p-6 space-y-4 bg-gray-50">
                                    {Object.keys(dayData.cargos).sort().map(cargo => {
                                        const cargoKey = `${day}|${cargo}`;
                                        const cargoData = dayData.cargos[cargo];
                                        const isCargoExpanded = expandedKeys.has(cargoKey);

                                        return (
                                            <div key={cargoKey} className="bg-white border-2 border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                                                {/* NÍVEL 2: CARGO */}
                                                <div 
                                                    onClick={() => toggleExpand(cargoKey)}
                                                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                                                >
                                                    <div className="flex items-center space-x-3">
                                                        <Briefcase size={18} className="text-gray-400" />
                                                        <span className="text-sm font-black uppercase text-gray-800">{cargo}</span>
                                                    </div>
                                                    <div className="flex items-center space-x-3">
                                                        <span className="text-xs font-bold text-gray-500">{cargoData.count}</span>
                                                        <ChevronRight size={16} className={`text-gray-300 transition-transform ${isCargoExpanded ? 'rotate-90' : ''}`} />
                                                    </div>
                                                </div>

                                                {/* NÍVEL 3: GERENTE */}
                                                {isCargoExpanded && (
                                                    <div className="border-t border-gray-100 bg-gray-50/50">
                                                        {Object.keys(cargoData.gerentes).sort().map(gerente => {
                                                            const gerenteKey = `${cargoKey}|${gerente}`;
                                                            const gerenteData = cargoData.gerentes[gerente];
                                                            const isGerenteExpanded = expandedKeys.has(gerenteKey);

                                                            return (
                                                                <div key={gerenteKey} className="border-b border-gray-100 last:border-0">
                                                                    <div 
                                                                        onClick={() => toggleExpand(gerenteKey)}
                                                                        className="p-3 pl-10 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
                                                                    >
                                                                        <div className="flex items-center space-x-3">
                                                                            <ShieldCheck size={16} className="text-blue-400" />
                                                                            <span className="text-xs font-black uppercase text-gray-600">Gerente: {gerente}</span>
                                                                        </div>
                                                                        <div className="flex items-center space-x-3">
                                                                            <span className="text-[10px] font-bold text-gray-400">{gerenteData.count}</span>
                                                                            <ChevronRight size={14} className={`text-gray-300 transition-transform ${isGerenteExpanded ? 'rotate-90' : ''}`} />
                                                                        </div>
                                                                    </div>

                                                                    {/* NÍVEL 4: GESTOR E ITENS */}
                                                                    {isGerenteExpanded && (
                                                                        <div className="bg-gray-100/50 py-2">
                                                                            {Object.keys(gerenteData.gestores).sort().map(gestor => {
                                                                                const gestorData = gerenteData.gestores[gestor];
                                                                                
                                                                                return (
                                                                                    <div key={gestor} className="mb-2 last:mb-0">
                                                                                        <div className="px-14 py-2 flex items-center space-x-2">
                                                                                            <UserIcon size={14} className="text-[#41a900]" />
                                                                                            <span className="text-[10px] font-black uppercase text-gray-500">Gestor: {gestor}</span>
                                                                                            <span className="bg-white px-2 rounded-full text-[9px] font-bold border border-gray-200">{gestorData.count}</span>
                                                                                        </div>
                                                                                        <div className="px-14 space-y-2">
                                                                                            {gestorData.items.map((v: Vaga) => (
                                                                                                <div key={v.id} className="bg-white p-3 rounded-xl border border-gray-200 flex items-center justify-between shadow-sm ml-6 hover:border-black transition-colors">
                                                                                                    <div className="flex items-center space-x-3">
                                                                                                        <span className="text-[10px] font-black bg-gray-100 px-2 py-1 rounded text-gray-500">#{v.VAGA || v.id}</span>
                                                                                                        <span className="text-xs font-bold text-gray-800 uppercase">{v.UNIDADE}</span>
                                                                                                        {v.TIPO === 'Aumento de Quadro' ? (
                                                                                                            <span className="text-[9px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100 uppercase">Aumento</span>
                                                                                                        ) : (
                                                                                                            <span className="text-[9px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-100 uppercase">Substituição</span>
                                                                                                        )}
                                                                                                    </div>
                                                                                                    <div className="flex items-center space-x-3">
                                                                                                        {v.FECHAMENTO ? (
                                                                                                            <div className="flex items-center space-x-1 text-green-600">
                                                                                                                <CheckCircle size={12} />
                                                                                                                <span className="text-[9px] font-black uppercase">Fechada</span>
                                                                                                            </div>
                                                                                                        ) : (
                                                                                                            <div className="flex items-center space-x-1 text-orange-500">
                                                                                                                <AlertCircle size={12} />
                                                                                                                <span className="text-[9px] font-black uppercase">Aberta</span>
                                                                                                            </div>
                                                                                                        )}
                                                                                                    </div>
                                                                                                </div>
                                                                                            ))}
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })
            )}
        </div>
      </main>
    </div>
  );
};

export default Metrics;
