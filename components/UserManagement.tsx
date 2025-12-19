
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabase';
import { User } from '../types';
import { 
  ArrowLeft, 
  UserPlus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Search, 
  Shield, 
  Mail, 
  User as UserIcon,
  MapPin,
  Loader2,
  AlertCircle,
  Check,
  ChevronsUpDown,
  ArrowUp,
  ArrowDown,
  Clock
} from 'lucide-react';

interface UserManagementProps {
  user: User;
  onBack: () => void;
}

interface ProfileRecord {
  id: string;
  username: string | null;
  full_name: string | null;
  role: string | null;
  UNIDADES: string[] | null;
  ultimo_login: string | null;
  email?: string;
}

type UserSortKey = keyof ProfileRecord;

const UserManagement: React.FC<UserManagementProps> = ({ user, onBack }) => {
  const [profiles, setProfiles] = useState<ProfileRecord[]>([]);
  const [availableUnits, setAvailableUnits] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<ProfileRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: UserSortKey; direction: 'asc' | 'desc' }>({ key: 'username', direction: 'asc' });

  const fetchProfiles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*');

    if (error) {
      console.error('Error fetching profiles:', error);
    } else {
      setProfiles(data || []);
    }
    setLoading(false);
  };

  const fetchAvailableUnits = async () => {
    const { data, error } = await supabase
      .from('unidades')
      .select('nome')
      .order('nome', { ascending: true });

    if (error) {
      console.error('Error fetching units:', error);
    } else {
      const unitNames = data.map(u => u.nome);
      setAvailableUnits(unitNames);
    }
  };

  useEffect(() => {
    fetchProfiles();
    fetchAvailableUnits();
  }, []);

  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formFullName, setFormFullName] = useState('');
  const [formRole, setFormRole] = useState('user');
  const [selectedUnidades, setSelectedUnidades] = useState<string[]>([]);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenModal = (profile?: ProfileRecord) => {
    setError(null);
    if (profile) {
      setEditingProfile(profile);
      setFormUsername(profile.username || '');
      setFormFullName(profile.full_name || '');
      setFormRole(profile.role || 'user');
      setSelectedUnidades(profile.UNIDADES || []);
      setFormEmail(''); 
      setFormPassword('');
    } else {
      setEditingProfile(null);
      setFormUsername('');
      setFormFullName('');
      setFormRole('user');
      setSelectedUnidades([]);
      setFormEmail('');
      setFormPassword('');
    }
    setIsModalOpen(true);
  };

  const toggleUnidade = (unit: string) => {
    setSelectedUnidades(prev => {
      if (unit === 'ALL') {
        return prev.includes('ALL') ? [] : ['ALL'];
      } else {
        const filtered = prev.filter(u => u !== 'ALL');
        if (filtered.includes(unit)) {
          return filtered.filter(u => u !== unit);
        } else {
          return [...filtered, unit];
        }
      }
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError(null);

    try {
      if (editingProfile) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            username: formUsername,
            full_name: formFullName,
            role: formRole,
            UNIDADES: selectedUnidades
          })
          .eq('id', editingProfile.id);

        if (updateError) throw updateError;
      } else {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: formEmail,
          password: formPassword,
          options: {
            data: {
              username: formUsername,
              full_name: formFullName,
            }
          }
        });

        if (signUpError) throw signUpError;

        if (signUpData.user) {
            const { error: profileUpdateError } = await supabase
                .from('profiles')
                .upsert({
                    id: signUpData.user.id,
                    username: formUsername,
                    full_name: formFullName,
                    role: formRole,
                    UNIDADES: selectedUnidades
                });
            
            if (profileUpdateError) throw profileUpdateError;
        }
      }
      
      setIsModalOpen(false);
      fetchProfiles();
    } catch (err: any) {
      setError(err.message || 'Erro ao processar solicitação.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleSort = (key: UserSortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const renderSortIcon = (key: UserSortKey) => {
    if (!sortConfig || sortConfig.key !== key) return <ChevronsUpDown size={14} className="ml-1 opacity-30" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="ml-1 text-[#e31e24]" /> : <ArrowDown size={14} className="ml-1 text-[#e31e24]" />;
  };

  const processedProfiles = useMemo(() => {
    let filtered = profiles.filter(p => {
      const s = searchTerm.toLowerCase();
      const usernameMatch = p.username ? p.username.toLowerCase().includes(s) : false;
      const nameMatch = p.full_name ? p.full_name.toLowerCase().includes(s) : false;
      return usernameMatch || nameMatch;
    });

    if (sortConfig) {
      filtered.sort((a, b) => {
        let aVal: any = a[sortConfig.key];
        let bVal: any = b[sortConfig.key];

        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        if (Array.isArray(aVal)) aVal = aVal.length;
        if (Array.isArray(bVal)) bVal = bVal.length;

        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [profiles, searchTerm, sortConfig]);

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col font-sans">
      <header className="bg-black text-white px-8 py-5 flex items-center justify-between shadow-2xl relative z-10">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-800 rounded-xl transition-all text-[#adff2f] active:scale-95">
            <ArrowLeft size={24} strokeWidth={3} />
          </button>
          <div className="bg-[#adff2f] p-2 rounded-lg transform -skew-x-12 shadow-lg">
            <Shield size={24} className="text-black transform skew-x-12" strokeWidth={3} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter uppercase italic leading-none text-white">
              SISTEMA DE <span className="text-[#adff2f]">USUÁRIOS</span>
            </h1>
            <p className="text-[9px] font-black text-[#adff2f] uppercase tracking-[0.3em] mt-1 opacity-80">Segurança & Autenticação</p>
          </div>
        </div>
        
        <button 
          onClick={() => handleOpenModal()}
          className="bg-[#adff2f] hover:bg-white text-black px-6 py-2.5 rounded-xl flex items-center justify-center font-black text-[10px] tracking-widest uppercase shadow-lg transform transition active:scale-95 space-x-2"
        >
          <UserPlus size={18} strokeWidth={3} />
          <span>Novo Usuário</span>
        </button>
      </header>

      <main className="flex-1 p-8">
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} strokeWidth={3} />
            <input 
              type="text" 
              placeholder="BUSCAR COLABORADOR POR NOME OU LOGIN..."
              className="w-full pl-12 pr-6 py-3.5 rounded-2xl border-2 border-gray-100 focus:border-black focus:outline-none transition-all font-bold text-xs uppercase tracking-widest placeholder-gray-400 bg-white shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="bg-black px-4 py-2 rounded-xl shadow-lg flex items-center space-x-3">
            <div className="w-2 h-2 rounded-full bg-[#adff2f] animate-pulse"></div>
            <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">{profiles.length} Usuários Ativos</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-96 space-y-4">
              <Loader2 className="animate-spin text-[#e31e24]" size={40} strokeWidth={3} />
              <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Atualizando registros corporativos...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead>
                  <tr className="bg-[#fafafa]">
                    <th onClick={() => handleSort('username')} className="group px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] cursor-pointer hover:bg-gray-100 transition-colors">
                      <div className="flex items-center">Identificação {renderSortIcon('username')}</div>
                    </th>
                    <th onClick={() => handleSort('role')} className="group px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] cursor-pointer hover:bg-gray-100 transition-colors">
                      <div className="flex items-center">Perfil {renderSortIcon('role')}</div>
                    </th>
                    <th onClick={() => handleSort('UNIDADES')} className="group px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] cursor-pointer hover:bg-gray-100 transition-colors">
                      <div className="flex items-center">Unidades {renderSortIcon('UNIDADES')}</div>
                    </th>
                    <th onClick={() => handleSort('ultimo_login')} className="group px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] cursor-pointer hover:bg-gray-100 transition-colors">
                      <div className="flex items-center">Último Login {renderSortIcon('ultimo_login')}</div>
                    </th>
                    <th className="px-8 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {processedProfiles.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50/80 transition-all group">
                      <td className="px-8 py-6">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 border border-gray-200">
                             <UserIcon size={22} strokeWidth={3} />
                          </div>
                          <div>
                            <div className="text-sm font-black text-black uppercase tracking-tighter leading-tight">{p.username || 'SEM USUÁRIO'}</div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mt-1">{p.full_name || 'CADASTRO INCOMPLETO'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border-2 ${p.role === 'admin' ? 'bg-black border-black text-[#adff2f]' : 'bg-white border-gray-200 text-gray-600'}`}>
                          {p.role || 'USER'}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-wrap gap-2 max-w-xs">
                          {p.UNIDADES && p.UNIDADES.length > 0 ? (
                            p.UNIDADES.map((u, i) => (
                              <span key={i} className="px-2.5 py-1 bg-gray-100 border border-gray-200 rounded-lg text-[9px] font-black uppercase text-gray-600 shadow-sm">
                                {u}
                              </span>
                            ))
                          ) : (
                            <span className="text-[9px] text-red-500 font-black uppercase italic">BLOQUEADO</span>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        {p.ultimo_login ? (
                          <div className="flex items-center space-x-3">
                            <Clock size={16} className="text-gray-300" />
                            <div>
                              <div className="text-xs font-bold text-gray-700">
                                {new Date(p.ultimo_login).toLocaleDateString('pt-BR')}
                              </div>
                              <div className="text-[10px] font-black text-[#e31e24] uppercase tracking-tighter">
                                {new Date(p.ultimo_login).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2 text-gray-300">
                            <AlertCircle size={16} />
                            <span className="text-[10px] font-black uppercase italic tracking-widest">Sem registro</span>
                          </div>
                        )}
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button 
                          onClick={() => handleOpenModal(p)}
                          className="p-3 text-gray-300 hover:text-black transition-colors bg-gray-50 hover:bg-gray-100 rounded-xl"
                        >
                          <Edit size={20} strokeWidth={3} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modal Reestilizado para ser mais compacto */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden border-t-[8px] border-black transform transition-all animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
              <div className="flex items-center space-x-4">
                <div className="bg-black p-3 rounded-2xl text-[#adff2f] shadow-lg">
                  {editingProfile ? <Edit size={24} strokeWidth={3} /> : <UserPlus size={24} strokeWidth={3} />}
                </div>
                <div>
                   <h2 className="text-xl font-black uppercase tracking-tighter italic text-black">
                     {editingProfile ? 'Editar' : 'Novo'} <span className="text-[#e31e24]">Usuário</span>
                   </h2>
                   <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Credenciais de Acesso</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-300 hover:text-black transition-all p-2 hover:bg-gray-200 rounded-full">
                <X size={32} strokeWidth={2.5} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
              {error && (
                <div className="p-4 bg-red-50 border-l-4 border-[#e31e24] text-red-700 text-[10px] font-black uppercase flex items-center space-x-3 rounded-xl shadow-sm">
                  <AlertCircle size={20} />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-5">
                  {!editingProfile && (
                    <>
                      <div className="group">
                        <label className="text-[10px] font-black text-gray-700 uppercase tracking-[0.2em] block mb-2 ml-1">E-mail Corporativo</label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} strokeWidth={3} />
                          <input 
                            required 
                            type="email"
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-100 focus:border-black focus:bg-white rounded-xl text-sm font-bold outline-none transition-all"
                            placeholder="usuario@reiterlog.com"
                            value={formEmail}
                            onChange={(e) => setFormEmail(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="group">
                        <label className="text-[10px] font-black text-gray-700 uppercase tracking-[0.2em] block mb-2 ml-1">Senha de Acesso</label>
                        <input 
                          required 
                          type="password"
                          className="w-full px-5 py-3 bg-gray-50 border-2 border-gray-100 focus:border-black focus:bg-white rounded-xl text-sm font-bold outline-none transition-all"
                          placeholder="••••••••"
                          value={formPassword}
                          onChange={(e) => setFormPassword(e.target.value)}
                        />
                      </div>
                    </>
                  )}

                  <div className="group">
                    <label className="text-[10px] font-black text-gray-700 uppercase tracking-[0.2em] block mb-2 ml-1">Identificador (Login)</label>
                    <input 
                      required 
                      className="w-full px-5 py-3 bg-gray-50 border-2 border-gray-100 focus:border-black focus:bg-white rounded-xl text-sm font-bold outline-none transition-all uppercase"
                      placeholder="ex: bruno.melo"
                      value={formUsername}
                      onChange={(e) => setFormUsername(e.target.value.toLowerCase())}
                    />
                  </div>

                  <div className="group">
                    <label className="text-[10px] font-black text-gray-700 uppercase tracking-[0.2em] block mb-2 ml-1">Nome Completo</label>
                    <input 
                      className="w-full px-5 py-3 bg-gray-50 border-2 border-gray-100 focus:border-black focus:bg-white rounded-xl text-sm font-bold outline-none transition-all uppercase"
                      placeholder="NOME DO COLABORADOR"
                      value={formFullName}
                      onChange={(e) => setFormFullName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-700 uppercase tracking-[0.2em] block mb-2 ml-1">Tipo de Permissão</label>
                    <select 
                      className="w-full px-5 py-3 bg-gray-50 border-2 border-gray-100 focus:border-black focus:bg-white rounded-xl text-sm font-bold outline-none appearance-none cursor-pointer"
                      value={formRole}
                      onChange={(e) => setFormRole(e.target.value)}
                    >
                      <option value="user">USER (OPERACIONAL)</option>
                      <option value="admin">ADMIN (ADMINISTRADOR)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-5">
                  <label className="text-[10px] font-black text-gray-700 uppercase tracking-[0.2em] block mb-2 ml-1 underline decoration-2 underline-offset-4 decoration-[#e31e24]">Filiais do Sistema</label>
                  <div className="bg-gray-50 p-6 rounded-2xl border-2 border-gray-100">
                    <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto pr-3 custom-scrollbar">
                      <button
                        type="button"
                        onClick={() => toggleUnidade('ALL')}
                        className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                          selectedUnidades.includes('ALL') 
                            ? 'bg-black border-black text-[#adff2f] shadow-lg scale-[1.02] font-black' 
                            : 'bg-white border-white text-gray-600 font-black hover:border-black'
                        }`}
                      >
                        <span className="text-[11px] font-black uppercase tracking-widest italic">ACESSO TOTAL (ALL)</span>
                        {selectedUnidades.includes('ALL') && <Check size={18} strokeWidth={5} />}
                      </button>

                      <div className="h-0.5 bg-gray-200 my-2 rounded-full"></div>

                      {availableUnits.map(unit => (
                        <button
                          key={unit}
                          type="button"
                          disabled={selectedUnidades.includes('ALL')}
                          onClick={() => toggleUnidade(unit)}
                          className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                            selectedUnidades.includes(unit) 
                              ? 'bg-[#adff2f] border-black text-black shadow-md font-black' 
                              : selectedUnidades.includes('ALL')
                                ? 'bg-gray-50 border-transparent text-gray-300 opacity-40 cursor-not-allowed'
                                : 'bg-white border-white text-gray-600 font-black hover:border-black'
                          }`}
                        >
                          <span className="text-[10px] uppercase tracking-widest font-black">{unit}</span>
                          {selectedUnidades.includes(unit) && <Check size={16} strokeWidth={5} />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 shrink-0">
                <button 
                  type="submit"
                  disabled={formLoading}
                  className="w-full bg-black text-[#adff2f] py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-[#e31e24] hover:text-white active:scale-95 transition-all shadow-xl flex items-center justify-center space-x-3 border-b-4 border-black/20"
                >
                  {formLoading ? <Loader2 className="animate-spin" size={24} /> : <><Save size={20} strokeWidth={4} /><span>{editingProfile ? 'SALVAR ALTERAÇÕES' : 'CONFIRMAR CADASTRO'}</span></>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #ccc;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #adff2f;
        }
      `}</style>
    </div>
  );
};

export default UserManagement;
