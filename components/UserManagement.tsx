
import React, { useState, useEffect } from 'react';
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
  AlertCircle
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
  email?: string;
}

const UserManagement: React.FC<UserManagementProps> = ({ user, onBack }) => {
  const [profiles, setProfiles] = useState<ProfileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<ProfileRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form states
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formFullName, setFormFullName] = useState('');
  const [formRole, setFormRole] = useState('user');
  const [formUnidades, setFormUnidades] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfiles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('username', { ascending: true });

    if (error) {
      console.error('Error fetching profiles:', error);
    } else {
      setProfiles(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleOpenModal = (profile?: ProfileRecord) => {
    setError(null);
    if (profile) {
      setEditingProfile(profile);
      setFormUsername(profile.username || '');
      setFormFullName(profile.full_name || '');
      setFormRole(profile.role || 'user');
      setFormUnidades(profile.UNIDADES ? profile.UNIDADES.join(', ') : '');
      setFormEmail(''); 
      setFormPassword('');
    } else {
      setEditingProfile(null);
      setFormUsername('');
      setFormFullName('');
      setFormRole('user');
      setFormUnidades('');
      setFormEmail('');
      setFormPassword('');
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError(null);

    const unidadesArray = formUnidades.split(',').map(u => u.trim()).filter(u => u !== '');

    try {
      if (editingProfile) {
        // Atualização de Perfil Existente
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            username: formUsername,
            full_name: formFullName,
            role: formRole,
            UNIDADES: unidadesArray
          })
          .eq('id', editingProfile.id);

        if (updateError) throw updateError;
      } else {
        // Criação de Novo Usuário (Auth + Profile)
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
            // CRÍTICO: Garantir que o username e o full_name sejam persistidos na tabela profile.
            // Usamos upsert para garantir que se o gatilho automático de perfil já tiver criado a linha, nós a atualizamos.
            const { error: profileUpdateError } = await supabase
                .from('profiles')
                .upsert({
                    id: signUpData.user.id,
                    username: formUsername,
                    full_name: formFullName,
                    role: formRole,
                    UNIDADES: unidadesArray
                });
            
            if (profileUpdateError) throw profileUpdateError;
        }
      }
      
      setIsModalOpen(false);
      fetchProfiles();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao processar solicitação.');
    } finally {
      setFormLoading(false);
    }
  };

  const filteredProfiles = profiles.filter(p => {
    const s = searchTerm.toLowerCase();
    const usernameMatch = p.username ? p.username.toLowerCase().includes(s) : false;
    const nameMatch = p.full_name ? p.full_name.toLowerCase().includes(s) : false;
    return usernameMatch || nameMatch;
  });

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col font-sans">
      <header className="bg-black text-white px-8 py-5 flex items-center justify-between shadow-2xl relative z-10">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-800 rounded-full transition-colors text-white">
            <ArrowLeft size={24} />
          </button>
          <div className="bg-[#adff2f] p-2 rounded-lg transform -skew-x-12">
            <Shield size={24} className="text-black transform skew-x-12" />
          </div>
          <h1 className="text-2xl font-black tracking-tighter uppercase italic">
            GESTÃO DE <span className="text-[#adff2f]">USUÁRIOS</span>
          </h1>
        </div>
        
        <button 
          onClick={() => handleOpenModal()}
          className="bg-[#adff2f] hover:bg-white text-black px-6 py-2.5 rounded-xl flex items-center justify-center font-black text-[10px] tracking-widest uppercase shadow-lg transform transition active:scale-95 space-x-2"
        >
          <UserPlus size={18} />
          <span>Novo Usuário</span>
        </button>
      </header>

      <main className="flex-1 p-8">
        <div className="mb-6 relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Pesquisar por nome ou username..."
            className="w-full pl-12 pr-4 py-3 rounded-2xl border-2 border-gray-100 focus:border-black focus:outline-none transition-all font-bold text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-96 space-y-4">
              <Loader2 className="animate-spin text-[#e31e24]" size={40} />
              <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Carregando usuários...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead>
                  <tr className="bg-[#fafafa]">
                    <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Identificação</th>
                    <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Role / Permissão</th>
                    <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Unidades</th>
                    <th className="px-8 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredProfiles.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-8 py-6">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                             <UserIcon size={20} />
                          </div>
                          <div>
                            <div className="text-sm font-black text-black uppercase tracking-tighter">{p.username || 'SEM USERNAME'}</div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{p.full_name || 'Sem nome completo'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${p.role === 'admin' ? 'bg-black text-[#adff2f]' : 'bg-gray-100 text-gray-600'}`}>
                          {p.role || 'user'}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {p.UNIDADES && p.UNIDADES.length > 0 ? (
                            p.UNIDADES.map((u, i) => (
                              <span key={i} className="px-2 py-0.5 bg-gray-50 border border-gray-200 rounded text-[9px] font-bold uppercase text-gray-500">
                                {u}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-gray-300 italic font-bold">Nenhuma unidade</span>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button 
                          onClick={() => handleOpenModal(p)}
                          className="p-2 text-gray-400 hover:text-black transition-colors"
                        >
                          <Edit size={18} />
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

      {/* Modal Novo/Editar Usuário */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border-t-[10px] border-black transform transition-all animate-in fade-in zoom-in duration-200">
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-black uppercase tracking-tighter flex items-center space-x-3">
                {editingProfile ? <Edit size={24} /> : <UserPlus size={24} />}
                <span>{editingProfile ? 'Editar Usuário' : 'Novo Usuário'}</span>
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-black"><X size={28} /></button>
            </div>

            <form onSubmit={handleSave} className="p-8 space-y-5">
              {error && (
                <div className="p-4 bg-red-50 border-l-4 border-[#e31e24] text-red-700 text-[10px] font-black uppercase flex items-center space-x-2 rounded">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-4">
                {!editingProfile && (
                  <>
                    <div className="group">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1 ml-1">E-mail de Login</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                        <input 
                          required 
                          type="email"
                          className="w-full pl-11 pr-4 py-3 bg-gray-50 border-2 border-transparent focus:border-black rounded-xl text-sm font-bold outline-none transition-all"
                          placeholder="usuario@reiterlog.com"
                          value={formEmail}
                          onChange={(e) => setFormEmail(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="group">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1 ml-1">Senha Provisória</label>
                      <input 
                        required 
                        type="password"
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-black rounded-xl text-sm font-bold outline-none transition-all"
                        placeholder="••••••••"
                        value={formPassword}
                        onChange={(e) => setFormPassword(e.target.value)}
                      />
                    </div>
                  </>
                )}

                <div className="group">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1 ml-1">Username (Identificador)</label>
                  <input 
                    required 
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-black rounded-xl text-sm font-bold outline-none transition-all"
                    placeholder="ex: bruno.melo"
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value.toLowerCase())}
                  />
                </div>

                <div className="group">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1 ml-1">Nome Completo</label>
                  <input 
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-black rounded-xl text-sm font-bold outline-none transition-all"
                    placeholder="Ex: Bruno de Melo"
                    value={formFullName}
                    onChange={(e) => setFormFullName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1 ml-1">Role</label>
                    <select 
                      className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-black rounded-xl text-sm font-bold outline-none appearance-none"
                      value={formRole}
                      onChange={(e) => setFormRole(e.target.value)}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>

                <div className="group">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1 ml-1">Unidades (Separadas por vírgula)</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-4 text-gray-300" size={16} />
                    <textarea 
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 border-2 border-transparent focus:border-black rounded-xl text-xs font-bold outline-none transition-all min-h-[80px]"
                      placeholder="Ex: CANOAS, SAO PAULO, ALL"
                      value={formUnidades}
                      onChange={(e) => setFormUnidades(e.target.value.toUpperCase())}
                    />
                  </div>
                  <p className="text-[9px] text-gray-400 font-bold mt-1 ml-1">Dica: Use "ALL" para acesso total.</p>
                </div>
              </div>

              <div className="pt-6 flex space-x-3">
                <button 
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 bg-black text-[#adff2f] py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-xl flex items-center justify-center space-x-2"
                >
                  {formLoading ? <Loader2 className="animate-spin" size={20} /> : <><Save size={18} /><span>{editingProfile ? 'Salvar Alterações' : 'Criar Usuário'}</span></>}
                </button>
              </div>
              {!editingProfile && (
                 <p className="text-[9px] text-center text-gray-400 font-bold mt-4 uppercase">Aviso: A criação de novo usuário pode exigir confirmação de e-mail dependendo da config. do Supabase.</p>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
