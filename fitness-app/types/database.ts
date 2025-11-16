export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          nome: string
          telefone: string | null
          data_nascimento: string | null
          sexo: string | null
          peso_atual: number | null
          altura: number | null
          objetivo: string | null
          nivel_experiencia: string | null
          condicoes_saude: string | null
          role: 'cliente' | 'treinador'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          nome: string
          telefone?: string | null
          data_nascimento?: string | null
          sexo?: string | null
          peso_atual?: number | null
          altura?: number | null
          objetivo?: string | null
          nivel_experiencia?: string | null
          condicoes_saude?: string | null
          role?: 'cliente' | 'treinador'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          nome?: string
          telefone?: string | null
          data_nascimento?: string | null
          sexo?: string | null
          peso_atual?: number | null
          altura?: number | null
          objetivo?: string | null
          nivel_experiencia?: string | null
          condicoes_saude?: string | null
          role?: 'cliente' | 'treinador'
          created_at?: string
          updated_at?: string
        }
      }
      exercicios: {
        Row: {
          id: string
          nome: string
          categoria: string | null
          subcategoria: string | null
          dificuldade: string | null
          equipamento: string[] | null
          musculos_primarios: string[] | null
          musculos_secundarios: string[] | null
          video_url: string | null
          thumbnail_url: string | null
          descricao: string | null
          instrucoes: Json | null
          dicas: Json | null
          variacoes: Json | null
          erros_comuns: Json | null
          tags: string[] | null
          created_at: string
        }
        Insert: {
          id?: string
          nome: string
          categoria?: string | null
          subcategoria?: string | null
          dificuldade?: string | null
          equipamento?: string[] | null
          musculos_primarios?: string[] | null
          musculos_secundarios?: string[] | null
          video_url?: string | null
          thumbnail_url?: string | null
          descricao?: string | null
          instrucoes?: Json | null
          dicas?: Json | null
          variacoes?: Json | null
          erros_comuns?: Json | null
          tags?: string[] | null
          created_at?: string
        }
        Update: {
          id?: string
          nome?: string
          categoria?: string | null
          subcategoria?: string | null
          dificuldade?: string | null
          equipamento?: string[] | null
          musculos_primarios?: string[] | null
          musculos_secundarios?: string[] | null
          video_url?: string | null
          thumbnail_url?: string | null
          descricao?: string | null
          instrucoes?: Json | null
          dicas?: Json | null
          variacoes?: Json | null
          erros_comuns?: Json | null
          tags?: string[] | null
          created_at?: string
        }
      }
      programas_treino: {
        Row: {
          id: string
          cliente_id: string
          nome: string
          descricao: string | null
          duracao_semanas: number | null
          divisao: string | null
          data_inicio: string | null
          data_fim: string | null
          ativo: boolean
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          cliente_id: string
          nome: string
          descricao?: string | null
          duracao_semanas?: number | null
          divisao?: string | null
          data_inicio?: string | null
          data_fim?: string | null
          ativo?: boolean
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          cliente_id?: string
          nome?: string
          descricao?: string | null
          duracao_semanas?: number | null
          divisao?: string | null
          data_inicio?: string | null
          data_fim?: string | null
          ativo?: boolean
          created_by?: string | null
          created_at?: string
        }
      }
      treinos: {
        Row: {
          id: string
          programa_id: string
          nome_divisao: string
          dia_recomendado: string | null
          aquecimento: string | null
          finalizacao: string | null
          duracao_estimada: number | null
          observacoes_gerais: string | null
          ordem: number | null
          created_at: string
        }
        Insert: {
          id?: string
          programa_id: string
          nome_divisao: string
          dia_recomendado?: string | null
          aquecimento?: string | null
          finalizacao?: string | null
          duracao_estimada?: number | null
          observacoes_gerais?: string | null
          ordem?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          programa_id?: string
          nome_divisao?: string
          dia_recomendado?: string | null
          aquecimento?: string | null
          finalizacao?: string | null
          duracao_estimada?: number | null
          observacoes_gerais?: string | null
          ordem?: number | null
          created_at?: string
        }
      }
      exercicios_treino: {
        Row: {
          id: string
          treino_id: string
          exercicio_id: string
          ordem: number
          series: number
          repeticoes: string
          carga_recomendada: string | null
          descanso: string | null
          observacoes: string | null
        }
        Insert: {
          id?: string
          treino_id: string
          exercicio_id: string
          ordem: number
          series: number
          repeticoes: string
          carga_recomendada?: string | null
          descanso?: string | null
          observacoes?: string | null
        }
        Update: {
          id?: string
          treino_id?: string
          exercicio_id?: string
          ordem?: number
          series?: number
          repeticoes?: string
          carga_recomendada?: string | null
          descanso?: string | null
          observacoes?: string | null
        }
      }
      registros_treino: {
        Row: {
          id: string
          usuario_id: string
          treino_id: string | null
          exercicio_treino_id: string | null
          data_execucao: string
          serie_numero: number | null
          repeticoes_realizadas: number | null
          carga_usada: number | null
          rpe: number | null
          observacoes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          usuario_id: string
          treino_id?: string | null
          exercicio_treino_id?: string | null
          data_execucao: string
          serie_numero?: number | null
          repeticoes_realizadas?: number | null
          carga_usada?: number | null
          rpe?: number | null
          observacoes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          usuario_id?: string
          treino_id?: string | null
          exercicio_treino_id?: string | null
          data_execucao?: string
          serie_numero?: number | null
          repeticoes_realizadas?: number | null
          carga_usada?: number | null
          rpe?: number | null
          observacoes?: string | null
          created_at?: string
        }
      }
      progresso_usuario: {
        Row: {
          id: string
          usuario_id: string
          data_registro: string
          peso: number | null
          circunferencia_braco: number | null
          circunferencia_peito: number | null
          circunferencia_cintura: number | null
          circunferencia_coxa: number | null
          circunferencia_panturrilha: number | null
          foto_frente_url: string | null
          foto_lado_url: string | null
          foto_costas_url: string | null
          observacoes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          usuario_id: string
          data_registro: string
          peso?: number | null
          circunferencia_braco?: number | null
          circunferencia_peito?: number | null
          circunferencia_cintura?: number | null
          circunferencia_coxa?: number | null
          circunferencia_panturrilha?: number | null
          foto_frente_url?: string | null
          foto_lado_url?: string | null
          foto_costas_url?: string | null
          observacoes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          usuario_id?: string
          data_registro?: string
          peso?: number | null
          circunferencia_braco?: number | null
          circunferencia_peito?: number | null
          circunferencia_cintura?: number | null
          circunferencia_coxa?: number | null
          circunferencia_panturrilha?: number | null
          foto_frente_url?: string | null
          foto_lado_url?: string | null
          foto_costas_url?: string | null
          observacoes?: string | null
          created_at?: string
        }
      }
      consultorias: {
        Row: {
          id: string
          cliente_id: string | null
          tipo: string | null
          data_agendamento: string | null
          duracao_minutos: number | null
          valor: number | null
          status: string | null
          link_meet: string | null
          pagamento_id: string | null
          pagamento_status: string | null
          observacoes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          cliente_id?: string | null
          tipo?: string | null
          data_agendamento?: string | null
          duracao_minutos?: number | null
          valor?: number | null
          status?: string | null
          link_meet?: string | null
          pagamento_id?: string | null
          pagamento_status?: string | null
          observacoes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          cliente_id?: string | null
          tipo?: string | null
          data_agendamento?: string | null
          duracao_minutos?: number | null
          valor?: number | null
          status?: string | null
          link_meet?: string | null
          pagamento_id?: string | null
          pagamento_status?: string | null
          observacoes?: string | null
          created_at?: string
        }
      }
      mensagens: {
        Row: {
          id: string
          remetente_id: string | null
          destinatario_id: string | null
          mensagem: string
          arquivo_url: string | null
          lida: boolean
          created_at: string
        }
        Insert: {
          id?: string
          remetente_id?: string | null
          destinatario_id?: string | null
          mensagem: string
          arquivo_url?: string | null
          lida?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          remetente_id?: string | null
          destinatario_id?: string | null
          mensagem?: string
          arquivo_url?: string | null
          lida?: boolean
          created_at?: string
        }
      }
    }
  }
}
