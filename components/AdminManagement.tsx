
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { Vaga, User } from '../types';
import { 
  ArrowLeft, Search, Edit, Trash2, X, Save, AlertCircle, 
  Settings, Filter, Briefcase, MapPin, Loader2, Info,
  History, ShieldAlert, Hash, UserCircle, AlertTriangle,
  CheckSquare, Square, Layers, UserCheck, ChevronDown,
  RefreshCw, Play
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
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  
  // Filter Draft states (inputs)
  const [searchDraft, setSearchDraft] = useState('');
  const [statusDraft, setStatusDraft] = useState<'all' | 'open' | 'closed'>('all');
  const [creatorDraft, setCreatorDraft] = useState<string>('all');
  const [unidadeDraft, setUnidadeDraft] = useState<string>('all');
  const [setorDraft, setSetorDraft] = useState<string>('all');
  const [gestorDraft, setGestorDraft] = useState<string>('all');
  
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

  // Fetch unique metadata for filters
  const fetchMetadata = async () => {
    const [profilesRes, unitsRes, metadataRes] = await Promise.all([
      supabase.from('profiles').select('username, full_name'),
      supabase.from('unidades').select('nome'),
      supabase.from('vagas').select('SETOR, GESTOR')
    ]);

    if (!profilesRes.error) setProfiles(profilesRes.data);
    if (!unitsRes.error) setUnidades(unitsRes.data);
    
    if (!metadataRes.error && metadataRes.data) {
      const setores = Array.from(new Set(metadataRes.data.map(v => v.SETOR))).filter(Boolean).sort() as string[];
      const gestores = Array.from(new Set(metadataRes.data.map(v => v.GESTOR))).filter(Boolean).sort() as string[];
      setAllSetores(setores);
      setAllGestores(gestores);
    }
  };

  const handleSearch = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    else setSearching(true);

    try {
      let query = supabase.from('vagas').select('*').order('created_at', { ascending: false });

      if (isInitial) {
        query = query.limit(10);
      } else {
        // Apply Filters directly in the query for better performance
        if (statusDraft === 'open') query = query.is('FECHAMENTO', null);
        if (statusDraft === 'closed') query = query.not('FECHAMENTO', 'is', null);

        if (creatorDraft === 'empty') query = query.or('usuário_criador.is.null,usuário_criador.eq.""');
        else if (creatorDraft !== 'all') query = query.eq('usuário_criador', creatorDraft);

        if (unidadeDraft !== 'all') query = query.eq('UNIDADE', unidadeDraft);
        if (setorDraft !== 'all') query = query.eq('SETOR', setorDraft);
        if (gestorDraft !== 'all') query = query.eq('GESTOR', gestorDraft);

        if (searchDraft) {
          query = query.or(`CARGO.ilike.%${searchDraft}%,UNIDADE.ilike.%${searchDraft}%,SETOR.ilike.%${searchDraft}%,GESTOR.ilike.%${searchDraft}%`);
        }
      }

      const { data, error } = await query;
      if (!error) setVagas(data || []);
      else console.error(error);
    } finally {
      setLoading(false);
      setSearching(false);
    }
  }, [searchDraft, statusDraft, creatorDraft, unidadeDraft, setorDraft, gestorDraft]);

  useEffect(() => {
    fetchMetadata();
    handleSearch(true); // Initial load: last 10
  }, []);

  const toggleSelectAll = () => {
    if (selectedIds.length === vagas.length) {
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
    } else {
      setVagaToDelete(null);
      handleSearch(false);
    }
    setLoading(false);
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
      'usuário_criador', 'RECRUTADOR', 'VAGA'
    ];

    fieldsToCompare.forEach(field => {
      const oldVal = selectedVaga[field];
      const newVal = editFormData[field as keyof typeof editFormData];
      if (oldVal !== newVal) {
        logs.push(`${dateStr} [AUDIT/ADMIN]: ${user.username} alterou ${field} de "${oldVal || 'VAZIO'}" para "${newVal || 'VAZIO'}"`);
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
    } else {
      setIsEditModalOpen(false);
      handleSearch(false);
    }
    setFormLoading(false);
  };

  const handleBulkUpdate = async () => {
    setFormLoading(true);
    const dateStr = new Date().toLocaleDateString('pt-BR');
    
    const errors = [];
    for (const id of selectedIds) {
      const currentVaga = vagas.find(v => v.id === id);
      if (!currentVaga) continue;

      const oldVal = currentVaga[bulkField as keyof Vaga];
      const log = `${dateStr} [AUDIT/BULK]: ${user.username} alterou EM BLOCO o campo ${bulkField} de "${oldVal || 'VAZIO'}" para "${bulkValue}"`;
      const updatedObservations = [...(currentVaga.OBSERVACOES || []), log];

      const { error } = await supabase
        .from('vagas')
        .update({
          [bulkField]: bulkValue,
          OBSERVACOES: updatedObservations
        })
        .eq('id', id);
      
      if (error) errors.push(error);
    }

    if (errors.length > 0) {
      alert(`Ocorreram ${errors.length} erros durante a atualização em bloco.`);
    }

    setIsBulkConfirmOpen(false);
    setIsBulkEditModalOpen(false);
    setSelectedIds([]);
    handleSearch(false);
    setFormLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#f1f3f5] flex flex-col font-sans">
      <header className="bg-black text-white px-8 py-6 flex items-center justify-between shadow-2xl relative z-10 border-b-4 border-[#e31e24]">
        <div className="flex items-center space-x-5">
          <button onClick={onBack} className="p-3 hover:bg-gray-800 rounded-2xl transition-all text-[#adff2f] active:scale-90">
            <ArrowLeft size={28} strokeWidth={3} />
          </button>
          <div className="bg-[#e31e24] p-3 rounded-xl transform -skew-x-12">
            <Settings size={28} className="text-white transform skew-x-12" strokeWidth={3} />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter uppercase italic leading-none">
              GESTÃO <span className="text-[#e31e24]">GLOBAL</span> DE VAGAS
            </h1>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] mt-1 opacity-80 italic">Controle total do banco de dados</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
           {selectedIds.length > 0 && (
             <button 
               onClick={() => setIsBulkEditModalOpen(true)}
               className="bg-[#adff2f] text-black px-6 py-3 rounded-xl flex items-center space-x-3 font-black text-xs uppercase tracking-widest hover:bg-white transition-all shadow-lg animate-bounce"
             >
               <Layers size={18} />
               <span>Alteração em Bloco ({selectedIds.length})</span>
             </button>
           )}
           <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-right">
              <p className="text-[9px] font-black text-gray-500 uppercase">Modo Administrador</p>
              <p className="text-xs font-black text-[#adff2f]">{user.username}</p>
           </div>
        </div>
      </header>

      <main className="flex-1 p-8 lg:p-12 space-y-6">
        {/* Filters Panel */}
        <div className="bg-white rounded-[30px] shadow-xl p-8 border-2 border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4">
             {searching && <Loader2 className="animate-spin text-[#e31e24]" size={20} />}
          </div>
          
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Filter className="text-[#e31e24]" size={20} />
              <h2 className="font-black uppercase italic text-sm">Filtros Avançados</h2>
              <span className="text-[9px] font-black bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full uppercase italic">Filtros serão aplicados ao clicar em buscar</span>
            </div>
            <button 
              onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
              className="text-xs font-black uppercase text-gray-400 hover:text-black flex items-center space-x-2"
            >
              <span>{isFilterPanelOpen ? 'Recolher' : 'Expandir'}</span>
              <ChevronDown className={`transition-transform ${isFilterPanelOpen ? 'rotate-180' : ''}`} size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="relative group lg:col-span-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#e31e24]" size={16} />
              <input 
                type="text" 
                placeholder="BUSCAR TERMO..."
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-black outline-none font-bold text-[11px] uppercase"
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch(false)}
              />
            </div>
            
            {isFilterPanelOpen && (
              <>
                <select 
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-black outline-none font-bold text-[11px] uppercase cursor-pointer"
                  value={statusDraft}
                  onChange={(e) => setStatusDraft(e.target.value as any)}
                >
                  <option value="all">STATUS: TODOS</option>
                  <option value="open">STATUS: ABERTAS</option>
                  <option value="closed">STATUS: FECHADAS</option>
                </select>

                <select 
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-black outline-none font-bold text-[11px] uppercase cursor-pointer"
                  value={creatorDraft}
                  onChange={(e) => setCreatorDraft(e.target.value)}
                >
                  <option value="all">CRIADOR: TODOS</option>
                  <option value="empty">CRIADOR: VAZIO (SISTEMA)</option>
                  {profiles.map(p => (
                    <option key={p.username} value={p.username}>CRIADOR: {p.username}</option>
                  ))}
                </select>

                <select 
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-black outline-none font-bold text-[11px] uppercase cursor-pointer"
                  value={unidadeDraft}
                  onChange={(e) => setUnidadeDraft(e.target.value)}
                >
                  <option value="all">UNIDADE: TODAS</option>
                  {unidades.map(u => (
                    <option key={u.nome} value={u.nome}>UNIDADE: {u.nome}</option>
                  ))}
                </select>

                <select 
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-black outline-none font-bold text-[11px] uppercase cursor-pointer"
                  value={setorDraft}
                  onChange={(e) => setSetorDraft(e.target.value)}
                >
                  <option value="all">SETOR: TODOS</option>
                  {allSetores.map(s => (
                    <option key={s} value={s}>SETOR: {s}</option>
                  ))}
                </select>

                <select 
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-black outline-none font-bold text-[11px] uppercase cursor-pointer"
                  value={gestorDraft}
                  onChange={(e) => setGestorDraft(e.target.value)}
                >
                  <option value="all">GESTOR: TODOS</option>
                  {allGestores.map(g => (
                    <option key={g} value={g}>GESTOR: {g}</option>
                  ))}
                </select>

                <div className="lg:col-span-2 flex justify-end">
                   <button 
                     onClick={() => handleSearch(false)}
                     disabled={searching}
                     className="bg-black text-[#adff2f] px-10 py-3 rounded-xl flex items-center space-x-3 font-black text-xs uppercase tracking-[0.2em] hover:bg-[#e31e24] hover:text-white transition-all shadow-xl active:scale-95 disabled:opacity-50"
                   >
                     {searching ? <Loader2 className="animate-spin" size={18} /> : <Play size={18} fill="currentColor" />}
                     <span>Aplicar Filtros e Buscar</span>
                   </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-[40px] shadow-2xl border-2 border-gray-100 overflow-hidden relative">
          {loading && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center space-y-4">
              <Loader2 className="animate-spin text-[#e31e24]" size={48} />
              <p className="font-black uppercase tracking-widest text-[10px] text-black">Acessando base de dados...</p>
            </div>
          )}
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-black text-white">
                  <th className="px-6 py-6 border-r border-white/5 w-12 text-center">
                    <button onClick={toggleSelectAll} className="text-[#adff2f] hover:scale-110 transition-transform">
                      {selectedIds.length === vagas.length && vagas.length > 0 ? (
                        <CheckSquare size={20} />
                      ) : (
                        <Square size={20} />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-6 text-[11px] font-black uppercase tracking-widest border-r border-white/5 w-24">ID/Vaga</th>
                  <th className="px-8 py-6 text-[11px] font-black uppercase tracking-widest border-r border-white/5">Cargo / Unidade</th>
                  <th className="px-8 py-6 text-[11px] font-black uppercase tracking-widest border-r border-white/5">Responsáveis</th>
                  <th className="px-8 py-6 text-[11px] font-black uppercase tracking-widest border-r border-white/5">Status</th>
                  <th className="px-8 py-6 text-right text-[11px] font-black uppercase tracking-widest text-[#adff2f]">Ações Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-gray-50">
                {vagas.map((vaga) => {
                  const isSelected = selectedIds.includes(vaga.id);
                  return (
                    <tr 
                      key={vaga.id} 
                      className={`transition-colors group ${isSelected ? 'bg-red-50/50' : 'hover:bg-gray-50'}`}
                    >
                      <td className="px-6 py-6 border-r border-gray-100 text-center">
                        <button 
                          onClick={() => toggleSelectRow(vaga.id)} 
                          className={`${isSelected ? 'text-[#e31e24]' : 'text-gray-300'} hover:scale-110 transition-all`}
                        >
                          {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                        </button>
                      </td>
                      <td className="px-6 py-6">
                         <span className="bg-gray-100 px-3 py-1 rounded-lg font-black text-xs border border-gray-200">#{vaga.VAGA || vaga.id}</span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="font-black text-black uppercase italic leading-tight">{vaga.CARGO}</div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 flex items-center">
                          <MapPin size={10} className="mr-1" /> {vaga.UNIDADE} • {vaga.SETOR}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                         <div className="text-[10px] font-black text-gray-500 uppercase">Criador: <span className="text-black">{vaga['usuário_criador'] || '---'}</span></div>
                         <div className="text-[10px] font-black text-gray-400 uppercase mt-1">Recrutador: <span className="text-[#e31e24]">{vaga.RECRUTADOR || '---'}</span></div>
                         <div className="text-[9px] font-bold text-gray-300 uppercase">Gestor: {vaga.GESTOR}</div>
                      </td>
                      <td className="px-8 py-6">
                         {vaga.FECHAMENTO ? (
                           <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[9px] font-black uppercase border border-green-200">Finalizada</span>
                         ) : (
                           <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-[9px] font-black uppercase border border-orange-200">Em Aberto</span>
                         )}
                      </td>
                      <td className="px-8 py-6 text-right">
                         <div className="flex items-center justify-end space-x-3">
                            <button 
                              onClick={() => handleEdit(vaga)}
                              className="p-3 bg-black text-[#adff2f] rounded-xl hover:bg-[#e31e24] hover:text-white transition-all shadow-md active:scale-90"
                            >
                               <Edit size={18} />
                            </button>
                            <button 
                              onClick={() => handleDeleteClick(vaga)}
                              className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-md active:scale-90"
                            >
                               <Trash2 size={18} />
                            </button>
                         </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!loading && vagas.length === 0 && (
            <div className="py-20 text-center flex flex-col items-center justify-center opacity-30">
               <AlertCircle size={48} className="mb-4" />
               <p className="font-black uppercase tracking-widest text-xs">Nenhum registro encontrado para os filtros.</p>
            </div>
          )}
          {!loading && vagas.length > 0 && (
             <div className="p-6 bg-gray-50 border-t border-gray-100 text-center">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest italic">Exibindo {vagas.length} registros</p>
             </div>
          )}
        </div>
      </main>

      {/* MODAL: BULK EDIT, BULK CONFIRM, SINGLE EDIT, DELETE CONFIRMATION (REMAIN THE SAME BUT USE handleSearch(false) ON SUCCESS) */}
      
      {/* BULK EDIT */}
      {isBulkEditModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
          <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden border-t-[12px] border-[#adff2f] transform transition-all animate-in zoom-in duration-300">
            <div className="p-10">
               <div className="flex items-center space-x-4 mb-8">
                  <div className="bg-black p-4 rounded-2xl text-[#adff2f]">
                     <Layers size={32} strokeWidth={3} />
                  </div>
                  <div>
                     <h2 className="text-xl font-black uppercase italic tracking-tighter">Alteração em Bloco</h2>
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{selectedIds.length} Vagas selecionadas</p>
                  </div>
               </div>

               <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Campo para Editar</label>
                    <select 
                      className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-black text-sm focus:border-black outline-none"
                      value={bulkField}
                      onChange={(e) => {
                        setBulkField(e.target.value);
                        setBulkValue('');
                      }}
                    >
                      <option value="usuário_criador">Usuário Criador</option>
                      <option value="GESTOR">Gestor Responsável</option>
                      <option value="GERENTE">Gerente Responsável</option>
                      <option value="UNIDADE">Unidade Operacional</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Novo Valor</label>
                    {bulkField === 'usuário_criador' ? (
                      <select 
                        className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-black text-sm focus:border-black outline-none"
                        value={bulkValue}
                        onChange={(e) => setBulkValue(e.target.value)}
                      >
                        <option value="">SELECIONE UM USUÁRIO...</option>
                        {profiles.map(p => <option key={p.username} value={p.username}>{p.username}</option>)}
                      </select>
                    ) : bulkField === 'UNIDADE' ? (
                      <select 
                        className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-black text-sm focus:border-black outline-none"
                        value={bulkValue}
                        onChange={(e) => setBulkValue(e.target.value)}
                      >
                        <option value="">SELECIONE UMA UNIDADE...</option>
                        {unidades.map(u => <option key={u.nome} value={u.nome}>{u.nome}</option>)}
                      </select>
                    ) : (
                      <input 
                        className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-black text-sm focus:border-black outline-none uppercase"
                        placeholder="DIGITE O NOVO VALOR..."
                        value={bulkValue}
                        onChange={(e) => setBulkValue(e.target.value)}
                      />
                    )}
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4 mt-10">
                  <button 
                    onClick={() => setIsBulkEditModalOpen(false)}
                    className="py-4 bg-gray-100 text-gray-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    disabled={!bulkValue}
                    onClick={() => setIsBulkConfirmOpen(true)}
                    className="py-4 bg-black text-[#adff2f] rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#e31e24] hover:text-white transition-all shadow-xl disabled:opacity-30"
                  >
                    Prosseguir
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* BULK CONFIRMATION */}
      {isBulkConfirmOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-4">
          <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden border-t-[12px] border-[#e31e24] transform transition-all animate-in zoom-in duration-300">
            <div className="p-10 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6 shadow-inner border-2 border-red-100">
                <ShieldAlert size={40} className="text-[#e31e24]" strokeWidth={3} />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tighter italic text-black leading-none mb-4">
                CONFIRMAR <span className="text-[#e31e24]">AÇÃO EM MASSA</span>
              </h2>
              <div className="bg-gray-50 p-6 rounded-2xl border-2 border-dashed border-gray-200 w-full mb-8 space-y-3">
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Resumo da Alteração:</p>
                <div className="p-3 bg-black text-white rounded-xl text-xs font-bold uppercase">
                  Campo: <span className="text-[#adff2f]">{bulkField}</span>
                </div>
                <div className="p-3 bg-black text-white rounded-xl text-xs font-bold uppercase">
                  Novo Valor: <span className="text-[#adff2f]">{bulkValue}</span>
                </div>
                <div className="p-3 bg-[#adff2f] text-black rounded-xl text-xs font-black uppercase">
                  Vagas Afetadas: {selectedIds.length} un.
                </div>
              </div>
              <p className="text-[10px] font-black text-red-600 uppercase tracking-tight mb-8">
                Esta ação será auditada e vinculada ao seu usuário.
              </p>
              <div className="grid grid-cols-2 gap-4 w-full">
                <button 
                  onClick={() => setIsBulkConfirmOpen(false)}
                  className="px-6 py-4 bg-gray-100 text-gray-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
                >
                  Voltar
                </button>
                <button 
                  onClick={handleBulkUpdate}
                  disabled={formLoading}
                  className="px-6 py-4 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#e31e24] transition-all shadow-xl"
                >
                  {formLoading ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Confirmar Alteração'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SINGLE EDIT */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
          <div className="bg-white w-full max-w-5xl rounded-[40px] shadow-2xl overflow-hidden border-t-[12px] border-black flex flex-col max-h-[95vh]">
             <div className="px-10 py-8 border-b border-gray-100 bg-gray-50 flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-5">
                   <div className="bg-[#e31e24] p-4 rounded-3xl text-white shadow-2xl transform -rotate-3">
                      <Settings size={32} strokeWidth={3} />
                   </div>
                   <div>
                      <h2 className="text-2xl font-black uppercase tracking-tighter italic text-black leading-none">Edição Mestra</h2>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1.5">Vaga #{selectedVaga?.VAGA} • Registro ID {selectedVaga?.id}</p>
                   </div>
                </div>
                <button onClick={() => setIsEditModalOpen(false)} className="p-3 bg-gray-200 hover:bg-black hover:text-[#adff2f] text-black rounded-full transition-all active:scale-90">
                   <X size={32} strokeWidth={2.5} />
                </button>
             </div>

             <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-[#f8f9fa]">
                <form id="masterEditForm" onSubmit={handleUpdate} className="space-y-12 pb-10">
                   <div className="space-y-6">
                      <div className="flex items-center space-x-3 border-b-4 border-black pb-2 mb-8">
                         <Hash className="text-[#e31e24]" size={20} strokeWidth={3} />
                         <span className="font-black text-sm uppercase italic">Dados Estruturais</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                         <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Número da Vaga</label>
                            <input 
                               type="number"
                               className="w-full bg-white border-2 border-gray-200 p-4 rounded-2xl font-black text-sm focus:border-black outline-none"
                               value={editFormData.VAGA || ''}
                               onChange={(e) => setEditFormData({...editFormData, VAGA: parseInt(e.target.value)})}
                            />
                         </div>
                         <div className="md:col-span-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Nome do Cargo</label>
                            <input 
                               className="w-full bg-white border-2 border-gray-200 p-4 rounded-2xl font-black text-sm focus:border-black outline-none uppercase"
                               value={editFormData.CARGO || ''}
                               onChange={(e) => setEditFormData({...editFormData, CARGO: e.target.value})}
                            />
                         </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Unidade Filial</label>
                            <select 
                               className="w-full bg-white border-2 border-gray-200 p-4 rounded-2xl font-black text-sm focus:border-black outline-none"
                               value={editFormData.UNIDADE || ''}
                               onChange={(e) => setEditFormData({...editFormData, UNIDADE: e.target.value})}
                            >
                               {unidades.map(u => <option key={u.nome} value={u.nome}>{u.nome}</option>)}
                            </select>
                         </div>
                         <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Setor Operacional</label>
                            <input 
                               className="w-full bg-white border-2 border-gray-200 p-4 rounded-2xl font-black text-sm focus:border-black outline-none uppercase"
                               value={editFormData.SETOR || ''}
                               onChange={(e) => setEditFormData({...editFormData, SETOR: e.target.value})}
                            />
                         </div>
                      </div>
                   </div>

                   <div className="space-y-6">
                      <div className="flex items-center space-x-3 border-b-4 border-black pb-2 mb-8">
                         <UserCircle className="text-[#e31e24]" size={20} strokeWidth={3} />
                         <span className="font-black text-sm uppercase italic">Gestão e Responsáveis</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Gestor Direto</label>
                            <input 
                               className="w-full bg-white border-2 border-gray-200 p-4 rounded-2xl font-black text-sm focus:border-black outline-none uppercase"
                               value={editFormData.GESTOR || ''}
                               onChange={(e) => setEditFormData({...editFormData, GESTOR: e.target.value})}
                            />
                         </div>
                         <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Gerente Responsável</label>
                            <input 
                               className="w-full bg-white border-2 border-gray-200 p-4 rounded-2xl font-black text-sm focus:border-black outline-none uppercase"
                               value={editFormData.GERENTE || ''}
                               onChange={(e) => setEditFormData({...editFormData, GERENTE: e.target.value})}
                            />
                         </div>
                         <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Usuário Criador (Login)</label>
                            <select 
                               className="w-full bg-white border-2 border-gray-200 p-4 rounded-2xl font-black text-sm focus:border-black outline-none"
                               value={editFormData['usuário_criador'] || ''}
                               onChange={(e) => setEditFormData({...editFormData, 'usuário_criador': e.target.value})}
                            >
                               <option value="">NÃO INFORMADO</option>
                               {profiles.map(p => <option key={p.username} value={p.username}>{p.username}</option>)}
                            </select>
                         </div>
                         <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Recrutador Fechador (Login)</label>
                            <select 
                               className="w-full bg-white border-2 border-gray-200 p-4 rounded-2xl font-black text-sm focus:border-black outline-none"
                               value={editFormData.RECRUTADOR || ''}
                               onChange={(e) => setEditFormData({...editFormData, RECRUTADOR: e.target.value})}
                            >
                               <option value="">NÃO INFORMADO</option>
                               {profiles.map(p => <option key={p.username} value={p.username}>{p.username}</option>)}
                            </select>
                         </div>
                      </div>
                   </div>

                   <div className="space-y-6">
                      <div className="flex items-center space-x-3 border-b-4 border-[#adff2f] pb-2 mb-8">
                         <History className="text-black" size={20} strokeWidth={3} />
                         <span className="font-black text-sm uppercase italic">Linha do Tempo (Não Editável)</span>
                      </div>
                      <div className="bg-black p-8 rounded-[30px] space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar">
                         {selectedVaga?.OBSERVACOES?.map((obs, i) => (
                            <div key={i} className="flex space-x-4 items-start border-b border-white/5 pb-3">
                               <div className="w-2 h-2 rounded-full bg-[#adff2f] mt-1.5 shrink-0"></div>
                               <p className="text-white/80 font-bold text-xs leading-relaxed">{obs}</p>
                            </div>
                         ))}
                      </div>
                      <div className="p-6 bg-red-50 border-4 border-dashed border-red-200 rounded-[30px] flex items-start space-x-5">
                         <ShieldAlert className="text-[#e31e24] shrink-0" size={32} />
                         <p className="text-[11px] font-black text-red-900 uppercase tracking-tight leading-relaxed">
                            AVISO DE AUDITORIA: Quaisquer alterações salvas acima serão detectadas pelo sistema e registradas automaticamente na Linha do Tempo como uma ação administrativa de <span className="underline decoration-black">{user.username}</span>.
                         </p>
                      </div>
                   </div>
                </form>
             </div>

             <div className="p-10 border-t border-gray-100 bg-white flex justify-center shrink-0">
                <div className="flex space-x-6 w-full max-w-2xl">
                   <button onClick={() => setIsEditModalOpen(false)} className="flex-1 py-5 bg-gray-100 text-gray-400 rounded-[25px] font-black text-sm uppercase tracking-widest">Cancelar</button>
                   <button form="masterEditForm" disabled={formLoading} className="flex-3 px-12 py-5 bg-black text-[#adff2f] rounded-[25px] font-black text-sm uppercase tracking-[0.3em] hover:bg-[#e31e24] hover:text-white transition-all shadow-2xl active:scale-95">
                      {formLoading ? <Loader2 className="animate-spin mx-auto" size={24} /> : 'SALVAR ALTERAÇÕES MESTRAS'}
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION */}
      {vagaToDelete && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4">
          <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden border-t-[12px] border-[#e31e24] transform transition-all animate-in zoom-in duration-300">
            <div className="p-10 flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-8 shadow-inner border-2 border-red-100">
                <AlertTriangle size={48} className="text-[#e31e24]" strokeWidth={3} />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tighter italic text-black leading-none mb-4">EXCLUSÃO <span className="text-[#e31e24]">DEFINITIVA</span></h2>
              <div className="bg-gray-50 p-6 rounded-2xl border-2 border-dashed border-gray-200 w-full mb-8">
                <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Vaga Selecionada:</p>
                <p className="text-sm font-black text-black uppercase leading-tight">#{vagaToDelete.VAGA} - {vagaToDelete.CARGO}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 w-full">
                <button onClick={() => setVagaToDelete(null)} className="px-6 py-4 bg-gray-100 text-gray-400 rounded-2xl font-black text-xs uppercase tracking-widest">Cancelar</button>
                <button onClick={confirmDelete} className="px-6 py-4 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-600 transition-all">Confirmar Exclusão</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e31e24; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #000; }
      `}</style>
    </div>
  );
};

export default AdminManagement;
