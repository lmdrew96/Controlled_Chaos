/**
 * Authentication service using Supabase
 */

import { supabase, isSupabaseConfigured } from './supabase.js';
import type { User, Session } from '@supabase/supabase-js';

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

let currentUser: User | null = null;

/**
 * Get the current user
 */
export function getCurrentUser(): User | null {
  return currentUser;
}

/**
 * Check if user is logged in
 */
export function isLoggedIn(): boolean {
  return currentUser !== null;
}

/**
 * Initialize auth state and set up listener
 */
export async function initAuth(onAuthChange: (user: User | null) => void): Promise<void> {
  if (!isSupabaseConfigured()) {
    console.log('Supabase not configured, skipping auth');
    onAuthChange(null);
    return;
  }

  // Get initial session
  const { data: { session } } = await supabase.auth.getSession();
  currentUser = session?.user ?? null;
  onAuthChange(currentUser);

  // Listen for auth changes
  supabase.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user ?? null;
    onAuthChange(currentUser);
  });
}

/**
 * Sign up with email and password
 */
export async function signUp(email: string, password: string): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) {
    return { error: 'Authentication not available' };
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) {
    return { error: 'Authentication not available' };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

/**
 * Sign out
 */
export async function signOut(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  await supabase.auth.signOut();
}

/**
 * Send password reset email
 */
export async function resetPassword(email: string): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) {
    return { error: 'Authentication not available' };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}
