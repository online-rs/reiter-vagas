
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { User } from '../types';
import { X, Save, AlertCircle, Info, Briefcase, Loader2, MapPin, Users, Clock, ShieldCheck, UserMinus } from 'lucide-react';

interface NewVagaModalProps {
  user: User;
  onClose: () => void;
  onSuccess: () => void;
}

interface UnitRecord {
  id: number;
  nome: string;
}

const NewVagaModal: React.FC<NewVagaModalProps> = ({ user, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [unitsLoading, setUnitsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [availableUnits, setAvailableUnits] = useState<UnitRecord[]>([]);
  const [formData, setFormData] = useState({
    UNIDADE: '',
    SETOR: '',
    TIPO_CARGO: 'Outras Funções',
    CARGO: '',
    TIPO: 'Substituição',
    MOTIVO: '',
    NOME_SUBSTITUIDO: '',
    TURNO: '',
    GESTOR: '',
    GERENTE: ''
  });

  useEffect(() => {
    const fetchUnits = async () => {
      setUnitsLoading(true);
      const { data, error } = await supabase
        .from('unidades')
        .select('id, nome');

      if (error) {
        console.error('Error fetching units:', error);
      } else if (data) {
        const sorted = data.sort((a, b) => a.nome.localeCompare(b.nome));
        setAvailableUnits(sorted);
        if (sorted.length > 0) {
          setFormData(prev => ({ ...prev, UNIDADE: sorted[0].nome }));
        }
      }
      setUnitsLoading(false);
    };

    fetchUnits();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.UNIDADE) {
      setErrorMessage('Por favor, selecione uma unidade.');
      return;
    }
    
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

  // Removido 'uppercase' da classe de input para respeitar maiúsculas e minúsculas digitadas
  const inputClass = "w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-black focus:ring-4 focus:ring-black/5 focus:outline-none text-black font-bold placeholder-gray-400 transition-all shadow-sm text-xs";
  const selectClass = "w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-black focus:ring-4 focus:ring-black/5 focus:outline-none text-black font-bold transition-all appearance-none shadow-sm cursor-pointer text-xs";
  const labelClass = "block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 ml-1";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-white w-full max-w-4xl rounded-[40px] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden border-t-[12px] border-black transform transition-all animate-in fade-in zoom-in duration-200 flex flex-col max-h-[95vh]">
        
        {/* Header */}
        <div className="px-10 py-8 border-b border-gray-100 bg-gray-50 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-5">
            <div className="bg-[#e31e24] p-4 rounded-3xl text-white shadow-lg transform -rotate-3">
              <Briefcase size={32} strokeWidth={3} />
            </div>
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tighter italic text-black leading-none">Abertura de Vaga</h2>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1.5">Preencha os dados da nova requisição</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-gray-200 hover:bg-black hover:text-[#41a900] text-black rounded-full transition-all active:scale-90">
            <X size={32} strokeWidth={2.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar bg-[#fcfcfc]">
          {errorMessage && (
            <div className="p-4 bg-red-50 border-l-4 border-[#e31e24] text-red-700 text-xs font-bold rounded-xl flex items-center space-x-3">
              <AlertCircle size={20} />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            
            {/* Seção: Localização e Estrutura */}
            <div className="space-y-6">
              <div className="flex items-center space-x-3 border-b-2 border-gray-100 pb-2 mb-4">
                <MapPin size={16} className="text-[#e31e24]" />
                <span className="text-[11px] font-black uppercase tracking-wider text-gray-400">Localização & Estrutura</span>
              </div>
              
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className={labelClass}>Unidade Filial</label>
                  <select name="UNIDADE" value={formData.UNIDADE} onChange={handleChange} className={selectClass} required>
                    {unitsLoading ? <option>Carregando...</option> : availableUnits.map(u => <option key={u.id} value={u.nome}>{u.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Setor Operacional</label>
                  <input name="SETOR" value={formData.SETOR} onChange={handleChange} className={inputClass} placeholder="EX: Logística / RH / Frota" required />
                </div>
                <div>
                  <label className={labelClass}>Tipo de Cargo</label>
                  <select name="TIPO_CARGO" value={formData.TIPO_CARGO} onChange={handleChange} className={selectClass}>
                    <option value="Outras Funções">Outras Funções</option>
                    <option value="Motorista">Motorista</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Nome do Cargo</label>
                  <input name="CARGO" value={formData.CARGO} onChange={handleChange} className={inputClass} placeholder="EX: Auxiliar de Depósito" required />
                </div>
              </div>
            </div>

            {/* Seção: Detalhes da Requisição */}
            <div className="space-y-6">
              <div className="flex items-center space-x-3 border-b-2 border-gray-100 pb-2 mb-4">
                <ShieldCheck size={16} className="text-[#41a900]" />
                <span className="text-[11px] font-black uppercase tracking-wider text-gray-400">Dados da Requisição</span>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Tipo de Vaga</label>
                    <select name="TIPO" value={formData.TIPO} onChange={handleChange} className={selectClass}>
                      <option value="Substituição">Substituição</option>
                      <option value="Aumento de Quadro">Aumento de Quadro</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Turno</label>
                    <input name="TURNO" value={formData.TURNO} onChange={handleChange} className={inputClass} placeholder="EX: 08:00 às 18:00" required />
                  </div>
                </div>

                {formData.TIPO === 'Substituição' && (
                  <div className="bg-red-50/50 p-5 rounded-2xl border border-red-100 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-black text-red-400 uppercase tracking-widest mb-1.5 ml-1">Pessoa Substituída</label>
                        <div className="relative">
                           <UserMinus className="absolute left-3 top-1/2 -translate-y-1/2 text-red-200" size={16} />
                           <input name="NOME_SUBSTITUIDO" value={formData.NOME_SUBSTITUIDO} onChange={handleChange} className={`${inputClass} border-red-100 focus:border-red-400 pl-10`} placeholder="Nome do Colaborador" required={formData.TIPO === 'Substituição'} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-red-400 uppercase tracking-widest mb-1.5 ml-1">Motivo do Desligamento</label>
                        <select name="MOTIVO" value={formData.MOTIVO} onChange={handleChange} className={`${selectClass} border-red-100 focus:border-red-400`} required={formData.TIPO === 'Substituição'}>
                          <option value="">Selecione o motivo...</option>
                          <option value="Pedido de Demissão">Pedido de Demissão</option>
                          <option value="Dispensa sem Justa Causa">Dispensa sem Justa Causa</option>
                          <option value="Dispensa com Justa Causa">Dispensa com Justa Causa</option>
                          <option value="Término de Contrato">Término de Contrato</option>
                          <option value="Promoção/Transferência">Promoção / Transferência</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Gestor Direto</label>
                    <input name="GESTOR" value={formData.GESTOR} onChange={handleChange} className={inputClass} placeholder="Nome do Gestor" required />
                  </div>
                  <div>
                    <label className={labelClass}>Gerente Responsável</label>
                    <input name="GERENTE" value={formData.GERENTE} onChange={handleChange} className={inputClass} placeholder="Nome do Gerente" required />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>

        <div className="p-10 border-t border-gray-100 bg-white flex justify-between items-center shrink-0">
          <div className="flex items-center space-x-3 bg-gray-50 px-4 py-2.5 rounded-2xl border border-gray-100">
            <Info size={16} className="text-[#e31e24]" />
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Solicitante: <span className="text-black">{user.username}</span>
            </p>
          </div>
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-8 py-4 border-2 border-gray-100 rounded-2xl text-gray-400 hover:text-black hover:border-black font-black text-xs uppercase tracking-widest transition-all active:scale-95"
            >
              Cancelar
            </button>
            <button
              onClick={(e) => {
                const form = document.querySelector('form');
                if (form) form.requestSubmit();
              }}
              disabled={loading || unitsLoading}
              className="px-10 py-4 bg-black text-[#41a900] rounded-2xl hover:bg-[#e31e24] hover:text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl flex items-center justify-center space-x-3 transition-all disabled:opacity-50 active:scale-95 border-b-4 border-black/20"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} strokeWidth={3} />}
              <span>{loading ? 'Processando...' : 'Confirmar Abertura'}</span>
            </button>
          </div>
        </div>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #000; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default NewVagaModal;
