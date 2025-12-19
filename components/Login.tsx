
import React, { useState } from 'react';
import { Truck, ShieldAlert, Loader2, Mail, Lock } from 'lucide-react';
import { supabase } from '../supabase';
import { User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError('E-mail ou senha incorretos.');
        setLoading(false);
        return;
      }

      if (authData.user) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, username, full_name, role, UNIDADES')
          .eq('id', authData.user.id)
          .single();

        if (profileError || !profileData) {
          setError('Perfil não encontrado. Contate o administrador.');
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }

        // Garantir que unidades seja um array limpo
        const unidadesArray = Array.isArray(profileData.UNIDADES) 
          ? profileData.UNIDADES 
          : [];

        const userData: User = {
          id: profileData.id,
          username: profileData.username,
          full_name: profileData.full_name,
          role: profileData.role,
          unidades: unidadesArray
        };

        onLogin(userData);
      }
    } catch (err) {
      console.error(err);
      setError('Erro ao conectar com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0f0f0f] p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border-t-[8px] border-[#e31e24] transform transition-all duration-300">
        <div className="p-10">
          <div className="flex justify-center mb-8">
            <div className="bg-[#e31e24] p-5 rounded-3xl rotate-2 shadow-2xl">
              <Truck className="w-14 h-14 text-white" />
            </div>
          </div>
          <h2 className="text-4xl font-black text-center text-black mb-1 tracking-tighter italic">
            REITER<span className="text-[#e31e24]">LOG</span>
          </h2>
          <p className="text-center text-gray-400 text-[10px] font-black uppercase tracking-[0.4em] mb-10">
            Internal Management System
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border-l-4 border-[#e31e24] text-red-700 text-xs font-bold rounded flex items-start space-x-3 animate-in fade-in slide-in-from-top-2">
                <ShieldAlert className="shrink-0 mt-0.5" size={16} />
                <span>{error}</span>
              </div>
            )}
            
            <div className="group">
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-1 transition-colors group-focus-within:text-[#e31e24]">
                E-mail Corporativo
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#e31e24] transition-colors" size={18} />
                <input
                  type="email"
                  className="w-full pl-12 pr-4 py-4 rounded-xl bg-gray-50 border-2 border-gray-100 focus:border-[#e31e24] focus:bg-white focus:outline-none transition-all font-semibold text-gray-800 placeholder-gray-300"
                  placeholder="usuario@reiterlog.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="group">
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-1 transition-colors group-focus-within:text-[#e31e24]">
                Senha de Acesso
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#e31e24] transition-colors" size={18} />
                <input
                  type="password"
                  className="w-full pl-12 pr-4 py-4 rounded-xl bg-gray-50 border-2 border-gray-100 focus:border-[#e31e24] focus:bg-white focus:outline-none transition-all font-semibold text-gray-800 placeholder-gray-300"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black hover:bg-[#1a1a1a] text-[#adff2f] font-black py-4 rounded-xl shadow-[0_15px_30px_-10px_rgba(0,0,0,0.3)] transform active:scale-[0.97] transition-all duration-200 tracking-[0.2em] text-sm flex items-center justify-center space-x-3"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>PROCESSANDO...</span>
                </>
              ) : (
                <span>ENTRAR NO SISTEMA</span>
              )}
            </button>
          </form>
        </div>
        <div className="bg-gray-50 py-5 text-center border-t border-gray-100">
          <p className="text-[10px] text-gray-300 font-bold uppercase tracking-[0.2em]">
            Reiterlog • R&S Department • v2.5
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
