
import React, { useState } from 'react';
import { supabase } from '../supabase';
import { User } from '../types';
import { X, Save, AlertCircle, Info } from 'lucide-react';

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
    TIPO_CARGO: 'Operacional',
    CARGO: '',
    TIPO: 'Nova Vaga',
    MOTIVO: '',
    NOME_SUBSTITUIDO: '',
    TURNO: '',
    GESTOR: '',
    VAGA: 1
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    // CRÍTICO: O valor de 'usuário_criador' DEVE ser o username validado no login
    const payload = {
      ...formData,
      ABERTURA: new Date().toISOString(),
      'usuário_criador': user.username,
      OBSERVACOES: [`${new Date().toLocaleDateString('pt-BR')} ${user.username}: Vaga aberta no sistema.`]
    };

    const { error } = await supabase.from('vagas').insert([payload]);

    if (error) {
      console.error('Error inserting vaga:', error);
      if (error.code === '23503') {
        setErrorMessage(`Erro de Integridade: O username "${user.username}" não tem permissão ou não existe na tabela profiles.`);
      } else {
        setErrorMessage('Erro ao criar vaga: ' + error.message);
      }
    } else {
      onSuccess();
    }
    setLoading(false);
  };

  const inputClass = "w-full px-4 py-3 bg-[#3a3a3a] border border-transparent rounded-lg focus:border-[#adff2f] focus:outline-none text-white font-medium placeholder-gray-500 transition-all";
  const labelClass = "block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden border-t-[8px] border-[#e31e24] transform transition-all animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="text-[#e31e24]" size={22} />
            </div>
            <h2 className="text-xl font-black text-black uppercase tracking-tighter">
              Incluir Nova Vaga
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-black transition-colors p-2 hover:bg-gray-200 rounded-full">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8">
          {errorMessage && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-bold rounded flex items-start space-x-2">
              <AlertCircle className="shrink-0" size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
            <div className="space-y-5">
              <div>
                <label className={labelClass}>Unidade</label>
                <input required name="UNIDADE" value={formData.UNIDADE} onChange={handleChange} className={inputClass} placeholder="Ex: MATRIZ" />
              </div>
              <div>
                <label className={labelClass}>Setor</label>
                <input required name="SETOR" value={formData.SETOR} onChange={handleChange} className={inputClass} placeholder="Ex: TERMINAL CONGELADO" />
              </div>
              <div>
                <label className={labelClass}>Cargo</label>
                <input required name="CARGO" value={formData.CARGO} onChange={handleChange} className={inputClass} placeholder="Ex: ARMAZENISTA" />
              </div>
              <div>
                <label className={labelClass}>Tipo de Cargo</label>
                <select name="TIPO_CARGO" value={formData.TIPO_CARGO} onChange={handleChange} className={inputClass}>
                  <option value="Operacional">Operacional</option>
                  <option value="Administrativo">Administrativo</option>
                  <option value="Gestão">Gestão</option>
                </select>
              </div>
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Tipo</label>
                  <select name="TIPO" value={formData.TIPO} onChange={handleChange} className={inputClass}>
                    <option value="Nova Vaga">Nova Vaga</option>
                    <option value="Substituição">Substituição</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Turno</label>
                  <input name="TURNO" value={formData.TURNO} onChange={handleChange} className={inputClass} placeholder="Ex: NOTURNO" />
                </div>
              </div>
              <div>
                <label className={labelClass}>Motivo</label>
                <input name="MOTIVO" value={formData.MOTIVO} onChange={handleChange} className={inputClass} placeholder="Ex: PEDIDO DE DEMISSÃO" />
              </div>
              <div>
                <label className={labelClass}>Nome Substituído (se houver)</label>
                <input name="NOME_SUBSTITUIDO" value={formData.NOME_SUBSTITUIDO} onChange={handleChange} className={inputClass} placeholder="NOME DO COLABORADOR" />
              </div>
              <div>
                <label className={labelClass}>Gestor Direto</label>
                <input required name="GESTOR" value={formData.GESTOR} onChange={handleChange} className={inputClass} placeholder="CARLOS" />
              </div>
            </div>
          </div>

          <div className="mt-10 flex items-center justify-between border-t border-gray-100 pt-6">
            <div className="flex items-center space-x-2 text-gray-400">
              <Info size={14} />
              <p className="text-[10px] font-bold uppercase tracking-widest">
                Usuário Sistema: <span className="text-black">{user.username}</span>
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 border-2 border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 font-black text-xs uppercase tracking-widest transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-[#e31e24] text-white rounded-xl hover:bg-[#c0191e] font-black text-xs uppercase tracking-[0.2em] shadow-lg flex items-center space-x-3 transition-all disabled:opacity-50 active:scale-95"
              >
                <Save size={18} />
                <span>{loading ? 'Processando...' : 'Salvar Vaga'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewVagaModal;
