import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      'https://TU-PROJECT-URL.supabase.co', // 🔹 Reemplázalo con tu URL
      'TU-API-KEY' // 🔹 Reemplázalo con tu key pública de Supabase
    );
  }

  get client() {
    return this.supabase;
  }
}
