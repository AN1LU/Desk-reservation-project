// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { supabase } from './supabase-client';
import { BehaviorSubject } from 'rxjs';

export interface SessionState {
  loading: boolean;
  user: any | null;
  error?: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _state = new BehaviorSubject<SessionState>({ loading: true, user: null });
  readonly state$ = this._state.asObservable();

  constructor() {
    this.initSessionWatcher();
  }

  private async initSessionWatcher() {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      this._state.next({ loading: false, user: data.session?.user ?? null });
    } catch (err: any) {
      this._state.next({
        loading: false,
        user: null,
        error: err?.message ?? 'Error al cargar sesión',
      });
    }

    supabase.auth.onAuthStateChange((_event, session) => {
      this._state.next({ loading: false, user: session?.user ?? null });
    });
  }

  /** Registro: SOLO en Auth. El trigger llena public.usuarios */
  async signUp(email: string, password: string, username?: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username: username ?? '' },
        // Si tienes email confirmation, déjalo; si no, podrías incluir redirectTo
      },
    });
    if (error) throw error;
    return data;
  }

  /** Login con email/contraseña */
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  async getSessionUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user;
  }
}
