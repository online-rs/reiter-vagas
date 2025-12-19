
import React, { useState } from 'react';
import { supabase } from '../supabase';
import { User, Vaga } from '../types';
import { X, MessageSquare, RotateCcw, Send, Calendar, User as UserIcon, Briefcase, MapPin, Loader2, Info } from 'lucide-react';

interface VagaDetailsModalProps {
  user: User;
  vaga: Vaga;
  onClose: () => void;
  onUpdate: () => void;
}

const VagaDetailsModal: React.FC<VagaDetailsModalProps> = ({ user, vaga, onClose, onUpdate }) => {
  const [newComment, setNewComment] = useState('');
  const [reopenReason, setReopenReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [isReopenConfirmOpen, setIsReopenConfirmOpen] = useState(false);

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
        OBSERVACOES: updatedObservations
      })
      .eq('id', vaga.id);

    if (error) {
      alert('Erro ao reabrir vaga: ' + error.message);
    } else {
      onUpdate();
    }
    setLoading(false);
  };

  // Cores de alto contraste
  const labelStyle = "text-[11px] font-black text-gray-600 uppercase tracking-widest block mb-1";
  const dataStyle = "text-[15px] font-black text-black uppercase tracking-tight";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col md:flex-row h-[90vh] md:h-auto max-h-[85vh] border-t-[10px] border-black border-x border-b border-gray-200">
        
        {/* Lado Esquerdo: Detalhes */}
        <div className="w-full md:w-5/12 bg-gray-50/50 p-8 overflow-y-auto border-r border-gray-200">
          <div className="flex justify-between items-start mb-8 md:hidden">
             <h2 className="text-2xl font-black uppercase tracking-tighter">Detalhes da Vaga</h2>
             <button onClick={onClose} className="text-black bg-gray-200 p-2 rounded-full"><X size={24} /></button>
          </div>

          <div className="space-y-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-full bg-[#e31e24]"></div>
              <label className="text-[11px] font-black text-[#e31e24] uppercase tracking-widest block mb-1">Cargo e Status</label>
              <div className="text-2xl font-black uppercase text-black italic leading-tight">{vaga.CARGO}</div>
              <div className="flex items-center space-x-3 mt-4">
                {vaga.FECHAMENTO ? (
                   <span className="px-3 py-1 rounded-lg bg-green-600 text-white text-[10px] font-black uppercase tracking-widest shadow-sm">FINALIZADA</span>
                ) : (
                   <span className="px-3 py-1 rounded-lg bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest shadow-sm">EM ABERTO</span>
                )}
                <span className="text-[10px] text-gray-900 font-black uppercase tracking-widest bg-gray-100 px-2 py-1 rounded">{vaga.TIPO}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 px-2">
              <div className="flex items-start space-x-4">
                <div className="bg-gray-200 p-2 rounded-xl text-black">
                    <MapPin size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <label className={labelStyle}>Unidade / Setor</label>
                  <p className={dataStyle}>{vaga.UNIDADE} <span className="text-[#e31e24] mx-1">•</span> {vaga.SETOR}</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="bg-gray-200 p-2 rounded-xl text-black">
                    <Briefcase size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <label className={labelStyle}>Gestor Direto</label>
                  <p className={dataStyle}>{vaga.GESTOR}</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="bg-gray-200 p-2 rounded-xl text-black">
                    <Calendar size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <label className={labelStyle}>Data de Abertura</label>
                  <p className={dataStyle}>{new Date(vaga.ABERTURA).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="bg-gray-200 p-2 rounded-xl text-black">
                    <UserIcon size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <label className={labelStyle}>Criado por</label>
                  <p className={dataStyle}>{vaga['usuário_criador']}</p>
                </div>
              </div>

              {vaga.FECHAMENTO && (
                <div className="mt-4 p-5 bg-green-50 rounded-2xl border-2 border-green-200 relative">
                  <div className="absolute top-2 right-4 text-green-600 opacity-20"><Info size={40} /></div>
                  <label className="text-[11px] font-black text-green-700 uppercase tracking-widest block mb-2 underline decoration-2 underline-offset-4">Dados de Contratação</label>
                  <p className="text-sm font-black text-green-900 uppercase">Pessoa: {vaga.NOME_SUBSTITUICAO}</p>
                  <p className="text-[11px] text-green-700 mt-2 uppercase font-black bg-white/50 inline-block px-2 py-1 rounded border border-green-100 italic">
                    Recrutador: {vaga.RECRUTADOR} • {new Date(vaga.FECHAMENTO).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              )}
            </div>

            {vaga.FECHAMENTO && !isReopenConfirmOpen && (
              <button 
                onClick={() => setIsReopenConfirmOpen(true)}
                className="w-full mt-6 flex items-center justify-center space-x-3 py-4 bg-black text-[#adff2f] rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-[#e31e24] hover:text-white transition-all shadow-xl group active:scale-95 border-b-4 border-black active:border-b-0"
              >
                <RotateCcw size={18} className="group-hover:rotate-[-45deg] transition-transform" />
                <span>Reabrir esta Vaga</span>
              </button>
            )}

            {isReopenConfirmOpen && (
              <div className="mt-6 p-6 bg-black rounded-2xl border-t-8 border-[#e31e24] shadow-2xl animate-in slide-in-from-bottom-4">
                <label className="block text-[11px] font-black text-[#adff2f] uppercase tracking-widest mb-3">Justificativa da Reabertura</label>
                <textarea 
                  className="w-full bg-gray-900 text-white rounded-xl p-4 text-sm font-bold focus:ring-2 focus:ring-[#adff2f] outline-none min-h-[100px] border border-gray-800"
                  placeholder="Por que você está reabrindo esta vaga?..."
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                />
                <div className="flex space-x-3 mt-4">
                  <button 
                    onClick={handleReopenVaga}
                    disabled={loading}
                    className="flex-[2] bg-[#adff2f] text-black py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all"
                  >
                    {loading ? <Loader2 className="animate-spin mx-auto" size={18} /> : 'CONFIRMAR REABERTURA'}
                  </button>
                  <button 
                    onClick={() => setIsReopenConfirmOpen(false)}
                    className="flex-1 bg-gray-800 text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-700 transition-all"
                  >
                    VOLTAR
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Lado Direito: Comentários/Timeline */}
        <div className="flex-1 flex flex-col h-full bg-white relative">
          <div className="flex items-center justify-between p-6 border-b-2 border-gray-100 bg-white">
            <div className="flex items-center space-x-3 text-black">
              <div className="bg-black p-2 rounded-lg text-white">
                <MessageSquare size={20} strokeWidth={2.5} />
              </div>
              <h2 className="text-base font-black uppercase tracking-[0.1em]">Linha do Tempo / Observações</h2>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-black hover:bg-gray-100 p-2 rounded-full transition-all"><X size={28} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-[#fcfcfc]">
            {vaga.OBSERVACOES && vaga.OBSERVACOES.length > 0 ? (
              vaga.OBSERVACOES.map((obs, idx) => {
                const parts = obs.split(': ');
                const header = parts[0];
                const content = parts.slice(1).join(': ');
                
                return (
                  <div key={idx} className="flex flex-col animate-in fade-in slide-in-from-right-4" style={{ animationDelay: `${idx * 40}ms` }}>
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-[#e31e24] shadow-[0_0_8px_rgba(227,30,36,0.5)]"></div>
                      <span className="text-[11px] font-black text-gray-900 uppercase tracking-tighter bg-gray-200 px-2 py-0.5 rounded-md">{header}</span>
                    </div>
                    <div className="ml-4 p-5 rounded-2xl bg-white border-2 border-gray-100 text-sm font-bold text-gray-800 leading-relaxed shadow-sm hover:border-gray-300 transition-colors">
                      {content}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-30 grayscale">
                <MessageSquare size={64} className="mb-4 text-gray-400" />
                <p className="text-sm font-black uppercase tracking-widest text-center">Nenhuma observação<br/>registrada no histórico</p>
              </div>
            )}
          </div>

          {/* Input de Novo Comentário */}
          <div className="p-8 border-t-2 border-gray-100 bg-gray-50/80">
            <form onSubmit={handleAddComment} className="relative max-w-3xl mx-auto">
              <textarea 
                className="w-full bg-white border-2 border-gray-200 rounded-2xl px-6 py-5 text-sm font-bold text-gray-900 focus:border-black focus:ring-4 focus:ring-black/5 focus:outline-none transition-all pr-20 shadow-xl placeholder-gray-400 min-h-[90px] resize-none"
                placeholder="Escreva aqui uma nova atualização para esta vaga..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                disabled={loading}
              />
              <button 
                type="submit"
                disabled={loading || !newComment.trim()}
                className="absolute right-4 bottom-4 p-4 bg-black text-[#adff2f] rounded-xl hover:bg-[#e31e24] hover:text-white transition-all disabled:opacity-30 shadow-2xl active:scale-90 group"
                title="Adicionar Observação"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} strokeWidth={3} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VagaDetailsModal;
