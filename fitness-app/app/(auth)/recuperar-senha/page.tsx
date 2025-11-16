'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { resetPassword } from '@/app/actions/auth'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (!email) {
      setError('Digite seu email')
      return
    }

    setLoading(true)

    try {
      const result = await resetPassword(email)

      if (result?.error) {
        setError(result.error)
      } else if (result?.success) {
        setSuccess(true)
      }
    } catch (err) {
      setError('Erro ao enviar email. Tente novamente.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recuperar senha</CardTitle>
        <CardDescription>
          Digite seu email para receber instruções de recuperação
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="error">
              {error}
            </Alert>
          )}

          {success && (
            <Alert variant="success">
              <div>
                <strong>Email enviado!</strong>
                <p className="mt-1">
                  Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
                </p>
              </div>
            </Alert>
          )}

          {!success && (
            <div className="space-y-2">
              <Label htmlFor="email" required>Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-5 w-5 text-td-text-secondary" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  className="pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col space-y-3">
          {!success ? (
            <>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Enviando...' : 'Enviar email de recuperação'}
              </Button>

              <Link
                href="/auth/login"
                className="flex items-center justify-center text-sm text-td-blue-text hover:text-td-blue-display font-medium transition-colors"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para login
              </Link>
            </>
          ) : (
            <Link href="/auth/login" className="w-full">
              <Button
                type="button"
                variant="default"
                size="lg"
                className="w-full"
              >
                <ArrowLeft className="mr-2 h-5 w-5" />
                Voltar para login
              </Button>
            </Link>
          )}
        </CardFooter>
      </form>
    </Card>
  )
}
