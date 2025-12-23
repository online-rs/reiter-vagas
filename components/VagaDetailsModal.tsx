
import React, { useState } from 'react';
import { supabase } from '../supabase';
import { User, Vaga } from '../types';
import { X, MessageSquare, RotateCcw, Send, Calendar, User as UserIcon, Briefcase, MapPin, Loader2, Info, CheckCircle, UserMinus, UserPlus, Clock, Hash, ShieldCheck, Snowflake, Flame, Lock } from 'lucide-react';

interface VagaDetailsModalProps {
  user: User;
  vaga: Vaga;
  onClose: () => void;
  onUpdate: () => void;
  onCloseVagaAction?: (vaga: Vaga) => void;
}

const VagaDetailsModal: React.FC<VagaDetailsModalProps> = ({ user, vaga, onClose, onUpdate, onCloseVagaAction }) => {
  const [newComment, setNewComment] = useState('');
  const [reopenReason, setReopenReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [isReopenConfirmOpen, setIsReopenConfirmOpen] = useState(false);

  const isAdmin = user.role === 'admin';

  const calculateDaysOpen = (abertura: string, fechamento?: string | null) => {
    const start = new Date(abertura);
    const end = fechamento ? new Date(fechamento) : new Date();
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setLoading(true);

    const formattedComment = `${new Date().toLocaleDateString('pt-BR')} ${user.username}: ${newComment.trim()}`;
    const updatedObservations = [...(vaga.OBSERVACOES || []), formattedComment];

    const { error } = await supabase
      .from('vagas')
      .update({ OBSERVACOES: updatedObservations })
      .eq('id', vaga.id);

    if (error) {
      alert('Erro ao adicionar comentário: ' + error.message);
    } else {
      setNewComment('');
      onUpdate();
    }
    setLoading(false);
  };

  const handleToggleFreeze = async () => {
    setLoading(true);
    const newState = !vaga.CONGELADA;
    const dateStr = new Date().toLocaleDateString('pt-BR');
    const log = `${dateStr} [ADMIN/${user.username}]: Vaga ${newState ? 'CONGELADA' : 'DESCONGELADA'} no sistema.`;
    const updatedObservations = [...(vaga.OBSERVACOES || []), log];

    const { error } = await supabase
      .from('vagas')
      .update({ 
        CONGELADA: newState,
        OBSERVACOES: updatedObservations
      })
      .eq('id', vaga.id);

    if (error) {
      alert('Erro ao alterar estado da vaga: ' + error.message);
    } else {
      onUpdate();
    }
    setLoading(false);
  };

  const handleReopenVaga = async () => {
    if (!reopenReason.trim()) {
      alert('Por favor, informe o motivo da reabertura.');
      return;
    }
    setLoading(true);

    const dateStr = new Date().toLocaleDateString('pt-BR');
    const reopenObs = `${dateStr} ${user.username}: Vaga REABERTA. Motivo: ${reopenReason}. (Vaga de ${vaga.CARGO} em ${vaga.UNIDADE}. Anteriormente fechada com: ${vaga.NOME_SUBSTITUICAO || 'Não informado'}).`;
    
    const updatedObservations = [...(vaga.OBSERVACOES || []), reopenObs];

    const { error } = await supabase
      .from('vagas')
      .update({
        FECHAMENTO: null,
        NOME_SUBSTITUICAO: null,
        usuario_fechador: null,
        RECRUTADOR: null,
        OBSERVACOES: updatedObservations,
        CONGELADA: false
      })
      .eq('id', vaga.id);

    if (error) {
      alert('Erro ao reabrir vaga: ' + error.message);
    } else {
      onUpdate();
      setIsReopenConfirmOpen(false);
    }
    setLoading(false);
  };

  const daysOpen = calculateDaysOpen(vaga.ABERTURA, vaga.FECHAMENTO);
  const labelStyle = "text-[11px] font-black text-gray-900 uppercase tracking-widest block mb-1.5";
  const dataStyle = "text-[16px] font-black text-black uppercase tracking-tight italic";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className={`bg-white w-full max-w-6xl rounded-[40px] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col md:flex-row h-[90vh] max-h-[90vh] border-t-[12px] border-x border-b border-gray-200 ${vaga.CONGELADA && !vaga.FECHAMENTO ? 'border-t-blue-600' : 'border-t-black'}`}>
        
        {/* LADO ESQUERDO: DETALHES DA VAGA */}
        <div className="w-full md:w-5/12 bg-gray-50/80 p-10 overflow-y-auto border-r-2 border-gray-100 flex flex-col">
          <div className="flex justify-between items-start mb-10 md:hidden">
             <h2 className="text-3xl font-black uppercase tracking-tighter">Detalhes</h2>
             <button onClick={onClose} className="text-black bg-gray-200 p-2 rounded-full"><X size={32} /></button>
          </div>

          <div className="space-y-10 flex-1">
            <div className={`bg-white p-8 rounded-[30px] shadow-sm border-2 relative overflow-hidden ${vaga.CONGELADA && !vaga.FECHAMENTO ? 'border-blue-100' : 'border-gray-100'}`}>
              <div className={`absolute top-0 left-0 w-3 h-full ${vaga.CONGELADA && !vaga.FECHAMENTO ? 'bg-blue-600' : 'bg-[#e31e24]'}`}></div>
              
              <div className="flex justify-between items-start">
                <div className="flex-1 pr-4">
                  <label className={`text-[11px] font-black uppercase tracking-widest block mb-1 ${vaga.CONGELADA && !vaga.FECHAMENTO ? 'text-blue-600' : 'text-[#e31e24]'}`}>Cargo Selecionado</label>
                  <div className="text-3xl font-black uppercase text-black italic leading-tight">{vaga.CARGO}</div>
                </div>
                <div className="bg-gray-100 px-4 py-2 rounded-2xl border-2 border-gray-200 shadow-inner text-right shrink-0">
                  <span className="text-[10px] font-black text-gray-400 uppercase block mb-0.5 tracking-widest leading-none">Nº Vaga</span>
                  <span className="text-xl font-black text-black leading-none">#{vaga.VAGA || '---'}</span>
                </div>
              </div>

              <div className="flex items-center space-x-4 mt-6">
                {vaga.FECHAMENTO ? (
                   <span className="px-4 py-1.5 rounded-xl bg-green-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg">FINALIZADA</span>
                ) : vaga.CONGELADA ? (
                  <span className="px-4 py-1.5 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center space-x-2">
                    <Snowflake size={12} />
                    <span>CONGELADA</span>
                  </span>
                ) : (
                   <span className="px-4 py-1.5 rounded-xl bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg">EM ABERTO</span>
                )}
                <span className="text-[10px] text-gray-900 font-black uppercase tracking-widest bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200">{vaga.TIPO}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-8 px-2">
              <div className="flex items-start space-x-5">
                <div className="bg-white p-3 rounded-2xl text-black border-2 border-gray-100 shadow-sm">
                    <MapPin size={24} strokeWidth={3} />
                </div>
                <div>
                  <label className={labelStyle}>Unidade / Setor</label>
                  <p className={dataStyle}>{vaga.UNIDADE} <span className="text-[#e31e24] mx-1">•</span> {vaga.SETOR}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start space-x-5">
                  <div className="bg-white p-3 rounded-2xl text-black border-2 border-gray-100 shadow-sm">
                      <Briefcase size={24} strokeWidth={3} />
                  </div>
                  <div>
                    <label className={labelStyle}>Gestor Direto</label>
                    <p className={dataStyle}>{vaga.GESTOR}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-5">
                  <div className="bg-white p-3 rounded-2xl text-black border-2 border-gray-100 shadow-sm">
                      <ShieldCheck size={24} strokeWidth={3} />
                  </div>
                  <div>
                    <label className={labelStyle}>Gerente Resp.</label>
                    <p className={dataStyle}>{vaga.GERENTE || '---'}</p>
                  </div>
                </div>
              </div>

              {vaga.NOME_SUBSTITUIDO && (
                <div className="flex items-start space-x-5 p-6 bg-red-50 rounded-[30px] border-2 border-red-100 shadow-sm">
                  <div className="bg-red-200 p-3 rounded-2xl text-red-700">
                      <UserMinus size={24} strokeWidth={3} />
                  </div>
                  <div>
                    <label className="text-[11px] font-black text-red-600 uppercase tracking-widest block mb-1.5">Pessoa Substituída</label>
                    <p className="text-xl font-black text-red-900 uppercase italic tracking-tight">{vaga.NOME_SUBSTITUIDO}</p>
                    <p className="text-[10px] font-black text-red-500 uppercase mt-2 bg-white w-fit px-2 py-0.5 rounded border border-red-100 shadow-sm">MOTIVO: {vaga.MOTIVO}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4 mt-8">
              {!vaga.FECHAMENTO && !vaga.CONGELADA && (
                <button 
                  onClick={() => onCloseVagaAction?.(vaga)}
                  className="w-full flex items-center justify-center space-x-4 py-5 bg-black text-[#adff2f] rounded-[25px] font-black text-sm uppercase tracking-[0.2em] hover:bg-[#e31e24] hover:text-white transition-all shadow-2xl active:scale-95 border-b-8 border-black active:border-b-0"
                >
                  <CheckCircle size={22} strokeWidth={3} />
                  <span>Finalizar Vaga</span>
                </button>
              )}

              {vaga.CONGELADA && !vaga.FECHAMENTO && (
                <div className="p-6 bg-blue-50 border-2 border-blue-200 rounded-[25px] flex items-center space-x-4 shadow-inner">
                   <div className="bg-blue-600 p-2 rounded-full text-white">
                      <Lock size={20} />
                   </div>
                   <p className="text-[10px] font-black text-blue-700 uppercase leading-relaxed">
                      A finalização está bloqueada pois a vaga está congelada. 
                      <br/>Peça a um administrador para retomar o fluxo.
                   </p>
                </div>
              )}

              {isAdmin && !vaga.FECHAMENTO && (
                <button 
                  onClick={handleToggleFreeze}
                  disabled={loading}
                  className={`w-full flex items-center justify-center space-x-4 py-5 rounded-[25px] font-black text-sm uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 border-b-8 active:border-b-0 ${vaga.CONGELADA ? 'bg-orange-500 text-white border-orange-700' : 'bg-blue-600 text-white border-blue-800'}`}
                >
                  {loading ? <Loader2 className="animate-spin" size={22} /> : vaga.CONGELADA ? <><Flame size={22} /><span>Retomar Fluxo</span></> : <><Snowflake size={22} /><span>Congelar Vaga</span></>}
                </button>
              )}

              {vaga.FECHAMENTO && (
                <>
                  {!isReopenConfirmOpen && (
                    <button 
                      onClick={() => setIsReopenConfirmOpen(true)}
                      className="w-full flex items-center justify-center space-x-4 py-5 bg-black text-[#adff2f] rounded-[25px] font-black text-sm uppercase tracking-[0.2em] hover:bg-[#e31e24] hover:text-white transition-all shadow-2xl group active:scale-95 border-b-8 border-black active:border-b-0"
                    >
                      <RotateCcw size={22} strokeWidth={3} className="group-hover:rotate-[-45deg] transition-transform" />
                      <span>Reabrir Vaga</span>
                    </button>
                  )}
                </>
              )}
            </div>

            {isReopenConfirmOpen && (
              <div className="mt-8 p-8 bg-black rounded-[35px] border-t-[12px] border-[#e31e24] shadow-2xl animate-in slide-in-from-bottom-10 duration-300">
                <label className="block text-[12px] font-black text-[#adff2f] uppercase tracking-widest mb-4">Justificativa da Reabertura</label>
                <textarea 
                  className="w-full bg-gray-900 text-white rounded-[20px] p-6 text-sm font-bold focus:ring-4 focus:ring-[#adff2f]/20 outline-none min-h-[120px] border-2 border-gray-800 transition-all"
                  placeholder="Explique o motivo para auditar..."
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                />
                <div className="flex flex-col space-y-3 mt-6">
                  <button 
                    onClick={handleReopenVaga}
                    disabled={loading}
                    className="w-full bg-[#adff2f] text-black py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg"
                  >
                    {loading ? <Loader2 className="animate-spin mx-auto" size={24} /> : 'CONFIRMAR REABERTURA AGORA'}
                  </button>
                  <button 
                    onClick={() => setIsReopenConfirmOpen(false)}
                    className="w-full bg-gray-800 text-gray-400 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:text-white hover:bg-gray-700 transition-all"
                  >
                    CANCELAR E VOLTAR
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* LADO DIREITO: LINHA DO TEMPO ROLÁVEL COM INPUT FIXO */}
        <div className="flex-1 flex flex-col h-full bg-white relative overflow-hidden">
          {/* HEADER DA LINHA DO TEMPO */}
          <div className="flex items-center justify-between p-8 border-b-4 border-gray-50 bg-white shrink-0">
            <div className="flex items-center space-x-4 text-black">
              <div className="bg-black p-3 rounded-2xl text-white shadow-lg">
                <MessageSquare size={24} strokeWidth={3} />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase tracking-[0.1em] italic">Linha do Tempo</h2>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Histórico de Observações</p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-200 hover:text-black hover:bg-gray-100 p-3 rounded-full transition-all"><X size={40} strokeWidth={2.5} /></button>
          </div>

          {/* LISTA DE MENSAGENS (ROLÁVEL) */}
          <div className="flex-1 overflow-y-auto p-10 space-y-10 bg-[#fdfdfd] custom-scrollbar">
            {vaga.OBSERVACOES && vaga.OBSERVACOES.length > 0 ? (
              [...vaga.OBSERVACOES].reverse().map((obs, idx) => {
                const parts = obs.split(': ');
                const header = parts[0];
                const content = parts.slice(1).join(': ');
                
                return (
                  <div key={idx} className="flex flex-col animate-in fade-in slide-in-from-right-10" style={{ animationDelay: `${idx * 60}ms` }}>
                    <div className="flex items-center space-x-3 mb-4">
                      <div className={`w-3 h-3 rounded-full shadow-[0_0_15px_rgba(227,30,36,0.6)] ring-4 ring-red-50 ${obs.includes('CONGELADA') ? 'bg-blue-600' : 'bg-[#e31e24]'}`}></div>
                      <span className="text-[12px] font-black text-gray-900 uppercase tracking-tighter bg-gray-100 px-3 py-1 rounded-xl border border-gray-200 shadow-sm">{header}</span>
                    </div>
                    <div className={`ml-6 p-7 rounded-[30px] bg-white border-2 text-base font-bold text-gray-800 leading-relaxed shadow-[0_10px_30px_-15px_rgba(0,0,0,0.1)] hover:border-black/10 transition-all relative ${obs.includes('CONGELADA') ? 'border-blue-100' : 'border-gray-100'}`}>
                      <div className="absolute top-4 -left-2 w-4 h-4 bg-white border-l-2 border-b-2 border-inherit rotate-45"></div>
                      {content}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-30 grayscale scale-110">
                <MessageSquare size={80} className="mb-6 text-gray-400" />
                <p className="text-lg font-black uppercase tracking-widest text-center">Aguardando<br/>atualizações...</p>
              </div>
            )}
          </div>

          {/* INPUT DE COMENTÁRIO (FIXO NO RODAPÉ) */}
          <div className="p-8 border-t-4 border-gray-50 bg-gray-50/50 shrink-0">
            <form onSubmit={handleAddComment} className="relative max-w-4xl mx-auto">
              <textarea 
                className="w-full bg-white border-2 border-gray-200 rounded-[30px] px-8 py-6 text-base font-bold text-gray-900 focus:border-black focus:ring-8 focus:ring-black/5 focus:outline-none transition-all pr-24 shadow-2xl placeholder-gray-400 min-h-[100px] max-h-[150px] resize-none"
                placeholder="Insira um novo comentário relevante sobre o andamento..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                disabled={loading}
              />
              <button 
                type="submit"
                disabled={loading || !newComment.trim()}
                className="absolute right-5 bottom-5 p-5 bg-black text-[#adff2f] rounded-[22px] hover:bg-[#e31e24] hover:text-white transition-all disabled:opacity-30 shadow-2xl active:scale-90 group ring-4 ring-transparent hover:ring-red-100"
                title="Publicar Comentário"
              >
                {loading ? <Loader2 className="animate-spin" size={24} /> : <Send size={24} strokeWidth={3} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
              </button>
            </form>
          </div>
        </div>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
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
          background: #e31e24;
        }
      `}</style>
    </div>
  );
};

export default VagaDetailsModal;
