import { Database } from './database'

// User types
export type User = Database['public']['Tables']['users']['Row']
export type UserInsert = Database['public']['Tables']['users']['Insert']
export type UserUpdate = Database['public']['Tables']['users']['Update']

// Exercise types
export type Exercise = Database['public']['Tables']['exercicios']['Row']
export type ExerciseInsert = Database['public']['Tables']['exercicios']['Insert']
export type ExerciseUpdate = Database['public']['Tables']['exercicios']['Update']

// Training program types
export type TrainingProgram = Database['public']['Tables']['programas_treino']['Row']
export type TrainingProgramInsert = Database['public']['Tables']['programas_treino']['Insert']
export type TrainingProgramUpdate = Database['public']['Tables']['programas_treino']['Update']

// Workout types
export type Workout = Database['public']['Tables']['treinos']['Row']
export type WorkoutInsert = Database['public']['Tables']['treinos']['Insert']
export type WorkoutUpdate = Database['public']['Tables']['treinos']['Update']

// Workout exercise types
export type WorkoutExercise = Database['public']['Tables']['exercicios_treino']['Row']
export type WorkoutExerciseInsert = Database['public']['Tables']['exercicios_treino']['Insert']
export type WorkoutExerciseUpdate = Database['public']['Tables']['exercicios_treino']['Update']

// Workout log types
export type WorkoutLog = Database['public']['Tables']['registros_treino']['Row']
export type WorkoutLogInsert = Database['public']['Tables']['registros_treino']['Insert']
export type WorkoutLogUpdate = Database['public']['Tables']['registros_treino']['Update']

// Progress types
export type UserProgress = Database['public']['Tables']['progresso_usuario']['Row']
export type UserProgressInsert = Database['public']['Tables']['progresso_usuario']['Insert']
export type UserProgressUpdate = Database['public']['Tables']['progresso_usuario']['Update']

// Consultation types
export type Consultation = Database['public']['Tables']['consultorias']['Row']
export type ConsultationInsert = Database['public']['Tables']['consultorias']['Insert']
export type ConsultationUpdate = Database['public']['Tables']['consultorias']['Update']

// Message types
export type Message = Database['public']['Tables']['mensagens']['Row']
export type MessageInsert = Database['public']['Tables']['mensagens']['Insert']
export type MessageUpdate = Database['public']['Tables']['mensagens']['Update']

// Extended types with relations
export type WorkoutWithExercises = Workout & {
  exercicios_treino: (WorkoutExercise & {
    exercicio: Exercise
  })[]
}

export type TrainingProgramWithWorkouts = TrainingProgram & {
  treinos: WorkoutWithExercises[]
}

export type MessageWithUsers = Message & {
  remetente: User
  destinatario: User
}

// Enums
export enum UserRole {
  CLIENT = 'cliente',
  TRAINER = 'treinador',
}

export enum ExerciseCategory {
  PEITO = 'Peito',
  COSTAS = 'Costas',
  PERNAS = 'Pernas',
  OMBROS = 'Ombros',
  BRACOS = 'Braços',
  ABDOMEN = 'Abdômen',
  CARDIO = 'Cardio',
  FUNCIONAL = 'Funcional',
}

export enum ExperienceLevel {
  BEGINNER = 'iniciante',
  INTERMEDIATE = 'intermediário',
  ADVANCED = 'avançado',
}

export enum FitnessGoal {
  HYPERTROPHY = 'hipertrofia',
  WEIGHT_LOSS = 'emagrecimento',
  CONDITIONING = 'condicionamento',
  REHABILITATION = 'reabilitação',
  STRENGTH = 'força',
  ATHLETIC_PERFORMANCE = 'performance atlética',
}

export enum ConsultationType {
  INITIAL_ASSESSMENT = 'Avaliação inicial',
  MONTHLY = 'Mensal',
  PROGRAM_ONLY = 'Programa sem call',
}

export enum ConsultationStatus {
  PENDING = 'pendente',
  CONFIRMED = 'confirmado',
  COMPLETED = 'concluído',
  CANCELLED = 'cancelado',
}

export enum PaymentStatus {
  PENDING = 'pendente',
  APPROVED = 'aprovado',
  REJECTED = 'rejeitado',
  REFUNDED = 'reembolsado',
}

// Form types
export interface SignUpForm {
  email: string
  password: string
  nome: string
  telefone?: string
}

export interface SignInForm {
  email: string
  password: string
}

export interface UserProfileForm {
  nome: string
  telefone?: string
  data_nascimento?: string
  sexo?: 'Masculino' | 'Feminino' | 'Outro'
  peso_atual?: number
  altura?: number
  objetivo?: FitnessGoal
  nivel_experiencia?: ExperienceLevel
  condicoes_saude?: string
}

export interface ExerciseForm {
  nome: string
  categoria: ExerciseCategory
  subcategoria?: string
  dificuldade: ExperienceLevel
  equipamento: string[]
  musculos_primarios: string[]
  musculos_secundarios?: string[]
  video_url: string
  thumbnail_url?: string
  descricao: string
  instrucoes: string[]
  dicas?: string[]
  variacoes?: string[]
  erros_comuns?: string[]
  tags: string[]
}

export interface WorkoutLogForm {
  exercicio_treino_id: string
  serie_numero: number
  repeticoes_realizadas: number
  carga_usada?: number
  rpe?: number
  observacoes?: string
}

export interface ProgressForm {
  peso?: number
  circunferencia_braco?: number
  circunferencia_peito?: number
  circunferencia_cintura?: number
  circunferencia_coxa?: number
  circunferencia_panturrilha?: number
  foto_frente?: File
  foto_lado?: File
  foto_costas?: File
  observacoes?: string
}
