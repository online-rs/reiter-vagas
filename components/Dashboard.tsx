
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { Vaga, User } from '../types';
import { Plus, LogOut, Clock, CheckCircle, AlertCircle, TrendingUp, User as UserIcon, Eye, ShieldCheck, Users } from 'lucide-react';
import NewVagaModal from './NewVagaModal';
import CloseVagaModal from './CloseVagaModal';
import VagaDetailsModal from './VagaDetailsModal';

interface DashboardProps {
  user: User;
  onLogout: () => void;
  onNavigateToUsers: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout, onNavigateToUsers }) => {
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNewVagaModalOpen, setIsNewVagaModalOpen] = useState(false);
  const [selectedVagaForClosing, setSelectedVagaForClosing] = useState<Vaga | null>(null);
  const [selectedVagaForDetails, setSelectedVagaForDetails] = useState<Vaga | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'closed'>('open');

  const isAllAccess = Array.isArray(user.unidades) && user.unidades.some(u => u?.toString().trim().toUpperCase() === 'ALL');
  const isAdmin = user.role === 'admin';

  const fetchVagas = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('vagas').select('*');
      
      if (filterStatus === 'open') {
        query = query.is('FECHAMENTO', null);
      } else if (filterStatus === 'closed') {
        query = query.not('FECHAMENTO', 'is', null);
      }

      if (!isAllAccess) {
        if (user.unidades && user.unidades.length > 0) {
          query = query.in('UNIDADE', user.unidades);
        } else {
          setVagas([]);
          setLoading(false);
          return;
        }
      }

      const { data, error } = await query.order('ABERTURA', { ascending: false });
      if (error) throw error;
      setVagas(data || []);
    } catch (error) {
      console.error('Erro ao buscar vagas:', error);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, user.unidades, isAllAccess]);

  useEffect(() => {
    fetchVagas();
  }, [fetchVagas]);

  const calculateDaysOpen = (abertura: string, fechamento?: string | null) => {
    const start = new Date(abertura);
    const end = fechamento ? new Date(fechamento) : new Date();
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

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
        
        <div className="flex items-center space-x-4 md:space-x-6">
          {isAdmin && (
            <button 
              onClick={onNavigateToUsers}
              className="flex items-center space-x-2 bg-gray-800 hover:bg-[#adff2f] hover:text-black text-[#adff2f] px-4 py-2 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest border border-gray-700"
            >
              <Users size={16} />
              <span className="hidden sm:inline">Gestão de Usuários</span>
            </button>
          )}

          <div className="flex items-center space-x-3 bg-[#111] px-4 py-2 rounded-xl border border-gray-800">
            <ShieldCheck size={16} className={isAllAccess ? "text-[#adff2f]" : "text-orange-500"} />
            <div className="text-right">
              <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest leading-none">Acesso</p>
              <p className="font-bold text-white text-xs uppercase">
                {isAllAccess ? 'TOTAL' : `${user.unidades?.length || 0} UNID.`}
              </p>
            </div>
          </div>

          <div className="text-right hidden lg:block">
            <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Colaborador</p>
            <p className="font-bold text-[#adff2f] text-sm">{user.username}</p>
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

      <div className="bg-white border-b border-gray-200 px-8 py-5 flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-sm">
        <div className="flex items-center space-x-2">
          <div className="bg-gray-100 p-1 rounded-xl flex">
            {['open', 'closed', 'all'].map((status) => (
              <button 
                key={status}
                onClick={() => setFilterStatus(status as any)}
                className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${filterStatus === status ? 'bg-black text-[#adff2f] shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
              >
                {status === 'open' ? 'Em Aberto' : status === 'closed' ? 'Finalizadas' : 'Ver Todas'}
              </button>
            ))}
          </div>
        </div>

        <button 
          onClick={() => setIsNewVagaModalOpen(true)}
          className="bg-[#e31e24] hover:bg-[#c0191e] text-white px-8 py-3.5 rounded-xl flex items-center justify-center font-black text-xs tracking-widest uppercase shadow-[0_10px_20px_-5px_rgba(227,30,36,0.3)] transform transition active:scale-95 space-x-3"
        >
          <Plus size={20} strokeWidth={3} />
          <span>Abrir Nova Vaga</span>
        </button>
      </div>

      <main className="flex-1 p-8">
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
                    <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Unidade / Setor</th>
                    <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Cargo</th>
                    <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Data Abertura</th>
                    <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Status Atual</th>
                    <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Gestor</th>
                    <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Criador</th>
                    <th className="px-8 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {vagas.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-8 py-24 text-center">
                        <div className="flex flex-col items-center justify-center space-y-3 opacity-30">
                           <AlertCircle size={48} />
                           <p className="font-bold uppercase tracking-widest text-xs">
                             {!user.unidades || user.unidades.length === 0 ? 'Nenhuma unidade atribuída ao seu perfil' : 'Nenhuma vaga encontrada para suas unidades'}
                           </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    vagas.map((vaga) => (
                      <tr 
                        key={vaga.id} 
                        className="hover:bg-gray-50/80 cursor-pointer transition-colors group"
                        onClick={() => setSelectedVagaForDetails(vaga)}
                      >
                        <td className="px-8 py-6">
                          <div className="text-sm font-black text-black uppercase tracking-tighter">{vaga.UNIDADE}</div>
                          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{vaga.SETOR}</div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="text-sm font-bold text-[#e31e24] uppercase italic">{vaga.CARGO}</div>
                          <div className="text-[10px] text-gray-400 font-medium">{vaga.TIPO} • {vaga.MOTIVO}</div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center space-x-2 text-gray-700">
                            <Clock size={14} className="text-gray-300" />
                            <span className="text-xs font-bold">{new Date(vaga.ABERTURA).toLocaleDateString('pt-BR')}</span>
                          </div>
                          <div className={`text-[10px] font-black mt-1 ${calculateDaysOpen(vaga.ABERTURA, vaga.FECHAMENTO) > 30 ? 'text-orange-500' : 'text-gray-400'}`}>
                            {calculateDaysOpen(vaga.ABERTURA, vaga.FECHAMENTO)} DIAS {vaga.FECHAMENTO ? 'TOTAL' : 'EM ABERTO'}
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          {vaga.FECHAMENTO ? (
                            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700 text-[10px] font-black uppercase tracking-widest border border-green-100">
                              <CheckCircle size={10} />
                              <span>Finalizada</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-orange-50 text-orange-700 text-[10px] font-black uppercase tracking-widest border border-orange-100">
                              <AlertCircle size={10} />
                              <span>Processando</span>
                            </span>
                          )}
                        </td>
                        <td className="px-8 py-6">
                          <span className="text-xs font-bold text-gray-600 uppercase">{vaga.GESTOR}</span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center space-x-2 text-gray-500">
                            <UserIcon size={12} className="text-gray-400" />
                            <span className="text-xs font-black uppercase tracking-tighter">{vaga['usuário_criador']}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button className="p-2 text-gray-300 group-hover:text-black transition-colors">
                              <Eye size={18} />
                            </button>
                            {!vaga.FECHAMENTO && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedVagaForClosing(vaga);
                                }}
                                className="bg-black hover:bg-[#222] text-white px-5 py-2 rounded-lg transition-all shadow-md text-[10px] font-black uppercase tracking-widest"
                              >
                                Finalizar
                              </button>
                            )}
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

      <footer className="bg-white border-t border-gray-100 py-4 px-8 flex justify-between items-center mt-auto">
        <p className="text-[9px] text-gray-400 font-black uppercase tracking-[0.3em]">
          Reiterlog Logística • Tecnologia de Gestão de Talentos
        </p>
      </footer>

      {isNewVagaModalOpen && (
        <NewVagaModal user={user} onClose={() => setIsNewVagaModalOpen(false)} onSuccess={() => { setIsNewVagaModalOpen(false); fetchVagas(); }} />
      )}
      {selectedVagaForClosing && (
        <CloseVagaModal user={user} vaga={selectedVagaForClosing} onClose={() => setSelectedVagaForClosing(null)} onSuccess={() => { setSelectedVagaForClosing(null); fetchVagas(); }} />
      )}
      {selectedVagaForDetails && (
        <VagaDetailsModal user={user} vaga={selectedVagaForDetails} onClose={() => setSelectedVagaForDetails(null)} onUpdate={() => { setSelectedVagaForDetails(null); fetchVagas(); }} />
      )}
    </div>
  );
};

export default Dashboard;
