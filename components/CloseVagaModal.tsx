
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { User, Vaga } from '../types';
import { X, CheckCircle, FileText, Calendar } from 'lucide-react';

interface CloseVagaModalProps {
  user: User;
  vaga: Vaga;
  onClose: () => void;
  onSuccess: () => void;
}

const CloseVagaModal: React.FC<CloseVagaModalProps> = ({ user, vaga, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    FECHAMENTO: new Date().toISOString().split('T')[0],
    NOME_SUBSTITUICAO: '',
    CAPTACAO: 'Site Oficial',
    OBSERVACAO: ''
  });

  const [diasAberto, setDiasAberto] = useState(0);

  useEffect(() => {
    if (formData.FECHAMENTO) {
      const start = new Date(vaga.ABERTURA);
      const end = new Date(formData.FECHAMENTO);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      setDiasAberto(Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }
  }, [formData.FECHAMENTO, vaga.ABERTURA]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const formattedObs = `${new Date().toLocaleDateString('pt-BR')} ${user.username}: ${formData.OBSERVACAO}`;
    const newObservations = [...(vaga.OBSERVACOES || []), formattedObs];

    const { error } = await supabase
      .from('vagas')
      .update({
        FECHAMENTO: new Date(formData.FECHAMENTO).toISOString(),
        NOME_SUBSTITUICAO: formData.NOME_SUBSTITUICAO,
        CAPTACAO: formData.CAPTACAO,
        RECRUTADOR: user.username,
        usuario_fechador: user.username,
        DIAS_ABERTO: diasAberto,
        OBSERVACOES: newObservations
      })
      .eq('id', vaga.id);

    if (error) {
      console.error('Error closing vaga:', error);
      alert('Erro ao fechar vaga: ' + error.message);
    } else {
      onSuccess();
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border-t-8 border-black transform transition-all">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center space-x-3">
            <div className="bg-[#41a900] p-2 rounded-lg">
              <CheckCircle className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-black uppercase tracking-tight">Finalizar Vaga</h2>
              <p className="text-[10px] text-gray-500 font-bold uppercase">{vaga.CARGO} - {vaga.UNIDADE}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-black transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Dias em Aberto</label>
              <div className="text-2xl font-black text-black">{diasAberto}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Data Fechamento</label>
              <input 
                type="date" 
                name="FECHAMENTO" 
                value={formData.FECHAMENTO} 
                onChange={handleChange} 
                className="w-full bg-transparent border-none focus:ring-0 font-bold text-red-600 cursor-pointer" 
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center space-x-1">
                <span>Nome da Pessoa Contratada</span>
              </label>
              <input 
                required 
                name="NOME_SUBSTITUICAO" 
                value={formData.NOME_SUBSTITUICAO} 
                onChange={handleChange} 
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-black outline-none uppercase font-bold text-sm" 
                placeholder="Ex: João da Silva" 
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Fonte de Captação</label>
              <select 
                name="CAPTACAO" 
                value={formData.CAPTACAO} 
                onChange={handleChange} 
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-black outline-none font-bold text-sm"
              >
                <option value="Site Oficial">Site Oficial</option>
                <option value="Indicação">Indicação</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="InfoJobs">InfoJobs</option>
                <option value="Outros">Outros</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center space-x-1">
                <FileText size={14} />
                <span>Observações Finais</span>
              </label>
              <textarea 
                required
                name="OBSERVACAO" 
                value={formData.OBSERVACAO} 
                onChange={handleChange} 
                rows={3}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-black outline-none resize-none font-medium text-sm" 
                placeholder="Detalhes sobre o processo de fechamento..."
              />
            </div>
          </div>

          <div className="pt-4 flex flex-col space-y-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-black text-[#41a900] rounded-xl hover:bg-[#1a1a1a] font-black shadow-xl flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
            >
              <span>{loading ? 'PROCESSANDO...' : 'CONFIRMAR FECHAMENTO'}</span>
            </button>
            <p className="text-[10px] text-center text-gray-400 font-bold uppercase">
              Finalizando vaga como <span className="text-black">{user.username}</span>.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CloseVagaModal;
