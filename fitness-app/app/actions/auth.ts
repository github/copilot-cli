'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SignUpForm, SignInForm } from '@/types'

export async function signUp(formData: SignUpForm) {
  const supabase = await createClient()

  // Validate input
  if (!formData.email || !formData.password || !formData.nome) {
    return { error: 'Todos os campos são obrigatórios' }
  }

  if (formData.password.length < 6) {
    return { error: 'A senha deve ter pelo menos 6 caracteres' }
  }

  // Sign up with Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: formData.email,
    password: formData.password,
    options: {
      data: {
        nome: formData.nome,
      },
    },
  })

  if (authError) {
    console.error('Signup error:', authError)
    return { error: authError.message }
  }

  if (!authData.user) {
    return { error: 'Erro ao criar conta. Tente novamente.' }
  }

  // Update user profile with additional info
  if (formData.telefone) {
    const { error: updateError } = await supabase
      .from('users')
      .update({
        telefone: formData.telefone,
      })
      .eq('id', authData.user.id)

    if (updateError) {
      console.error('Profile update error:', updateError)
    }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signIn(formData: SignInForm) {
  const supabase = await createClient()

  // Validate input
  if (!formData.email || !formData.password) {
    return { error: 'Email e senha são obrigatórios' }
  }

  // Sign in with Supabase Auth
  const { error } = await supabase.auth.signInWithPassword({
    email: formData.email,
    password: formData.password,
  })

  if (error) {
    console.error('Signin error:', error)
    return { error: 'Email ou senha incorretos' }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signOut() {
  const supabase = await createClient()

  const { error } = await supabase.auth.signOut()

  if (error) {
    console.error('Signout error:', error)
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/auth/login')
}

export async function resetPassword(email: string) {
  const supabase = await createClient()

  if (!email) {
    return { error: 'Email é obrigatório' }
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/atualizar-senha`,
  })

  if (error) {
    console.error('Reset password error:', error)
    return { error: error.message }
  }

  return { success: true, message: 'Email de recuperação enviado! Verifique sua caixa de entrada.' }
}

export async function updatePassword(newPassword: string) {
  const supabase = await createClient()

  if (!newPassword || newPassword.length < 6) {
    return { error: 'A nova senha deve ter pelo menos 6 caracteres' }
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (error) {
    console.error('Update password error:', error)
    return { error: error.message }
  }

  return { success: true, message: 'Senha atualizada com sucesso!' }
}

export async function signInWithGoogle() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  })

  if (error) {
    console.error('Google signin error:', error)
    return { error: error.message }
  }

  if (data.url) {
    redirect(data.url)
  }
}

export async function getUser() {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  // Get full user profile
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile
}
