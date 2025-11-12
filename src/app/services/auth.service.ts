import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { createClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

export const supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey);

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

  /** Traducción de errores */
  errorToMessage(err: unknown): string {
    const raw = String((err as any)?.message || err || '');
    const low = raw.toLowerCase();

    if (
      low.includes('already registered') ||
      low.includes('duplicate key') ||
      low.includes('usuarios_email_key') ||
      low.includes('email already exists')
    )
      return 'Ese correo ya está registrado.';

    if (low.includes('email not confirmed')) return 'Tu correo no está confirmado.';
    if (low.includes('invalid login credentials')) return 'Correo o contraseña incorrectos.';
    return raw || 'Ocurrió un error. Inténtalo de nuevo.';
  }

  /** Registro con validación de existencia */
  async signUp(email: string, password: string, username?: string) {
    // Verifica si ya existe el usuario haciendo un intento de login falso
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: 'x', // contraseña falsa
    });

    if (signInError && signInError.message.toLowerCase().includes('invalid login credentials')) {
      throw new Error('Ese correo ya está registrado.');
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username: username ?? '' } },
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('already registered')) throw new Error('Ese correo ya está registrado.');
      throw error;
    }

    if (!data.user && !data.session) {
      throw new Error('Ese correo ya está registrado.');
    }

    return data;
  }

  /** Login */
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  /** Reset password */
  async sendPasswordReset(email: string, redirectTo: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
    return true;
  }

  /** Update password after reset */
  async updatePassword(newPassword: string) {
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    return data;
  }

  /** Reenviar confirmación */
  async resendEmailConfirmation(email: string) {
    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });
    if (error) throw error;
    return data;
  }

  /** Cargar sesión desde URL */
  async loadSessionFromURL() {
    // Primero intentamos obtener la sesión directamente
    const { data } = await supabase.auth.getSession();
    if (data.session) return data.session;

    // Si no hay sesión, intentamos completar el flujo OAuth PKCE.
    // Verificamos que exista el code_verifier guardado en localStorage (supabase lo guarda
    // durante el inicio del flujo). Si no existe, la llamada a exchangeCodeForSession fallará
    // con: "invalid request: both auth code and code verifier should be non-empty".
    const hasVerifier = Object.values(localStorage).some((v) =>
      String(v).includes('code_verifier')
    );

    if (!hasVerifier) {
      // No podemos completar el intercambio sin el code_verifier. Informar al llamador.
      throw new Error(
        'Imposible completar OAuth: no se encontró el code_verifier en localStorage. Intenta iniciar sesión de nuevo en la misma pestaña (no en una nueva ventana) y asegúrate de que la URL de redirección configurada en Supabase coincide con la de la aplicación.'
      );
    }

    // Algunas versiones de la librería exponen helpers para esto; si existe, usarlos.
    // Intentamos primero el helper getSessionFromUrl (si está disponible), si no, caemos
    // en exchangeCodeForSession.
    try {
      // try getSessionFromUrl when available
      // @ts-ignore: método opcional según versión de supabase-js
      if (typeof (supabase.auth as any).getSessionFromUrl === 'function') {
        // Algunas implementaciones retornan { data, error }
        const res = await (supabase.auth as any).getSessionFromUrl();
        if (res?.error) throw res.error;
        if (res?.data?.session) return res.data.session;
      }

      const { data: ex, error: exErr } = await supabase.auth.exchangeCodeForSession(
        window.location.href
      );
      if (exErr) throw exErr;
      return ex.session;
    } catch (err: any) {
      // Re-lanzar con mensaje claro
      throw new Error(err?.message || String(err));
    }
  }
}
