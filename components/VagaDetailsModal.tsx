import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { User, Vaga } from '../types';
import { 
  X, MessageSquare, RotateCcw, Send, Calendar, Briefcase, 
  MapPin, Loader2, CheckCircle, UserMinus, UserPlus, 
  Clock, ShieldCheck, Snowflake, Flame, Lock 
} from 'lucide-react';

interface VagaDetailsModalProps {
  user: User;
  vaga: Vaga;
  onClose: () => void;
  onUpdate: () => void;
  onCloseVagaAction?: (vaga: Vaga) => void;
}

const VagaDetailsModal: React.FC<VagaDetailsModalProps> = ({ 
  user, 
  vaga, 
  onClose, 
  onUpdate, 
  onCloseVagaAction 
}) => {
  const [newComment, setNewComment] = useState('');
  const [reopenReason, setReopenReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [isReopenConfirmOpen, setIsReopenConfirmOpen] = useState(false);

  const isAdmin = user.role === 'admin';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

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
  const labelStyle = "text-[9px] font-black text-gray-400 uppercase tracking-wider block leading-none mb-1";
  const dataStyle = "text-xs font-black text-gray-900 uppercase tracking-tight";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className={`bg-white w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[88vh] max-h-[740px] border-t-4 border-x border-b border-gray-200 ${vaga.CONGELADA && !vaga.FECHAMENTO ? 'border-t-blue-600' : 'border-t-black'}`}>
        
        {/* LADO ESQUERDO: DETALHES DA VAGA */}
        <div className="w-full md:w-5/12 bg-gray-50/90 p-4 md:p-5 overflow-y-auto border-r border-gray-200 flex flex-col justify-between custom-scrollbar">
          <div className="flex justify-between items-center mb-3 md:hidden">
            <h2 className="text-base font-black uppercase tracking-tight">Detalhes da Vaga</h2>
            <button onClick={onClose} className="text-gray-600 bg-gray-200 hover:bg-gray-300 p-1.5 rounded-full transition-all">
              <X size={18} />
            </button>
          </div>

          <div className="space-y-3 flex-1">
            {/* Card Cargo & Vaga */}
            <div className={`bg-white p-3.5 rounded-xl shadow-xs border relative overflow-hidden ${vaga.CONGELADA && !vaga.FECHAMENTO ? 'border-blue-200' : 'border-gray-200'}`}>
              <div className={`absolute top-0 left-0 w-1.5 h-full ${vaga.CONGELADA && !vaga.FECHAMENTO ? 'bg-blue-600' : 'bg-[#e31e24]'}`}></div>
              
              <div className="flex justify-between items-start pl-1.5">
                <div className="flex-1 pr-2">
                  <span className={`text-[9px] font-black uppercase tracking-wider block mb-0.5 ${vaga.CONGELADA && !vaga.FECHAMENTO ? 'text-blue-600' : 'text-[#e31e24]'}`}>
                    Cargo Selecionado
                  </span>
                  <h3 className="text-base md:text-lg font-black uppercase text-gray-900 tracking-tight leading-snug">
                    {vaga.CARGO}
                  </h3>
                </div>
                <div className="bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-200 text-right shrink-0">
                  <span className="text-[8px] font-bold text-gray-400 uppercase block tracking-wider leading-none">Nº Vaga</span>
                  <span className="text-xs font-black text-gray-900 leading-none mt-0.5 block">#{vaga.VAGA || '---'}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pl-1.5">
                {vaga.FECHAMENTO ? (
                  <span className="px-2 py-0.5 rounded-md bg-green-600 text-white text-[9px] font-black uppercase tracking-wider shadow-xs">
                    FINALIZADA
                  </span>
                ) : vaga.CONGELADA ? (
                  <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white text-[9px] font-black uppercase tracking-wider shadow-xs flex items-center space-x-1">
                    <Snowflake size={10} />
                    <span>CONGELADA</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md bg-orange-500 text-white text-[9px] font-black uppercase tracking-wider shadow-xs">
                    EM ABERTO
                  </span>
                )}
                <span className="text-[9px] text-gray-700 font-bold uppercase tracking-wider bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200">
                  {vaga.TIPO}
                </span>
                {vaga.TURNO && (
                  <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200">
                    {vaga.TURNO}
                  </span>
                )}
              </div>
            </div>

            {/* Grid de Informações */}
            <div className="space-y-2">
              {/* Unidade & Setor */}
              <div className="bg-white p-2.5 rounded-xl border border-gray-200 flex items-start space-x-2.5 shadow-2xs">
                <div className="bg-red-50 p-1.5 rounded-lg text-[#e31e24] shrink-0 border border-red-100">
                  <MapPin size={15} strokeWidth={2.5} />
                </div>
                <div className="min-w-0 flex-1">
                  <label className={labelStyle}>Unidade / Setor</label>
                  <p className={dataStyle}>
                    {vaga.UNIDADE} <span className="text-[#e31e24] mx-1">•</span> {vaga.SETOR}
                  </p>
                </div>
              </div>

              {/* Gestor & Gerente */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white p-2.5 rounded-xl border border-gray-200 flex items-start space-x-2 shadow-2xs">
                  <div className="bg-gray-100 p-1.5 rounded-lg text-gray-700 shrink-0 border border-gray-200">
                    <Briefcase size={13} strokeWidth={2.5} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <label className={labelStyle}>Gestor Direto</label>
                    <p className={`${dataStyle} truncate`} title={vaga.GESTOR}>{vaga.GESTOR}</p>
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-gray-200 flex items-start space-x-2 shadow-2xs">
                  <div className="bg-gray-100 p-1.5 rounded-lg text-gray-700 shrink-0 border border-gray-200">
                    <ShieldCheck size={13} strokeWidth={2.5} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <label className={labelStyle}>Gerente Resp.</label>
                    <p className={`${dataStyle} truncate`} title={vaga.GERENTE || '---'}>{vaga.GERENTE || '---'}</p>
                  </div>
                </div>
              </div>

              {/* Abertura e Dias */}
              <div className="bg-white p-2.5 rounded-xl border border-gray-200 flex items-center justify-between shadow-2xs">
                <div className="flex items-center space-x-2">
                  <div className="bg-gray-100 p-1.5 rounded-lg text-gray-700 shrink-0 border border-gray-200">
                    <Calendar size={13} strokeWidth={2.5} />
                  </div>
                  <div>
                    <label className="text-[8px] font-bold text-gray-400 uppercase tracking-wider block leading-none">Data Abertura</label>
                    <p className="text-[11px] font-black text-gray-900 uppercase mt-0.5">
                      {new Date(vaga.ABERTURA).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-1.5 text-right">
                  <div>
                    <label className="text-[8px] font-bold text-gray-400 uppercase tracking-wider block leading-none">Tempo em Aberto</label>
                    <span className={`text-[11px] font-black uppercase mt-0.5 inline-block ${daysOpen > 30 ? 'text-orange-600' : 'text-gray-900'}`}>
                      {daysOpen} DIAS
                    </span>
                  </div>
                  <div className={`p-1.5 rounded-lg shrink-0 ${daysOpen > 30 ? 'bg-orange-50 text-orange-600' : 'bg-gray-100 text-gray-700'}`}>
                    <Clock size={13} strokeWidth={2.5} />
                  </div>
                </div>
              </div>

              {/* Pessoa Substituída */}
              {vaga.NOME_SUBSTITUIDO && (
                <div className="p-2.5 bg-red-50/70 rounded-xl border border-red-100 flex items-start space-x-2.5 shadow-2xs">
                  <div className="bg-red-100 p-1.5 rounded-lg text-red-600 shrink-0">
                    <UserMinus size={14} strokeWidth={2.5} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <label className="text-[9px] font-black text-red-600 uppercase tracking-wider block leading-none">Pessoa Substituída</label>
                      {vaga.MOTIVO && (
                        <span className="text-[8px] font-bold text-red-700 uppercase bg-white px-1.5 py-0.2 rounded border border-red-200">
                          {vaga.MOTIVO}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-black text-red-950 uppercase tracking-tight truncate mt-0.5">
                      {vaga.NOME_SUBSTITUIDO}
                    </p>
                  </div>
                </div>
              )}

              {/* Candidato Contratado */}
              {vaga.NOME_SUBSTITUICAO && (
                <div className="p-2.5 bg-green-50/70 rounded-xl border border-green-100 flex items-start space-x-2.5 shadow-2xs">
                  <div className="bg-green-100 p-1.5 rounded-lg text-green-700 shrink-0">
                    <UserPlus size={14} strokeWidth={2.5} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <label className="text-[9px] font-black text-green-700 uppercase tracking-wider block leading-none">Candidato Contratado</label>
                    <p className="text-xs font-black text-green-950 uppercase tracking-tight truncate mt-0.5">
                      {vaga.NOME_SUBSTITUICAO}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="space-y-2 pt-3 border-t border-gray-200 mt-2">
            {!vaga.FECHAMENTO && !vaga.CONGELADA && (
              <button 
                onClick={() => onCloseVagaAction?.(vaga)}
                className="w-full flex items-center justify-center space-x-2 py-2.5 bg-black hover:bg-[#e31e24] text-[#41a900] hover:text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-98"
              >
                <CheckCircle size={15} strokeWidth={2.5} />
                <span>Finalizar Vaga</span>
              </button>
            )}

            {vaga.CONGELADA && !vaga.FECHAMENTO && (
              <div className="p-2 bg-blue-50 border border-blue-200 rounded-xl flex items-center space-x-2">
                <div className="bg-blue-600 p-1 rounded text-white shrink-0">
                  <Lock size={12} />
                </div>
                <p className="text-[9px] font-bold text-blue-800 uppercase leading-snug">
                  Vaga congelada. Descongele para finalizar.
                </p>
              </div>
            )}

            {isAdmin && !vaga.FECHAMENTO && (
              <button 
                onClick={handleToggleFreeze}
                disabled={loading}
                className={`w-full flex items-center justify-center space-x-2 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all shadow-sm active:scale-98 ${
                  vaga.CONGELADA ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {loading ? <Loader2 className="animate-spin" size={14} /> : vaga.CONGELADA ? <><Flame size={14} /><span>Retomar Fluxo</span></> : <><Snowflake size={14} /><span>Congelar Vaga</span></>}
              </button>
            )}

            {vaga.FECHAMENTO && !isReopenConfirmOpen && (
              <button 
                onClick={() => setIsReopenConfirmOpen(true)}
                className="w-full flex items-center justify-center space-x-2 py-2.5 bg-black hover:bg-[#e31e24] text-[#41a900] hover:text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-98"
              >
                <RotateCcw size={15} strokeWidth={2.5} />
                <span>Reabrir Vaga</span>
              </button>
            )}

            {isReopenConfirmOpen && (
              <div className="p-3 bg-black rounded-xl border border-gray-800 shadow-xl animate-in fade-in duration-200">
                <label className="block text-[9px] font-black text-[#41a900] uppercase tracking-wider mb-1">Motivo da Reabertura</label>
                <textarea 
                  className="w-full bg-gray-900 text-white rounded-lg p-2 text-xs font-medium focus:ring-1 focus:ring-[#41a900] outline-none min-h-[55px] border border-gray-800 transition-all resize-none"
                  placeholder="Informe o motivo da reabertura..."
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                />
                <div className="flex space-x-2 mt-2">
                  <button 
                    onClick={handleReopenVaga}
                    disabled={loading}
                    className="flex-1 bg-[#41a900] hover:bg-[#368b00] text-black py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                  >
                    {loading ? <Loader2 className="animate-spin mx-auto" size={14} /> : 'Confirmar'}
                  </button>
                  <button 
                    onClick={() => setIsReopenConfirmOpen(false)}
                    className="px-3 bg-gray-800 text-gray-300 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-gray-700"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* LADO DIREITO: LINHA DO TEMPO */}
        <div className="flex-1 flex flex-col h-full bg-white relative overflow-hidden">
          {/* HEADER DA LINHA DO TEMPO */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-white shrink-0">
            <div className="flex items-center space-x-2 text-black">
              <div className="bg-black p-1.5 rounded-lg text-white shadow-xs">
                <MessageSquare size={15} strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="text-xs font-black uppercase tracking-wider italic">Linha do Tempo</h2>
                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest leading-none">Histórico de Observações</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-black hover:bg-gray-100 p-1 rounded-full transition-all"
              title="Fechar (Esc)"
            >
              <X size={18} strokeWidth={2.5} />
            </button>
          </div>

          {/* LISTA DE MENSAGENS (ROLÁVEL) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50 custom-scrollbar">
            {vaga.OBSERVACOES && vaga.OBSERVACOES.length > 0 ? (
              [...vaga.OBSERVACOES].reverse().map((obs, idx) => {
                const parts = obs.split(': ');
                const header = parts[0];
                const content = parts.slice(1).join(': ');
                const isFrozenObs = obs.includes('CONGELADA') || obs.includes('DESCONGELADA');
                
                return (
                  <div key={idx} className="flex flex-col animate-in fade-in duration-200">
                    <div className="flex items-center space-x-1.5 mb-1">
                      <div className={`w-1.5 h-1.5 rounded-full ring-2 ring-red-50 ${isFrozenObs ? 'bg-blue-600' : 'bg-[#e31e24]'}`}></div>
                      <span className="text-[9px] font-black text-gray-700 uppercase tracking-tight bg-white px-2 py-0.5 rounded-md border border-gray-200 shadow-2xs">
                        {header}
                      </span>
                    </div>
                    <div className={`ml-3 p-3 rounded-xl bg-white border text-xs font-medium text-gray-800 leading-relaxed shadow-xs relative ${
                      isFrozenObs ? 'border-blue-200 bg-blue-50/20' : 'border-gray-200'
                    }`}>
                      <div className="absolute top-2.5 -left-1 w-2 h-2 bg-white border-l border-b border-inherit rotate-45"></div>
                      {content}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-40 py-12">
                <MessageSquare size={36} className="mb-2 text-gray-400" />
                <p className="text-[10px] font-black uppercase tracking-wider text-center text-gray-500">
                  Nenhuma observação registrada ainda.
                </p>
              </div>
            )}
          </div>

          {/* INPUT DE COMENTÁRIO (FIXO NO RODAPÉ) */}
          <div className="p-3 px-4 border-t border-gray-200 bg-white shrink-0">
            <form onSubmit={handleAddComment} className="relative">
              <textarea 
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium text-gray-900 focus:bg-white focus:border-black focus:outline-none transition-all pr-12 placeholder-gray-400 min-h-[44px] max-h-[72px] resize-none"
                placeholder="Insira um comentário sobre o andamento..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                disabled={loading}
              />
              <button 
                type="submit"
                disabled={loading || !newComment.trim()}
                className="absolute right-2 bottom-2 p-1.5 bg-black text-[#41a900] hover:bg-[#e31e24] hover:text-white rounded-lg transition-all disabled:opacity-30 shadow-xs active:scale-95 group"
                title="Publicar Comentário"
              >
                {loading ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} strokeWidth={2.5} />}
              </button>
            </form>
          </div>
        </div>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
      `}</style>
    </div>
  );
};

export default VagaDetailsModal;
