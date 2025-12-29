
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { Vaga, User } from '../types';
import { 
  ArrowLeft, Search, Edit, Trash2, X, Save, 
  Settings, Filter, Loader2, 
  AlertTriangle, CheckSquare, Square, Layers, 
  ChevronDown, Play, Snowflake, ToggleLeft, ToggleRight,
  UserCheck, UserPlus, Hash
} from 'lucide-react';

interface AdminManagementProps {
  user: User;
  onBack: () => void;
}

const AdminManagement: React.FC<AdminManagementProps> = ({ user, onBack }) => {
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [unidades, setUnidades] = useState<any[]>([]);
  const [allSetores, setAllSetores] = useState<string[]>([]);
  const [allGestores, setAllGestores] = useState<string[]>([]);
  const [allTiposCargo, setAllTiposCargo] = useState<string[]>([]);
  const [allCargos, setAllCargos] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  
  // Filter states
  const [searchDraft, setSearchDraft] = useState('');
  const [statusDraft, setStatusDraft] = useState<'all' | 'open' | 'closed'>('all');
  const [frozenDraft, setFrozenDraft] = useState<'all' | 'frozen' | 'not_frozen'>('all');
  const [creatorDraft, setCreatorDraft] = useState<string>('all');
  const [fechadorDraft, setFechadorDraft] = useState<string>('all');
  const [unidadeDraft, setUnidadeDraft] = useState<string>('all');
  const [setorDraft, setSetorDraft] = useState<string>('all');
  const [gestorDraft, setGestorDraft] = useState<string>('all');
  const [tipoCargoDraft, setTipoCargoDraft] = useState<string>('all');
  const [cargoSpecificDraft, setCargoSpecificDraft] = useState<string>('all');
  
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(true);

  // Modal states
  const [selectedVaga, setSelectedVaga] = useState<Vaga | null>(null);
  const [vagaToDelete, setVagaToDelete] = useState<Vaga | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [isBulkConfirmOpen, setIsBulkConfirmOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Bulk Edit states
  const [bulkField, setBulkField] = useState<string>('usuário_criador');
  const [bulkValue, setBulkValue] = useState<string>('');

  // Form state for single edit
  const [editFormData, setEditFormData] = useState<Partial<Vaga>>({});

  const fetchMetadata = async () => {
    const [profilesRes, unitsRes, metadataRes] = await Promise.all([
      supabase.from('profiles').select('username, full_name'),
      supabase.from('unidades').select('nome'),
      supabase.from('vagas').select('SETOR, GESTOR, TIPO_CARGO, CARGO')
    ]);

    if (!profilesRes.error) setProfiles(profilesRes.data || []);
    if (!unitsRes.error) setUnidades(unitsRes.data || []);
    
    if (!metadataRes.error && metadataRes.data) {
      const setores = Array.from(new Set(metadataRes.data.map(v => v.SETOR))).filter(Boolean).sort() as string[];
      const gestores = Array.from(new Set(metadataRes.data.map(v => v.GESTOR))).filter(Boolean).sort() as string[];
      const tiposCargo = Array.from(new Set(metadataRes.data.map(v => v.TIPO_CARGO))).filter(Boolean).sort() as string[];
      const cargos = Array.from(new Set(metadataRes.data.map(v => v.CARGO))).filter(Boolean).sort() as string[];
      
      setAllSetores(setores);
      setAllGestores(gestores);
      setAllTiposCargo(tiposCargo);
      setAllCargos(cargos);
    }
  };

  const handleSearch = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    else setSearching(true);

    try {
      let query = supabase.from('vagas').select('*').order('created_at', { ascending: false });

      if (isInitial && !searchDraft && statusDraft === 'all' && frozenDraft === 'all' && unidadeDraft === 'all') {
        query = query.limit(100);
      } else {
        if (statusDraft === 'open') query = query.is('FECHAMENTO', null);
        if (statusDraft === 'closed') query = query.not('FECHAMENTO', 'is', null);

        if (frozenDraft === 'frozen') query = query.eq('CONGELADA', true);
        if (frozenDraft === 'not_frozen') query = query.eq('CONGELADA', false);

        if (creatorDraft !== 'all') query = query.eq('usuário_criador', creatorDraft);
        if (fechadorDraft !== 'all') query = query.eq('usuario_fechador', fechadorDraft);
        if (unidadeDraft !== 'all') query = query.eq('UNIDADE', unidadeDraft);
        if (setorDraft !== 'all') query = query.eq('SETOR', setorDraft);
        if (gestorDraft !== 'all') query = query.eq('GESTOR', gestorDraft);
        if (tipoCargoDraft !== 'all') query = query.eq('TIPO_CARGO', tipoCargoDraft);
        if (cargoSpecificDraft !== 'all') query = query.eq('CARGO', cargoSpecificDraft);

        if (searchDraft) {
          const s = searchDraft.trim();
          const isNumeric = /^\d+$/.test(s);
          
          let orFilter = `CARGO.ilike.%${s}%,UNIDADE.ilike.%${s}%,SETOR.ilike.%${s}%,GESTOR.ilike.%${s}%`;
          if (isNumeric) {
            orFilter += `,VAGA.eq.${s}`;
          }
          query = query.or(orFilter);
        }
      }

      const { data, error } = await query;
      if (!error) {
        setVagas(data || []);
      }
    } catch (err) {
      console.error('Erro na busca:', err);
    } finally {
      setLoading(false);
      setSearching(false);
    }
  }, [searchDraft, statusDraft, frozenDraft, creatorDraft, fechadorDraft, unidadeDraft, setorDraft, gestorDraft, tipoCargoDraft, cargoSpecificDraft]);

  useEffect(() => {
    fetchMetadata();
    handleSearch(true);
  }, []);

  const toggleSelectAll = () => {
    if (selectedIds.length === vagas.length && vagas.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(vagas.map(v => v.id));
    }
  };

  const toggleSelectRow = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleEdit = (vaga: Vaga) => {
    setSelectedVaga(vaga);
    setEditFormData({ ...vaga });
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (vaga: Vaga) => {
    setVagaToDelete(vaga);
  };

  const confirmDelete = async () => {
    if (!vagaToDelete) return;
    setLoading(true);
    const { error } = await supabase.from('vagas').delete().eq('id', vagaToDelete.id);
    if (error) {
      alert('Erro ao excluir: ' + error.message);
      setLoading(false);
    } else {
      setVagaToDelete(null);
      handleSearch(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVaga) return;

    setFormLoading(true);
    const logs: string[] = [];
    const dateStr = new Date().toLocaleDateString('pt-BR');
    const fieldsToCompare: (keyof Vaga)[] = [
      'CARGO', 'UNIDADE', 'SETOR', 'GESTOR', 'GERENTE', 
      'TIPO', 'TIPO_CARGO', 'NOME_SUBSTITUIDO', 'NOME_SUBSTITUICAO', 
      'usuário_criador', 'RECRUTADOR', 'VAGA', 'CONGELADA', 'usuario_fechador'
    ];

    fieldsToCompare.forEach(field => {
      const oldVal = selectedVaga[field];
      const newVal = (editFormData as any)[field];
      if (oldVal !== newVal) {
        logs.push(`${dateStr} [AUDIT/ADMIN]: ${user.username} alterou ${field} de "${oldVal ?? 'VAZIO'}" para "${newVal ?? 'VAZIO'}"`);
      }
    });

    const updatedObservations = [...(selectedVaga.OBSERVACOES || []), ...logs];
    const { error } = await supabase
      .from('vagas')
      .update({
        ...editFormData,
        OBSERVACOES: updatedObservations
      })
      .eq('id', selectedVaga.id);

    if (error) {
      alert('Erro ao atualizar: ' + error.message);
      setFormLoading(false);
    } else {
      setIsEditModalOpen(false);
      setFormLoading(false);
      handleSearch(false);
    }
  };

  const handleBulkUpdate = async () => {
    setFormLoading(true);
    const dateStr = new Date().toLocaleDateString('pt-BR');
    
    try {
      for (const id of selectedIds) {
        const currentVaga = vagas.find(v => v.id === id);
        if (!currentVaga) continue;

        const isFreezeField = bulkField === 'CONGELADA';
        const newVal = isFreezeField ? bulkValue === 'true' : bulkValue;
        
        const log = `${dateStr} [AUDIT/BULK]: ${user.username} alterou ${bulkField} de "${(currentVaga as any)[bulkField]}" para "${newVal}" em massa.`;
        const updatedObservations = [...(currentVaga.OBSERVACOES || []), log];

        const updatePayload: any = {
          [bulkField]: newVal,
          OBSERVACOES: updatedObservations
        };

        const { error } = await supabase.from('vagas').update(updatePayload).eq('id', id);
        if (error) throw error;
      }

      setIsBulkConfirmOpen(false);
      setIsBulkEditModalOpen(false);
      setSelectedIds([]);
      setFormLoading(false);
      handleSearch(false);
    } catch (err: any) {
      alert('Erro ao realizar atualização em massa: ' + err.message);
      setFormLoading(false);
    }
  };

  const inputStyle = "w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-black focus:bg-white outline-none font-bold text-[11px] uppercase transition-all appearance-none cursor-pointer";

  return (
    <div className="min-h-screen bg-[#f1f3f5] flex flex-col font-sans">
      <header className="bg-black text-white px-8 py-6 flex items-center justify-between shadow-2xl relative z-10 border-b-4 border-[#e31e24]">
        <div className="flex items-center space-x-5">
          <button onClick={onBack} className="p-3 hover:bg-gray-800 rounded-2xl transition-all text-[#41a900] active:scale-90">
            <ArrowLeft size={28} strokeWidth={3} />
          </button>
          <div className="bg-[#e31e24] p-3 rounded-xl transform -skew-x-12">
            <Settings size={28} className="text-white transform skew-x-12" strokeWidth={3} />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter uppercase italic leading-none">
              GESTÃO <span className="text-[#e31e24]">GLOBAL</span> DE VAGAS
            </h1>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] mt-1 opacity-80 italic">Painel do Administrador</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
           {selectedIds.length > 0 && (
             <button 
               onClick={() => {
                 setBulkValue('');
                 setIsBulkEditModalOpen(true);
               }}
               className="bg-[#41a900] text-black px-6 py-3 rounded-xl flex items-center space-x-3 font-black text-xs uppercase tracking-widest hover:bg-white transition-all shadow-lg animate-bounce"
             >
               <Layers size={18} />
               <span>Alteração em Bloco ({selectedIds.length})</span>
             </button>
           )}
           <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-right">
              <p className="text-[9px] font-black text-gray-500 uppercase">Administrador</p>
              <p className="text-xs font-black text-[#41a900]">{user.username}</p>
           </div>
        </div>
      </header>

      <main className="flex-1 p-8 lg:p-12 space-y-6">
        {/* PAINEL DE FILTROS REESTILIZADO EM GRID */}
        <div className="bg-white rounded-[30px] shadow-xl p-8 border-2 border-gray-100 relative overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <Filter className="text-[#e31e24]" size={24} />
              <h2 className="text-lg font-black uppercase italic tracking-tighter">Filtros Avançados</h2>
              <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest bg-gray-50 px-3 py-1 rounded-full border">Pressione Enter para buscar</span>
            </div>
            <button 
              onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
              className="text-[10px] font-black uppercase text-gray-400 hover:text-black flex items-center space-x-2"
            >
              <span>{isFilterPanelOpen ? 'Recolher' : 'Expandir'}</span>
              <ChevronDown className={`transition-transform duration-300 ${isFilterPanelOpen ? 'rotate-180' : ''}`} size={16} />
            </button>
          </div>

          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 transition-all duration-300 ${isFilterPanelOpen ? 'opacity-100 max-h-[1000px]' : 'opacity-0 max-h-0 overflow-hidden'}`}>
            {/* LINHA 1 */}
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#e31e24]" size={16} />
              <input 
                type="text" 
                placeholder="BUSCAR TERMO OU Nº VAGA..."
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-black focus:bg-white outline-none font-bold text-[11px] uppercase transition-all"
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch(false)}
              />
            </div>
            
            <select className={inputStyle} value={statusDraft} onChange={(e) => setStatusDraft(e.target.value as any)}>
              <option value="all">STATUS: TODOS</option>
              <option value="open">STATUS: ABERTAS</option>
              <option value="closed">STATUS: FECHADAS</option>
            </select>

            <select className={inputStyle} value={frozenDraft} onChange={(e) => setFrozenDraft(e.target.value as any)}>
              <option value="all">FLUXO: TODOS</option>
              <option value="frozen">FLUXO: CONGELADAS</option>
              <option value="not_frozen">FLUXO: ATIVAS</option>
            </select>

            <select className={inputStyle} value={tipoCargoDraft} onChange={(e) => setTipoCargoDraft(e.target.value)}>
              <option value="all">TIPO CARGO: TODOS</option>
              {allTiposCargo.map(tc => <option key={tc} value={tc}>{tc.toUpperCase()}</option>)}
            </select>

            {/* LINHA 2 */}
            <select className={inputStyle} value={cargoSpecificDraft} onChange={(e) => setCargoSpecificDraft(e.target.value)}>
              <option value="all">CARGO: TODOS</option>
              {allCargos.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
            </select>

            <select className={inputStyle} value={creatorDraft} onChange={(e) => setCreatorDraft(e.target.value)}>
              <option value="all">CRIADOR: TODOS</option>
              {profiles.map(p => <option key={p.username} value={p.username}>{p.username.toUpperCase()}</option>)}
            </select>

            <select className={inputStyle} value={fechadorDraft} onChange={(e) => setFechadorDraft(e.target.value)}>
              <option value="all">FECHADOR: TODOS</option>
              {profiles.map(p => <option key={p.username} value={p.username}>{p.username.toUpperCase()}</option>)}
            </select>

            <select className={inputStyle} value={unidadeDraft} onChange={(e) => setUnidadeDraft(e.target.value)}>
              <option value="all">UNIDADE: TODAS</option>
              {unidades.map(u => <option key={u.nome} value={u.nome}>{u.nome.toUpperCase()}</option>)}
            </select>

            {/* LINHA 3 */}
            <select className={inputStyle} value={setorDraft} onChange={(e) => setSetorDraft(e.target.value)}>
              <option value="all">SETOR: TODOS</option>
              {allSetores.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
            </select>

            <select className={inputStyle} value={gestorDraft} onChange={(e) => setGestorDraft(e.target.value)}>
              <option value="all">GESTOR: TODOS</option>
              {allGestores.map(g => <option key={g} value={g}>{g.toUpperCase()}</option>)}
            </select>

            <div className="lg:col-span-2 flex justify-end">
               <button 
                 onClick={() => handleSearch(false)}
                 disabled={searching}
                 className="bg-black text-[#41a900] px-12 py-3 rounded-xl flex items-center space-x-3 font-black text-[11px] uppercase tracking-[0.2em] hover:bg-[#e31e24] hover:text-white transition-all shadow-xl active:scale-95 disabled:opacity-50"
               >
                 {searching ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} fill="currentColor" />}
                 <span>Filtrar Resultados</span>
               </button>
            </div>
          </div>
        </div>

        {/* TABELA DE RESULTADOS COM COLUNAS SEPARADAS */}
        <div className="bg-white rounded-[40px] shadow-2xl border-2 border-gray-100 overflow-hidden relative">
          {loading && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center space-y-4">
              <Loader2 className="animate-spin text-[#e31e24]" size={48} />
              <p className="font-black uppercase tracking-widest text-[10px] text-black">Sincronizando registros...</p>
            </div>
          )}
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-black text-white">
                  <th className="px-6 py-6 border-r border-white/5 w-12 text-center">
                    <button onClick={toggleSelectAll} className="text-[#41a900] hover:scale-110 transition-transform">
                      {selectedIds.length === vagas.length && vagas.length > 0 ? <CheckSquare size={20} /> : <Square size={20} />}
                    </button>
                  </th>
                  <th className="px-6 py-6 text-[11px] font-black uppercase tracking-widest border-r border-white/5 w-24">ID/Vaga</th>
                  <th className="px-8 py-6 text-[11px] font-black uppercase tracking-widest border-r border-white/5">Cargo / Unidade</th>
                  <th className="px-8 py-6 text-[11px] font-black uppercase tracking-widest border-r border-white/5">Criador</th>
                  <th className="px-8 py-6 text-[11px] font-black uppercase tracking-widest border-r border-white/5">Fechador</th>
                  <th className="px-8 py-6 text-[11px] font-black uppercase tracking-widest border-r border-white/5 w-32">Status</th>
                  <th className="px-8 py-6 text-right text-[11px] font-black uppercase tracking-widest text-[#41a900] w-32">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-gray-50">
                {vagas.length === 0 && !loading && (
                  <tr>
                    <td colSpan={10} className="px-8 py-20 text-center text-gray-300 font-black uppercase italic text-sm">
                      Nenhum registro encontrado para os filtros selecionados
                    </td>
                  </tr>
                )}
                {vagas.map((vaga) => {
                  const isSelected = selectedIds.includes(vaga.id);
                  const isFrozen = vaga.CONGELADA && !vaga.FECHAMENTO;
                  
                  return (
                    <tr key={vaga.id} className={`transition-colors group ${isSelected ? 'bg-red-50/50' : isFrozen ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}>
                      <td className="px-6 py-6 border-r border-gray-100 text-center">
                        <button onClick={() => toggleSelectRow(vaga.id)} className={`${isSelected ? 'text-[#e31e24]' : 'text-gray-300'} hover:scale-110 transition-all`}>
                          {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                        </button>
                      </td>
                      <td className="px-6 py-6 font-black text-xs">#{vaga.VAGA || vaga.id}</td>
                      <td className="px-8 py-6">
                        <div className={`font-black uppercase italic ${isFrozen ? 'text-blue-700' : 'text-black'}`}>{vaga.CARGO}</div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 italic">{vaga.UNIDADE}</div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="text-[11px] font-black uppercase text-gray-700">{vaga['usuário_criador'] || 'SISTEMA'}</div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="text-[11px] font-black uppercase text-gray-700">{vaga.usuario_fechador || '---'}</div>
                      </td>
                      <td className="px-8 py-6 text-xs font-black uppercase">
                        {vaga.FECHAMENTO ? (
                          <span className="text-green-600">FINALIZADA</span>
                        ) : isFrozen ? (
                          <span className="text-blue-600">CONGELADA</span>
                        ) : (
                          <span className="text-orange-500">ABERTA</span>
                        )}
                      </td>
                      <td className="px-8 py-6 text-right">
                         <div className="flex items-center justify-end space-x-3">
                            <button onClick={() => handleEdit(vaga)} className="p-3 bg-black text-[#41a900] rounded-xl hover:bg-[#e31e24] transition-all"><Edit size={18} /></button>
                            <button onClick={() => handleDeleteClick(vaga)} className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all"><Trash2 size={18} /></button>
                         </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* MODAL EDIÇÃO ÚNICA */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
          <div className="bg-white w-full max-w-5xl rounded-[40px] shadow-2xl overflow-hidden border-t-[12px] border-black flex flex-col max-h-[95vh]">
             <div className="px-10 py-8 bg-gray-50 flex items-center justify-between">
                <h2 className="text-2xl font-black uppercase italic">Edição Mestra</h2>
                <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full"><X size={32} /></button>
             </div>
             <form id="masterEditForm" onSubmit={handleUpdate} className="flex-1 overflow-y-auto p-10 space-y-8">
                <div className="grid grid-cols-2 gap-8">
                   <div>
                      <label className="text-[10px] font-black uppercase text-gray-500 block mb-2">Nome do Cargo</label>
                      <input className="w-full bg-gray-50 border-2 p-4 rounded-2xl font-black text-sm uppercase" value={editFormData.CARGO || ''} onChange={(e) => setEditFormData({...editFormData, CARGO: e.target.value})} />
                   </div>
                   <div>
                      <label className="text-[10px] font-black uppercase text-gray-500 block mb-2">Unidade</label>
                      <select className="w-full bg-gray-50 border-2 p-4 rounded-2xl font-black text-sm" value={editFormData.UNIDADE || ''} onChange={(e) => setEditFormData({...editFormData, UNIDADE: e.target.value})}>
                         {unidades.map(u => <option key={u.nome} value={u.nome}>{u.nome}</option>)}
                      </select>
                   </div>
                   <div>
                      <label className="text-[10px] font-black uppercase text-gray-500 block mb-2">Setor</label>
                      <input className="w-full bg-gray-50 border-2 p-4 rounded-2xl font-black text-sm uppercase" value={editFormData.SETOR || ''} onChange={(e) => setEditFormData({...editFormData, SETOR: e.target.value})} />
                   </div>
                   <div>
                      <label className="text-[10px] font-black uppercase text-gray-500 block mb-2">Gestor</label>
                      <input className="w-full bg-gray-50 border-2 p-4 rounded-2xl font-black text-sm uppercase" value={editFormData.GESTOR || ''} onChange={(e) => setEditFormData({...editFormData, GESTOR: e.target.value})} />
                   </div>
                   <div>
                      <label className="text-[10px] font-black uppercase text-gray-500 block mb-2">Usuário Criador</label>
                      <select className="w-full bg-gray-50 border-2 p-4 rounded-2xl font-black text-sm" value={editFormData.usuário_criador || ''} onChange={(e) => setEditFormData({...editFormData, usuário_criador: e.target.value})}>
                         <option value="">SISTEMA</option>
                         {profiles.map(p => <option key={p.username} value={p.username}>{p.username}</option>)}
                      </select>
                   </div>
                   <div>
                      <label className="text-[10px] font-black uppercase text-gray-500 block mb-2">Usuário Fechador</label>
                      <select className="w-full bg-gray-50 border-2 p-4 rounded-2xl font-black text-sm" value={editFormData.usuario_fechador || ''} onChange={(e) => setEditFormData({...editFormData, usuario_fechador: e.target.value})}>
                         <option value="">NÃO FECHADA</option>
                         {profiles.map(p => <option key={p.username} value={p.username}>{p.username}</option>)}
                      </select>
                   </div>
                   <div className="flex items-center space-x-4 p-4 bg-blue-50 rounded-2xl">
                      <Snowflake size={20} className="text-blue-600" />
                      <span className="text-xs font-black uppercase text-blue-700">Vaga Congelada:</span>
                      <button 
                        type="button" 
                        onClick={() => setEditFormData({...editFormData, CONGELADA: !editFormData.CONGELADA})}
                        className="text-blue-600"
                      >
                        {editFormData.CONGELADA ? <ToggleRight size={40} /> : <ToggleLeft size={40} />}
                      </button>
                   </div>
                </div>
             </form>
             <div className="p-10 border-t flex justify-center space-x-4">
                <button onClick={() => setIsEditModalOpen(false)} className="px-8 py-4 bg-gray-100 rounded-2xl font-black text-xs uppercase">Cancelar</button>
                <button form="masterEditForm" disabled={formLoading} className="px-12 py-4 bg-black text-[#41a900] rounded-2xl font-black text-xs uppercase hover:bg-[#e31e24] hover:text-white transition-all">
                   {formLoading ? <Loader2 className="animate-spin mx-auto" size={24} /> : 'SALVAR ALTERAÇÕES'}
                </button>
             </div>
          </div>
        </div>
      )}

      {/* MODAL EDIÇÃO EM BLOCO ATUALIZADO */}
      {isBulkEditModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
          <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden border-t-[12px] border-[#41a900] animate-in zoom-in duration-200">
             <div className="px-10 py-8 bg-gray-50 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Layers size={32} className="text-[#41a900]" />
                  <div>
                    <h2 className="text-2xl font-black uppercase italic leading-none">Edição em Massa</h2>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1 italic">Alterando {selectedIds.length} registros</p>
                  </div>
                </div>
                <button onClick={() => setIsBulkEditModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full"><X size={32} /></button>
             </div>
             
             <div className="p-10 space-y-8">
                <div>
                   <label className="text-[10px] font-black uppercase text-gray-500 block mb-3 ml-1">1. Escolha o campo para alterar</label>
                   <select 
                     className="w-full bg-gray-50 border-2 p-5 rounded-2xl font-black text-sm uppercase outline-none focus:border-black transition-all"
                     value={bulkField}
                     onChange={(e) => {
                       setBulkField(e.target.value);
                       setBulkValue('');
                     }}
                   >
                      <option value="usuário_criador">Usuário Criador (Abertura)</option>
                      <option value="usuario_fechador">Usuário Fechador (Finalização)</option>
                      <option value="UNIDADE">Unidade Operacional</option>
                      <option value="SETOR">Setor</option>
                      <option value="GESTOR">Gestor</option>
                      <option value="CONGELADA">Status de Congelamento</option>
                      <option value="TIPO_CARGO">Tipo de Cargo</option>
                   </select>
                </div>

                <div>
                   <label className="text-[10px] font-black uppercase text-gray-500 block mb-3 ml-1">2. Defina o novo valor</label>
                   {bulkField === 'CONGELADA' ? (
                     <select className="w-full bg-gray-50 border-2 p-5 rounded-2xl font-black text-sm uppercase outline-none focus:border-black" value={bulkValue} onChange={(e) => setBulkValue(e.target.value)}>
                        <option value="">Selecione...</option>
                        <option value="true">CONGELAR TODAS</option>
                        <option value="false">DESCONGELAR TODAS</option>
                     </select>
                   ) : (bulkField === 'usuário_criador' || bulkField === 'usuario_fechador') ? (
                     <select className="w-full bg-gray-50 border-2 p-5 rounded-2xl font-black text-sm uppercase outline-none focus:border-black" value={bulkValue} onChange={(e) => setBulkValue(e.target.value)}>
                        <option value="">Selecione o Usuário...</option>
                        {profiles.map(p => <option key={p.username} value={p.username}>{p.username}</option>)}
                     </select>
                   ) : bulkField === 'UNIDADE' ? (
                     <select className="w-full bg-gray-50 border-2 p-5 rounded-2xl font-black text-sm uppercase outline-none focus:border-black" value={bulkValue} onChange={(e) => setBulkValue(e.target.value)}>
                        <option value="">Selecione a Unidade...</option>
                        {unidades.map(u => <option key={u.nome} value={u.nome}>{u.nome}</option>)}
                     </select>
                   ) : (
                     <input 
                       className="w-full bg-gray-50 border-2 p-5 rounded-2xl font-black text-sm uppercase outline-none focus:border-black" 
                       placeholder="Digite o novo valor..."
                       value={bulkValue}
                       onChange={(e) => setBulkValue(e.target.value)}
                     />
                   )}
                </div>
             </div>

             <div className="p-10 border-t flex justify-center space-x-4 bg-gray-50">
                <button onClick={() => setIsBulkEditModalOpen(false)} className="px-10 py-5 bg-white border-2 border-gray-200 rounded-2xl font-black text-xs uppercase tracking-widest hover:border-black transition-all">Cancelar</button>
                <button 
                  onClick={() => setIsBulkConfirmOpen(true)}
                  disabled={!bulkValue}
                  className="px-12 py-5 bg-black text-[#41a900] rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-[#e31e24] hover:text-white transition-all shadow-xl disabled:opacity-30 border-b-4 border-black/20"
                >
                  Confirmar Alteração
                </button>
             </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAÇÃO EM BLOCO */}
      {isBulkConfirmOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-4">
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl p-12 text-center border-t-[15px] border-[#e31e24] animate-in slide-in-from-bottom-5">
             <div className="bg-red-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse">
                <AlertTriangle size={56} className="text-[#e31e24]" />
             </div>
             <h2 className="text-2xl font-black uppercase italic mb-4">Atenção Crítica!</h2>
             <div className="bg-gray-50 p-6 rounded-3xl border-2 border-dashed border-gray-200 mb-10">
                <p className="text-sm font-bold text-gray-600 uppercase tracking-widest leading-relaxed">
                   Você está prestes a alterar o campo <span className="text-black font-black">"{bulkField}"</span> para <span className="text-[#e31e24] font-black italic">"{bulkValue}"</span> em <span className="text-black font-black underline">{selectedIds.length}</span> registros simultaneamente.
                </p>
             </div>
             <div className="grid grid-cols-1 gap-4">
                <button 
                  onClick={handleBulkUpdate} 
                  disabled={formLoading}
                  className="py-5 bg-black text-[#41a900] rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-[#e31e24] hover:text-white transition-all shadow-2xl flex items-center justify-center space-x-3"
                >
                  {formLoading ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20} /><span>Executar Agora</span></>}
                </button>
                <button onClick={() => setIsBulkConfirmOpen(false)} className="py-4 text-gray-400 font-black text-[10px] uppercase tracking-widest hover:text-black">Voltar e Corrigir</button>
             </div>
          </div>
        </div>
      )}

      {/* CONFIRMAÇÃO EXCLUSÃO */}
      {vagaToDelete && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4">
          <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl p-10 text-center border-t-[12px] border-[#e31e24]">
             <AlertTriangle size={48} className="text-[#e31e24] mx-auto mb-6" />
             <h2 className="text-xl font-black uppercase mb-4">Excluir Registro?</h2>
             <p className="text-sm font-bold text-gray-400 uppercase mb-8">Esta ação é irreversível.</p>
             <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setVagaToDelete(null)} className="py-4 bg-gray-100 rounded-2xl font-black text-xs uppercase">Voltar</button>
                <button onClick={confirmDelete} className="py-4 bg-black text-white rounded-2xl font-black text-xs uppercase hover:bg-red-600 transition-all">Excluir Agora</button>
             </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.05); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e31e24; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default AdminManagement;
