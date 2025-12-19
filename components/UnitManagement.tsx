
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { User } from '../types';
import { 
  ArrowLeft, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Search, 
  MapPin,
  Loader2,
  AlertCircle,
  Hash,
  Map
} from 'lucide-react';

interface UnitManagementProps {
  user: User;
  onBack: () => void;
}

interface UnitRecord {
  id: number;
  nome: string;
  created_at: string;
}

const UnitManagement: React.FC<UnitManagementProps> = ({ user, onBack }) => {
  const [units, setUnits] = useState<UnitRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<UnitRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form states
  const [formNome, setFormNome] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUnits = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('unidades')
      .select('*')
      .order('nome', { ascending: true });

    if (error) {
      console.error('Error fetching units:', error);
    } else {
      setUnits(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUnits();
  }, []);

  const handleOpenModal = (unit?: UnitRecord) => {
    setError(null);
    if (unit) {
      setEditingUnit(unit);
      setFormNome(unit.nome);
    } else {
      setEditingUnit(null);
      setFormNome('');
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError(null);

    try {
      if (editingUnit) {
        const { error: updateError } = await supabase
          .from('unidades')
          .update({ nome: formNome.trim() })
          .eq('id', editingUnit.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('unidades')
          .insert([{ nome: formNome.trim() }]);

        if (insertError) throw insertError;
      }
      
      setIsModalOpen(false);
      fetchUnits();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao processar solicitação.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja excluir esta unidade?')) return;

    try {
      const { error: deleteError } = await supabase
        .from('unidades')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      fetchUnits();
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message);
    }
  };

  const filteredUnits = units.filter(u => 
    u.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col font-sans">
      <header className="bg-black text-white px-8 py-5 flex items-center justify-between shadow-2xl relative z-10">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-800 rounded-full transition-colors text-white">
            <ArrowLeft size={24} />
          </button>
          <div className="bg-[#adff2f] p-2 rounded-lg transform -skew-x-12">
            <Map size={24} className="text-black transform skew-x-12" />
          </div>
          <h1 className="text-2xl font-black tracking-tighter uppercase italic">
            GESTÃO DE <span className="text-[#adff2f]">UNIDADES</span>
          </h1>
        </div>
        
        <button 
          onClick={() => handleOpenModal()}
          className="bg-[#adff2f] hover:bg-white text-black px-6 py-2.5 rounded-xl flex items-center justify-center font-black text-[10px] tracking-widest uppercase shadow-lg transform transition active:scale-95 space-x-2"
        >
          <Plus size={18} />
          <span>Nova Unidade</span>
        </button>
      </header>

      <main className="flex-1 p-8">
        <div className="mb-6 relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Pesquisar unidade..."
            className="w-full pl-12 pr-4 py-3 rounded-2xl border-2 border-gray-100 focus:border-black focus:outline-none transition-all font-bold text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-96 space-y-4">
              <Loader2 className="animate-spin text-[#e31e24]" size={40} />
              <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Carregando unidades...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead>
                  <tr className="bg-[#fafafa]">
                    <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">ID</th>
                    <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Nome da Unidade</th>
                    <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Criado em</th>
                    <th className="px-8 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredUnits.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-8 py-12 text-center text-gray-400 font-bold uppercase text-[10px] tracking-widest">
                        Nenhuma unidade encontrada.
                      </td>
                    </tr>
                  ) : (
                    filteredUnits.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-8 py-6">
                          <span className="px-2 py-1 bg-gray-100 rounded text-[10px] font-black text-gray-500">#{u.id}</span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-[#e31e24]">
                               <MapPin size={20} />
                            </div>
                            <div className="text-sm font-black text-black tracking-tighter">{u.nome}</div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="text-[10px] font-bold text-gray-400">
                            {new Date(u.created_at).toLocaleDateString('pt-BR')} às {new Date(u.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button 
                              onClick={() => handleOpenModal(u)}
                              className="p-2 text-gray-400 hover:text-black transition-colors bg-gray-50 hover:bg-gray-100 rounded-lg"
                              title="Editar"
                            >
                              <Edit size={18} />
                            </button>
                            <button 
                              onClick={() => handleDelete(u.id)}
                              className="p-2 text-red-300 hover:text-red-600 transition-colors bg-red-50/50 hover:bg-red-50 rounded-lg"
                              title="Excluir"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modal Nova/Editar Unidade */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden border-t-[10px] border-black transform transition-all animate-in fade-in zoom-in duration-200">
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-black uppercase tracking-tighter flex items-center space-x-3">
                {editingUnit ? <Edit size={24} className="text-[#e31e24]" /> : <Plus size={24} className="text-[#adff2f]" />}
                <span>{editingUnit ? 'Editar Unidade' : 'Nova Unidade'}</span>
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-300 hover:text-black transition-colors"><X size={32} /></button>
            </div>

            <form onSubmit={handleSave} className="p-8 space-y-6">
              {error && (
                <div className="p-4 bg-red-50 border-l-4 border-[#e31e24] text-red-700 text-[10px] font-black uppercase flex items-center space-x-2 rounded-xl">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-4">
                <div className="group">
                  <label className="text-[10px] font-black text-gray-900 uppercase tracking-widest block mb-2 ml-1">Nome da Unidade / Filial</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#e31e24] transition-colors" size={20} />
                    <input 
                      required 
                      autoFocus
                      className="w-full pl-12 pr-4 py-4 bg-white border-2 border-gray-100 focus:border-black rounded-2xl text-base font-black italic outline-none transition-all shadow-sm"
                      placeholder="Ex: Canoas - RS"
                      value={formNome}
                      onChange={(e) => setFormNome(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <button 
                  type="submit"
                  disabled={formLoading || !formNome.trim()}
                  className="w-full bg-black text-[#adff2f] py-5 rounded-[20px] font-black text-sm uppercase tracking-[0.2em] hover:bg-[#e31e24] hover:text-white active:scale-95 transition-all shadow-2xl flex items-center justify-center space-x-3 border-b-4 border-black/20"
                >
                  {formLoading ? <Loader2 className="animate-spin" size={24} /> : <><Save size={20} strokeWidth={3} /><span>{editingUnit ? 'Salvar Alterações' : 'Criar Unidade Agora'}</span></>}
                </button>
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full mt-3 text-gray-400 font-black text-[10px] uppercase tracking-widest py-2 hover:text-black transition-colors"
                >
                  Cancelar e voltar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnitManagement;
