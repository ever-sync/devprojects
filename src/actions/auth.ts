'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAppUrl } from '@/lib/app-url'

export async function signInWithGoogle() {
  const supabase = await createClient()
  const appUrl = getAppUrl()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${appUrl}/api/auth/callback`,
      queryParams: {
        // Restringe ao Google Workspace do domínio (configure GOOGLE_WORKSPACE_DOMAIN no env)
        ...(process.env.GOOGLE_WORKSPACE_DOMAIN
          ? { hd: process.env.GOOGLE_WORKSPACE_DOMAIN }
          : {}),
        access_type: 'offline',
        prompt: 'select_account',
      },
    },
  })

  if (error || !data.url) {
    redirect('/login?error=google_oauth_failed')
  }

  redirect(data.url)
}

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return { error: 'Email ou senha incorretos.' }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function resetPassword(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const appUrl = getAppUrl()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/reset-password`,
  })

  if (error) {
    return { error: 'Erro ao enviar email de recuperação. Tente novamente.' }
  }

  return { success: 'Email de recuperação enviado. Verifique sua caixa de entrada.' }
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient()
  const password = formData.get('password') as string

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return { error: 'Erro ao atualizar senha. Tente novamente.' }
  }

  redirect('/dashboard')
}
