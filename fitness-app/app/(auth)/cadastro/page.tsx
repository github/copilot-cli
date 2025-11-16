'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Mail, Lock, User, Phone, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { signUp, signInWithGoogle } from '@/app/actions/auth'

export default function SignUpPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    // Validações
    if (!formData.nome || !formData.email || !formData.password) {
      setError('Preencha todos os campos obrigatórios')
      return
    }

    if (formData.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem')
      return
    }

    setLoading(true)

    try {
      const result = await signUp({
        nome: formData.nome,
        email: formData.email,
        telefone: formData.telefone || undefined,
        password: formData.password,
      })

      if (result?.error) {
        setError(result.error)
      }
      // Se não tem erro, o redirect já aconteceu via server action
    } catch (err) {
      setError('Erro ao criar conta. Tente novamente.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleSignIn() {
    setError('')
    setLoading(true)

    try {
      await signInWithGoogle()
    } catch (err) {
      setError('Erro ao fazer login com Google. Tente novamente.')
      console.error(err)
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Criar sua conta</CardTitle>
        <CardDescription>
          Comece sua jornada fitness com o Treinador David
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="error">
              {error}
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="nome" required>Nome completo</Label>
            <div className="relative">
              <User className="absolute left-3 top-3.5 h-5 w-5 text-td-text-secondary" />
              <Input
                id="nome"
                name="nome"
                type="text"
                placeholder="João Silva"
                className="pl-10"
                value={formData.nome}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" required>Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 h-5 w-5 text-td-text-secondary" />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="seu@email.com"
                className="pl-10"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefone">WhatsApp (opcional)</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-3.5 h-5 w-5 text-td-text-secondary" />
              <Input
                id="telefone"
                name="telefone"
                type="tel"
                placeholder="(61) 98765-4321"
                className="pl-10"
                value={formData.telefone}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" required>Senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 h-5 w-5 text-td-text-secondary" />
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                className="pl-10"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" required>Confirmar senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 h-5 w-5 text-td-text-secondary" />
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Digite a senha novamente"
                className="pl-10"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="text-xs text-td-text-secondary">
            Ao criar uma conta, você concorda com nossos{' '}
            <Link href="/termos" className="text-td-blue-text hover:underline">
              Termos de Uso
            </Link>{' '}
            e{' '}
            <Link href="/privacidade" className="text-td-blue-text hover:underline">
              Política de Privacidade
            </Link>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-3">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={loading}
          >
            {loading ? (
              'Criando conta...'
            ) : (
              <>
                <UserPlus className="mr-2 h-5 w-5" />
                Criar conta grátis
              </>
            )}
          </Button>

          <div className="relative w-full">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-td-text-secondary">
                ou continue com
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google
          </Button>

          <div className="text-center text-sm text-td-text-secondary">
            Já tem uma conta?{' '}
            <Link
              href="/auth/login"
              className="text-td-blue-text hover:text-td-blue-display font-semibold transition-colors"
            >
              Fazer login
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  )
}
