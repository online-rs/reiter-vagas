
export interface Vaga {
  id: number;
  created_at: string;
  VAGA: number | null;
  ABERTURA: string;
  UNIDADE: string;
  SETOR: string;
  TIPO_CARGO: string;
  CARGO: string;
  TIPO: string;
  MOTIVO: string;
  NOME_SUBSTITUIDO?: string;
  TURNO: string;
  GESTOR: string;
  DIAS_ABERTO?: number;
  FECHAMENTO?: string;
  NOME_SUBSTITUICAO?: string;
  CAPTACAO?: string;
  RECRUTADOR?: string;
  OBSERVACOES: string[];
  'usuário_criador': string;
  usuario_fechador?: string;
}

export interface User {
  id: string;
  username: string;
  full_name?: string;
  role?: string;
  unidades: string[]; // Array de unidades que o usuário tem permissão para visualizar
}
