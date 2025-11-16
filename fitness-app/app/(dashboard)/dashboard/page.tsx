import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dumbbell,
  TrendingUp,
  Calendar,
  MessageCircle,
  Activity,
  Target,
  Clock,
  Award,
} from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  // Get active program
  const { data: activeProgram } = await supabase
    .from('programas_treino')
    .select('*, treinos(*)')
    .eq('cliente_id', user.id)
    .eq('ativo', true)
    .single()

  // Get recent workout logs (last 7 days)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { data: recentLogs, count: workoutCount } = await supabase
    .from('registros_treino')
    .select('*', { count: 'exact' })
    .eq('usuario_id', user.id)
    .gte('data_execucao', sevenDaysAgo.toISOString().split('T')[0])

  // Get latest progress entry
  const { data: latestProgress } = await supabase
    .from('progresso_usuario')
    .select('*')
    .eq('usuario_id', user.id)
    .order('data_registro', { ascending: false })
    .limit(1)
    .single()

  // Get upcoming consultation
  const { data: nextConsultation } = await supabase
    .from('consultorias')
    .select('*')
    .eq('cliente_id', user.id)
    .eq('status', 'confirmado')
    .gte('data_agendamento', new Date().toISOString())
    .order('data_agendamento', { ascending: true })
    .limit(1)
    .single()

  // Get unread messages count
  const { count: unreadMessages } = await supabase
    .from('mensagens')
    .select('*', { count: 'exact', head: true })
    .eq('destinatario_id', user.id)
    .eq('lida', false)

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-headings font-bold text-td-blue-dark">
          Bem-vindo de volta, {profile?.nome?.split(' ')[0] || 'Atleta'}! 💪
        </h1>
        <p className="mt-2 text-td-text-secondary">
          Aqui está um resumo da sua jornada fitness
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Treinos (7 dias)"
          value={workoutCount || 0}
          icon={<Activity className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="Peso Atual"
          value={latestProgress?.peso ? `${latestProgress.peso}kg` : '-'}
          icon={<TrendingUp className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          title="Objetivo"
          value={profile?.objetivo || 'Não definido'}
          icon={<Target className="w-5 h-5" />}
          color="orange"
        />
        <StatCard
          title="Mensagens"
          value={unreadMessages || 0}
          icon={<MessageCircle className="w-5 h-5" />}
          color="purple"
          badge={unreadMessages ? true : false}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today's Workout */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Treino de Hoje</CardTitle>
                <CardDescription>
                  {activeProgram ? 'Seu programa ativo' : 'Nenhum programa ativo'}
                </CardDescription>
              </div>
              <Dumbbell className="w-8 h-8 text-td-blue-display" />
            </div>
          </CardHeader>
          <CardContent>
            {activeProgram ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-headings font-bold text-lg text-td-blue-dark">
                    {activeProgram.nome}
                  </h3>
                  <p className="text-sm text-td-text-secondary mt-1">
                    {activeProgram.descricao}
                  </p>
                </div>

                {activeProgram.treinos && activeProgram.treinos.length > 0 && (
                  <div className="bg-td-bg-secondary rounded-lg p-4">
                    <h4 className="font-semibold text-td-text-primary mb-2">
                      Próximo Treino
                    </h4>
                    <p className="text-sm text-td-text-secondary">
                      {activeProgram.treinos[0].nome_divisao}
                    </p>
                    <p className="text-xs text-td-text-secondary mt-1">
                      {activeProgram.treinos[0].duracao_estimada} minutos
                    </p>
                  </div>
                )}

                <Link href="/dashboard/treino">
                  <Button variant="primary" className="w-full">
                    Iniciar Treino
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-td-text-secondary mb-4">
                  Você ainda não tem um programa de treino ativo.
                </p>
                <Link href="/dashboard/consultorias">
                  <Button variant="primary">
                    Agendar Consultoria
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Progress & Upcoming */}
        <div className="space-y-6">
          {/* Next Consultation */}
          {nextConsultation ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Próxima Consultoria</CardTitle>
                    <CardDescription>Agendada</CardDescription>
                  </div>
                  <Calendar className="w-8 h-8 text-td-cta-orange" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="font-semibold text-td-blue-dark">
                    {nextConsultation.tipo}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-td-text-secondary">
                    <Clock className="w-4 h-4" />
                    {formatDate(nextConsultation.data_agendamento!)} às{' '}
                    {new Date(nextConsultation.data_agendamento!).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                  {nextConsultation.link_meet && (
                    <Link href={nextConsultation.link_meet} target="_blank">
                      <Button variant="default" className="w-full mt-4">
                        Entrar na Chamada
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Agende sua Consultoria</CardTitle>
                <CardDescription>
                  Converse com o Treinador David
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-td-text-secondary mb-4">
                  Agende uma consultoria para receber seu programa personalizado
                </p>
                <Link href="/dashboard/consultorias">
                  <Button variant="primary" className="w-full">
                    Ver Horários Disponíveis
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/dashboard/progresso">
                <Button variant="outline" className="w-full justify-start">
                  <TrendingUp className="mr-2 w-4 h-4" />
                  Registrar Progresso
                </Button>
              </Link>
              <Link href="/dashboard/exercicios">
                <Button variant="outline" className="w-full justify-start">
                  <Dumbbell className="mr-2 w-4 h-4" />
                  Ver Biblioteca de Exercícios
                </Button>
              </Link>
              <Link href="/dashboard/chat">
                <Button variant="outline" className="w-full justify-start">
                  <MessageCircle className="mr-2 w-4 h-4" />
                  Falar com Treinador
                  {unreadMessages ? (
                    <span className="ml-auto bg-td-cta-orange text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {unreadMessages}
                    </span>
                  ) : null}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Motivational Quote */}
      <Card className="bg-gradient-to-r from-td-blue-display to-td-blue-text text-white border-none">
        <CardContent className="py-8">
          <div className="flex items-start gap-4">
            <Award className="w-12 h-12 flex-shrink-0 opacity-80" />
            <div>
              <p className="text-lg font-headings font-bold mb-2">
                "O único treino ruim é aquele que não aconteceu."
              </p>
              <p className="text-sm opacity-90">
                Continue focado e consistente. Você está no caminho certo! 💪
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon,
  color,
  badge,
}: {
  title: string
  value: string | number
  icon: React.ReactNode
  color: 'blue' | 'green' | 'orange' | 'purple'
  badge?: boolean
}) {
  const colors = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    orange: 'bg-orange-100 text-orange-600',
    purple: 'bg-purple-100 text-purple-600',
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-td-text-secondary">{title}</p>
            <p className="text-2xl font-headings font-bold text-td-blue-dark mt-2">
              {value}
            </p>
          </div>
          <div className={`p-3 rounded-lg ${colors[color]} relative`}>
            {icon}
            {badge && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-td-cta-orange rounded-full border-2 border-white" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
