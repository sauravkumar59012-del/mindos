// src/lib/auth.js
// Saare auth functions yahan hain

import { supabase } from './supabase'

// ================================
// SIGNUP — Naya account banao
// ================================
export async function signUp(email, password, name) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name }
    }
  })
  if (error) throw error
  return data
}

// ================================
// LOGIN — Email + Password
// ================================
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  if (error) throw error
  return data
}

// ================================
// GOOGLE LOGIN
// ================================
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + '/dashboard'
    }
  })
  if (error) throw error
  return data
}

// ================================
// LOGOUT
// ================================
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// ================================
// CURRENT USER
// ================================
export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// ================================
// PASSWORD RESET
// ================================
export async function resetPassword(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + '/reset-password'
  })
  if (error) throw error
}

// ================================
// AUTH STATE CHANGE LISTENER
// ================================
export function onAuthChange(callback) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      callback(event, session?.user || null)
    }
  )
  return subscription
}