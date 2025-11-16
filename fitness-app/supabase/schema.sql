-- TD Fitness - Database Schema
-- Created: 2025-11-16
-- Description: Complete schema for TD Fitness coaching app

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABLES
-- =============================================

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  nome VARCHAR(255) NOT NULL,
  telefone VARCHAR(20),
  data_nascimento DATE,
  sexo VARCHAR(10) CHECK (sexo IN ('Masculino', 'Feminino', 'Outro')),
  peso_atual DECIMAL(5,2),
  altura DECIMAL(5,2),
  objetivo TEXT,
  nivel_experiencia VARCHAR(20) CHECK (nivel_experiencia IN ('iniciante', 'intermediário', 'avançado')),
  condicoes_saude TEXT,
  role VARCHAR(20) DEFAULT 'cliente' CHECK (role IN ('cliente', 'treinador')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exercises library
CREATE TABLE IF NOT EXISTS exercicios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  categoria VARCHAR(100),
  subcategoria VARCHAR(100),
  dificuldade VARCHAR(50),
  equipamento TEXT[],
  musculos_primarios TEXT[],
  musculos_secundarios TEXT[],
  video_url TEXT,
  thumbnail_url TEXT,
  descricao TEXT,
  instrucoes JSONB,
  dicas JSONB,
  variacoes JSONB,
  erros_comuns JSONB,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Training programs
CREATE TABLE IF NOT EXISTS programas_treino (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  duracao_semanas INT,
  divisao VARCHAR(50),
  data_inicio DATE,
  data_fim DATE,
  ativo BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workouts (individual training sessions within a program)
CREATE TABLE IF NOT EXISTS treinos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  programa_id UUID REFERENCES programas_treino(id) ON DELETE CASCADE NOT NULL,
  nome_divisao VARCHAR(255) NOT NULL,
  dia_recomendado VARCHAR(50),
  aquecimento TEXT,
  finalizacao TEXT,
  duracao_estimada INT,
  observacoes_gerais TEXT,
  ordem INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workout exercises (many-to-many between workouts and exercises)
CREATE TABLE IF NOT EXISTS exercicios_treino (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  treino_id UUID REFERENCES treinos(id) ON DELETE CASCADE NOT NULL,
  exercicio_id UUID REFERENCES exercicios(id) NOT NULL,
  ordem INT NOT NULL,
  series INT NOT NULL,
  repeticoes VARCHAR(50) NOT NULL,
  carga_recomendada VARCHAR(100),
  descanso VARCHAR(50),
  observacoes TEXT
);

-- Workout logs (tracking of execution)
CREATE TABLE IF NOT EXISTS registros_treino (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  treino_id UUID REFERENCES treinos(id),
  exercicio_treino_id UUID REFERENCES exercicios_treino(id),
  data_execucao DATE NOT NULL,
  serie_numero INT,
  repeticoes_realizadas INT,
  carga_usada DECIMAL(6,2),
  rpe INT CHECK (rpe >= 1 AND rpe <= 10),
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User progress (weight, measurements, photos)
CREATE TABLE IF NOT EXISTS progresso_usuario (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  data_registro DATE NOT NULL,
  peso DECIMAL(5,2),
  circunferencia_braco DECIMAL(5,2),
  circunferencia_peito DECIMAL(5,2),
  circunferencia_cintura DECIMAL(5,2),
  circunferencia_coxa DECIMAL(5,2),
  circunferencia_panturrilha DECIMAL(5,2),
  foto_frente_url TEXT,
  foto_lado_url TEXT,
  foto_costas_url TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Consultations/Appointments
CREATE TABLE IF NOT EXISTS consultorias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID REFERENCES users(id),
  tipo VARCHAR(100),
  data_agendamento TIMESTAMPTZ,
  duracao_minutos INT,
  valor DECIMAL(10,2),
  status VARCHAR(50) DEFAULT 'pendente' CHECK (status IN ('pendente', 'confirmado', 'concluído', 'cancelado')),
  link_meet TEXT,
  pagamento_id TEXT,
  pagamento_status VARCHAR(50),
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages (chat between trainer and clients)
CREATE TABLE IF NOT EXISTS mensagens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  remetente_id UUID REFERENCES users(id),
  destinatario_id UUID REFERENCES users(id),
  mensagem TEXT NOT NULL,
  arquivo_url TEXT,
  lida BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_exercicios_categoria ON exercicios(categoria);
CREATE INDEX IF NOT EXISTS idx_exercicios_tags ON exercicios USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_exercicios_nome ON exercicios(nome);

CREATE INDEX IF NOT EXISTS idx_programas_treino_cliente ON programas_treino(cliente_id);
CREATE INDEX IF NOT EXISTS idx_programas_treino_ativo ON programas_treino(ativo);

CREATE INDEX IF NOT EXISTS idx_treinos_programa ON treinos(programa_id);

CREATE INDEX IF NOT EXISTS idx_registros_usuario_data ON registros_treino(usuario_id, data_execucao);
CREATE INDEX IF NOT EXISTS idx_registros_exercicio_treino ON registros_treino(exercicio_treino_id);

CREATE INDEX IF NOT EXISTS idx_progresso_usuario_data ON progresso_usuario(usuario_id, data_registro);

CREATE INDEX IF NOT EXISTS idx_consultorias_cliente ON consultorias(cliente_id);
CREATE INDEX IF NOT EXISTS idx_consultorias_status ON consultorias(status);
CREATE INDEX IF NOT EXISTS idx_consultorias_data ON consultorias(data_agendamento);

CREATE INDEX IF NOT EXISTS idx_mensagens_remetente ON mensagens(remetente_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_destinatario ON mensagens(destinatario_id, lida);
CREATE INDEX IF NOT EXISTS idx_mensagens_created ON mensagens(created_at);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE programas_treino ENABLE ROW LEVEL SECURITY;
ALTER TABLE treinos ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercicios_treino ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros_treino ENABLE ROW LEVEL SECURITY;
ALTER TABLE progresso_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensagens ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Trainers can view all users"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'treinador'
    )
  );

-- Exercises policies (public read, trainer-only write)
CREATE POLICY "Anyone can view exercises"
  ON exercicios FOR SELECT
  USING (true);

CREATE POLICY "Only trainers can insert exercises"
  ON exercicios FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'treinador'
    )
  );

CREATE POLICY "Only trainers can update exercises"
  ON exercicios FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'treinador'
    )
  );

-- Training programs policies
CREATE POLICY "Users can view own programs"
  ON programas_treino FOR SELECT
  USING (cliente_id = auth.uid());

CREATE POLICY "Trainers can view all programs"
  ON programas_treino FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'treinador'
    )
  );

CREATE POLICY "Trainers can create programs"
  ON programas_treino FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'treinador'
    )
  );

CREATE POLICY "Trainers can update programs"
  ON programas_treino FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'treinador'
    )
  );

-- Workouts policies
CREATE POLICY "Users can view workouts from own programs"
  ON treinos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM programas_treino
      WHERE id = treinos.programa_id
      AND cliente_id = auth.uid()
    )
  );

CREATE POLICY "Trainers can view all workouts"
  ON treinos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'treinador'
    )
  );

CREATE POLICY "Trainers can manage workouts"
  ON treinos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'treinador'
    )
  );

-- Workout exercises policies
CREATE POLICY "Users can view workout exercises from own programs"
  ON exercicios_treino FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM treinos t
      JOIN programas_treino p ON t.programa_id = p.id
      WHERE t.id = exercicios_treino.treino_id
      AND p.cliente_id = auth.uid()
    )
  );

CREATE POLICY "Trainers can manage workout exercises"
  ON exercicios_treino FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'treinador'
    )
  );

-- Workout logs policies
CREATE POLICY "Users can view own workout logs"
  ON registros_treino FOR SELECT
  USING (usuario_id = auth.uid());

CREATE POLICY "Users can create own workout logs"
  ON registros_treino FOR INSERT
  WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "Users can update own workout logs"
  ON registros_treino FOR UPDATE
  USING (usuario_id = auth.uid());

CREATE POLICY "Trainers can view all workout logs"
  ON registros_treino FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'treinador'
    )
  );

-- Progress policies
CREATE POLICY "Users can view own progress"
  ON progresso_usuario FOR SELECT
  USING (usuario_id = auth.uid());

CREATE POLICY "Users can manage own progress"
  ON progresso_usuario FOR ALL
  USING (usuario_id = auth.uid());

CREATE POLICY "Trainers can view all progress"
  ON progresso_usuario FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'treinador'
    )
  );

-- Consultations policies
CREATE POLICY "Users can view own consultations"
  ON consultorias FOR SELECT
  USING (cliente_id = auth.uid());

CREATE POLICY "Trainers can view all consultations"
  ON consultorias FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'treinador'
    )
  );

CREATE POLICY "Trainers can manage consultations"
  ON consultorias FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'treinador'
    )
  );

-- Messages policies
CREATE POLICY "Users can view messages they sent or received"
  ON mensagens FOR SELECT
  USING (
    remetente_id = auth.uid() OR destinatario_id = auth.uid()
  );

CREATE POLICY "Users can send messages"
  ON mensagens FOR INSERT
  WITH CHECK (remetente_id = auth.uid());

CREATE POLICY "Users can update messages they received (mark as read)"
  ON mensagens FOR UPDATE
  USING (destinatario_id = auth.uid());

-- =============================================
-- FUNCTIONS & TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for users table
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, nome)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- SEED DATA (Optional - for testing)
-- =============================================

-- Insert trainer account (update with real data)
-- Password should be hashed by Supabase Auth
-- This is just a placeholder - create trainer account through Supabase dashboard

-- INSERT INTO users (id, email, nome, role)
-- VALUES (
--   'TRAINER_UUID_HERE',
--   'david@treinadordavid.com',
--   'Treinador David',
--   'treinador'
-- );

-- Sample exercises (add more later)
INSERT INTO exercicios (nome, categoria, subcategoria, dificuldade, equipamento, musculos_primarios, musculos_secundarios, descricao, tags, video_url)
VALUES
  (
    'Supino Reto com Barra',
    'Peito',
    'Peito Médio',
    'intermediário',
    ARRAY['Barra', 'Anilhas', 'Banco'],
    ARRAY['Peitoral Maior'],
    ARRAY['Tríceps', 'Deltoide Anterior'],
    'Exercício fundamental para desenvolvimento do peitoral. Deite em banco reto, pegue a barra com pegada média, desça controladamente até o peito e empurre explosivamente.',
    ARRAY['hipertrofia', 'força', 'peito'],
    'https://www.youtube.com/watch?v=EXAMPLE_VIDEO_ID_1'
  ),
  (
    'Agachamento Livre',
    'Pernas',
    'Quadríceps',
    'intermediário',
    ARRAY['Barra', 'Anilhas', 'Rack'],
    ARRAY['Quadríceps', 'Glúteos'],
    ARRAY['Core', 'Isquiotibiais'],
    'Rei dos exercícios para membros inferiores. Posicione a barra nas costas, desça mantendo coluna neutra até quebra de paralelo, empurre pelo calcanhar.',
    ARRAY['hipertrofia', 'força', 'pernas'],
    'https://www.youtube.com/watch?v=EXAMPLE_VIDEO_ID_2'
  ),
  (
    'Levantamento Terra',
    'Costas',
    'Lombar',
    'avançado',
    ARRAY['Barra', 'Anilhas'],
    ARRAY['Lombar', 'Glúteos', 'Isquiotibiais'],
    ARRAY['Trapézio', 'Core'],
    'Exercício composto completo. Pegue a barra no chão, mantenha coluna neutra, empurre com as pernas e estenda quadril simultaneamente.',
    ARRAY['hipertrofia', 'força', 'costas', 'posterior'],
    'https://www.youtube.com/watch?v=EXAMPLE_VIDEO_ID_3'
  )
ON CONFLICT DO NOTHING;

-- =============================================
-- STORAGE BUCKETS (Run in Supabase Dashboard)
-- =============================================

-- Create storage buckets for:
-- 1. avatars (public)
-- 2. progress-photos (private - RLS)
-- 3. exercise-videos (public) - if not using YouTube

-- Storage policies will be configured via Supabase Dashboard

-- =============================================
-- REALTIME (Enable for chat)
-- =============================================

-- Enable realtime for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE mensagens;

-- =============================================
-- COMPLETED
-- =============================================

-- Schema creation completed successfully!
-- Next steps:
-- 1. Run this SQL in Supabase SQL Editor
-- 2. Create storage buckets via Dashboard
-- 3. Configure authentication providers (Google, Apple)
-- 4. Set up Mercado Pago webhooks
-- 5. Deploy application to Vercel
