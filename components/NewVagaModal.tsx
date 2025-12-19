
import React, { useState } from 'react';
import { supabase } from '../supabase';
import { User } from '../types';
import { X, Save, AlertCircle, Info, Briefcase } from 'lucide-react';

interface NewVagaModalProps {
  user: User;
  onClose: () => void;
  onSuccess: () => void;
}

const NewVagaModal: React.FC<NewVagaModalProps> = ({ user, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    UNIDADE: '',
    SETOR: '',
    TIPO_CARGO: 'Outras Funções',
    CARGO: '',
    TIPO: 'Substituição',
    MOTIVO: '',
    NOME_SUBSTITUIDO: '',
    TURNO: '',
    GESTOR: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    const payload = {
      ...formData,
      ABERTURA: new Date().toISOString(),
      'usuário_criador': user.username,
      OBSERVACOES: [`${new Date().toLocaleDateString('pt-BR')} ${user.username}: Vaga aberta no sistema.`]
    };

    const { error } = await supabase.from('vagas').insert([payload]);

    if (error) {
      console.error('Error inserting vaga:', error);
      setErrorMessage('Erro ao criar vaga: ' + error.message);
    } else {
      onSuccess();
    }
    setLoading(false);
  };

  const inputClass = "w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-[#e31e24] focus:ring-4 focus:ring-red-500/5 focus:outline-none text-black font-bold placeholder-gray-400 transition-all shadow-sm";
  const selectClass = "w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-[#e31e24] focus:ring-4 focus:ring-red-500/5 focus:outline-none text-black font-bold transition-all appearance-none shadow-sm cursor-pointer";
  const labelClass = "block text-[11px] font-black text-gray-900 uppercase tracking-widest mb-1.5 ml-1";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden border-t-[10px] border-[#e31e24] transform transition-all animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center shadow-inner">
              <Briefcase className="text-[#e31e24]" size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-black uppercase tracking-tighter">
                Abrir Nova Vaga
              </h2>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-0.5">Departamento de R&S • Reiterlog</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-black transition-all p-2 hover:bg-gray-200 rounded-full">
            <X size={32} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8">
          {errorMessage && (
            <div className="mb-6 p-5 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-black rounded-xl flex items-start space-x-3 shadow-sm uppercase tracking-wide">
              <AlertCircle className="shrink-0" size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
            <div className="space-y-6">
              <div>
                <label className={labelClass}>Unidade Operacional</label>
                <input required name="UNIDADE" value={formData.UNIDADE} onChange={handleChange} className={inputClass} placeholder="Ex: MATRIZ CANOAS" />
              </div>
              <div>
                <label className={labelClass}>Setor / Área</label>
                <input required name="SETOR" value={formData.SETOR} onChange={handleChange} className={inputClass} placeholder="Ex: EXPEDIÇÃO FRIGORÍFICO" />
              </div>
              <div>
                <label className={labelClass}>Nome do Cargo</label>
                <input required name="CARGO" value={formData.CARGO} onChange={handleChange} className={inputClass} placeholder="Ex: CONFERENTE DE CARGA" />
              </div>
              <div>
                <label className={labelClass}>Tipo de Cargo</label>
                <select required name="TIPO_CARGO" value={formData.TIPO_CARGO} onChange={handleChange} className={selectClass}>
                  <option value="Outras Funções">Outras Funções</option>
                  <option value="Motorista">Motorista</option>
                </select>
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Modalidade</label>
                  <select required name="TIPO" value={formData.TIPO} onChange={handleChange} className={selectClass}>
                    <option value="Substituição">Substituição</option>
                    <option value="Aumento de Quadro">Aumento de Quadro</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Turno</label>
                  <input name="TURNO" value={formData.TURNO} onChange={handleChange} className={inputClass} placeholder="Ex: 2º TURNO (B)" />
                </div>
              </div>
              <div>
                <label className={labelClass}>Motivo da Vaga</label>
                <input name="MOTIVO" value={formData.MOTIVO} onChange={handleChange} className={inputClass} placeholder="Ex: PEDIDO DE DESLIGAMENTO" />
              </div>
              <div>
                <label className={labelClass}>Colaborador Substituído</label>
                <input name="NOME_SUBSTITUIDO" value={formData.NOME_SUBSTITUIDO} onChange={handleChange} className={inputClass} placeholder="NOME COMPLETO" />
              </div>
              <div>
                <label className={labelClass}>Gestor Responsável</label>
                <input required name="GESTOR" value={formData.GESTOR} onChange={handleChange} className={inputClass} placeholder="NOME DO LÍDER/COORDENADOR" />
              </div>
            </div>
          </div>

          <div className="mt-12 flex items-center justify-between border-t-2 border-gray-100 pt-8">
            <div className="flex items-center space-x-3 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
              <Info size={16} className="text-[#e31e24]" />
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                Abertura por: <span className="text-black">{user.username}</span>
              </p>
            </div>
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={onClose}
                className="px-8 py-4 border-2 border-gray-200 rounded-2xl text-gray-400 hover:text-black hover:border-black font-black text-xs uppercase tracking-widest transition-all active:scale-95"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-10 py-4 bg-black text-[#adff2f] rounded-2xl hover:bg-[#e31e24] hover:text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl flex items-center space-x-3 transition-all disabled:opacity-50 active:scale-95 border-b-4 border-black/20"
              >
                <Save size={20} strokeWidth={3} />
                <span>{loading ? 'Salvando...' : 'Confirmar Abertura'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewVagaModal;
