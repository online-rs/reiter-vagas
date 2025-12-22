
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabase';
import { Vaga, User } from '../types';
import { 
  ArrowLeft, Search, Edit, Trash2, X, Save, AlertCircle, 
  Settings, UserPlus, Filter, Briefcase, MapPin, Loader2, Info,
  CheckCircle, History, MessageSquare, ShieldAlert, Hash, UserCircle, AlertTriangle
} from 'lucide-react';

interface AdminManagementProps {
  user: User;
  onBack: () => void;
}

const AdminManagement: React.FC<AdminManagementProps> = ({ user, onBack }) => {
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [unidades, setUnidades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVaga, setSelectedVaga] = useState<Vaga | null>(null);
  const [vagaToDelete, setVagaToDelete] = useState<Vaga | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Form state para edição completa
  const [editFormData, setEditFormData] = useState<Partial<Vaga>>({});

  const fetchData = async () => {
    setLoading(true);
    const [vagasRes, profilesRes, unitsRes] = await Promise.all([
      supabase.from('vagas').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('username, full_name'),
      supabase.from('unidades').select('nome')
    ]);

    if (!vagasRes.error) setVagas(vagasRes.data);
    if (!profilesRes.error) setProfiles(profilesRes.data);
    if (!unitsRes.error) setUnidades(unitsRes.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

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
      fetchData();
    }
    setLoading(false);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVaga) return;

    setFormLoading(true);
    
    const logs: string[] = [];
    const dateStr = new Date().toLocaleDateString('pt-BR');
    
    // Comparação de campos para auditoria automática
    const fieldsToCompare: (keyof Vaga)[] = [
      'CARGO', 'UNIDADE', 'SETOR', 'GESTOR', 'GERENTE', 
      'TIPO', 'TIPO_CARGO', 'NOME_SUBSTITUIDO', 'NOME_SUBSTITUICAO', 
      'usuário_criador', 'RECRUTADOR', 'VAGA'
    ];

    fieldsToCompare.forEach(field => {
      const oldVal = selectedVaga[field];
      const newVal = editFormData[field as keyof typeof editFormData];
      if (oldVal !== newVal) {
        logs.push(`${dateStr} [AUDIT/ADMIN]: Alterou ${field} de "${oldVal || 'VAZIO'}" para "${newVal || 'VAZIO'}"`);
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
      fetchData();
    }
    setFormLoading(false);
  };

  const filteredVagas = useMemo(() => {
    const s = searchTerm.toLowerCase();
    return vagas.filter(v => 
      v.CARGO?.toLowerCase().includes(s) ||
      v.UNIDADE?.toLowerCase().includes(s) ||
      v.VAGA?.toString().includes(s) ||
      v['usuário_criador']?.toLowerCase().includes(s)
    );
  }, [vagas, searchTerm]);

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
           <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-right">
              <p className="text-[9px] font-black text-gray-500 uppercase">Modo Administrador</p>
              <p className="text-xs font-black text-[#adff2f]">{user.username}</p>
           </div>
        </div>
      </header>

      <main className="flex-1 p-8 lg:p-12 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="relative w-full md:w-1/2 group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#e31e24] transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="PESQUISAR EM TODAS AS VAGAS (CARGO, UNIDADE, ID...)"
              className="w-full pl-14 pr-8 py-5 rounded-[25px] border-4 border-gray-100 bg-white focus:border-black outline-none font-black text-sm uppercase tracking-tighter shadow-xl transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="bg-black text-white px-8 py-4 rounded-[20px] shadow-2xl flex items-center space-x-4 border-b-4 border-[#adff2f]">
             <Briefcase size={20} className="text-[#adff2f]" />
             <span className="font-black text-xs uppercase tracking-widest">{filteredVagas.length} Vagas Totais</span>
          </div>
        </div>

        <div className="bg-white rounded-[40px] shadow-2xl border-2 border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-black text-white">
                  <th className="px-8 py-6 text-[11px] font-black uppercase tracking-widest border-r border-white/5">ID/Vaga</th>
                  <th className="px-8 py-6 text-[11px] font-black uppercase tracking-widest border-r border-white/5">Cargo / Unidade</th>
                  <th className="px-8 py-6 text-[11px] font-black uppercase tracking-widest border-r border-white/5">Responsáveis</th>
                  <th className="px-8 py-6 text-[11px] font-black uppercase tracking-widest border-r border-white/5">Status</th>
                  <th className="px-8 py-6 text-right text-[11px] font-black uppercase tracking-widest text-[#adff2f]">Ações Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-gray-50">
                {filteredVagas.map((vaga) => (
                  <tr key={vaga.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-8 py-6">
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* MODAL DE EDIÇÃO GLOBAL */}
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
                   
                   {/* Seção 1: Dados Estruturais */}
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

                   {/* Seção 2: Responsáveis */}
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

                   {/* Seção 3: Histórico e Auditoria */}
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
                         {(!selectedVaga?.OBSERVACOES || selectedVaga.OBSERVACOES.length === 0) && (
                            <p className="text-gray-600 font-black uppercase italic text-[10px] text-center">Sem registros históricos.</p>
                         )}
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
                   <button 
                     onClick={() => setIsEditModalOpen(false)}
                     className="flex-1 py-5 bg-gray-100 text-gray-400 rounded-[25px] font-black text-sm uppercase tracking-widest hover:bg-gray-200 transition-all active:scale-95"
                   >
                      Cancelar
                   </button>
                   <button 
                     form="masterEditForm"
                     disabled={formLoading}
                     className="flex-3 px-12 py-5 bg-black text-[#adff2f] rounded-[25px] font-black text-sm uppercase tracking-[0.3em] hover:bg-[#e31e24] hover:text-white transition-all shadow-2xl active:scale-95 border-b-8 border-black/20"
                   >
                      {formLoading ? <Loader2 className="animate-spin mx-auto" size={24} /> : 'SALVAR ALTERAÇÕES MESTRAS'}
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO CUSTOMIZADO */}
      {vagaToDelete && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4">
          <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden border-t-[12px] border-[#e31e24] transform transition-all animate-in zoom-in duration-300">
            <div className="p-10 flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-8 shadow-inner border-2 border-red-100 animate-pulse">
                <AlertTriangle size={48} className="text-[#e31e24]" strokeWidth={3} />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tighter italic text-black leading-none mb-4">
                EXCLUSÃO <span className="text-[#e31e24]">DEFINITIVA</span>
              </h2>
              <div className="bg-gray-50 p-6 rounded-2xl border-2 border-dashed border-gray-200 w-full mb-8">
                <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Vaga Selecionada:</p>
                <p className="text-sm font-black text-black uppercase leading-tight">
                  #{vagaToDelete.VAGA} - {vagaToDelete.CARGO}
                </p>
                <p className="text-[10px] font-bold text-gray-400 uppercase mt-2">{vagaToDelete.UNIDADE}</p>
              </div>
              <div className="p-4 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest mb-8 w-full">
                Esta ação NÃO pode ser desfeita. O registro será apagado do banco.
              </div>
              <div className="grid grid-cols-2 gap-4 w-full">
                <button 
                  onClick={() => setVagaToDelete(null)}
                  className="px-6 py-4 bg-gray-100 text-gray-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all active:scale-95"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmDelete}
                  className="px-6 py-4 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-600 transition-all shadow-xl active:scale-95 border-b-4 border-black/20"
                >
                  Confirmar Exclusão
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e31e24;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #000;
        }
      `}</style>
    </div>
  );
};

export default AdminManagement;
