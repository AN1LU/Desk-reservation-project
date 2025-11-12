
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { supabase } from '../services/supabase-client';

interface Membership {
  id?: any;
  tipo_membresia?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  reservas_restantes?: number | null;
}

interface UserReservation {
  id_reserva?: any;
  id_espacio?: any;
  fecha_inicio?: string;
  fecha_fin?: string;
}


@Component({
  selector: 'app-myprofile',
  standalone: true,
  templateUrl: './myprofile.html',
  styleUrls: ['./myprofile.css'],
  imports: [CommonModule, RouterLink]
})
export class MyprofileComponent implements OnInit {
  loading = false;
  user: any = null;
  displayName = '';
  membership: Membership | null = null;
  reservations: UserReservation[] = [];
  remainingReservations: number | null = null;
  infoMessage = '';

  async ngOnInit(): Promise<void> {
    await this.loadProfile();
  }

  /** Try to find user's membership using common column names */
  private async findMembershipForUser(userId: string) {
    const candidates = ['id_usuario_uuid', 'user_id', 'id_usuario', 'usuario_id'];
    for (const col of candidates) {
      try {
        const { data, error } = await supabase.from('membresias').select('*').eq(col, userId).limit(1);
        if (!error && data && data.length > 0) return data[0];
      } catch (e) {
        // ignore and continue
      }
    }
    return null;
  }

  /** Try to find reservations linked to user using common column names */
  private async findReservationsForUser(userId: string) {
    const candidates = ['id_usuario_uuid', 'user_id', 'id_usuario', 'usuario_id'];
    for (const col of candidates) {
      try {
        const { data, error } = await supabase.from('reservas').select('id_reserva,id_espacio,fecha_inicio,fecha_fin').eq(col, userId).order('fecha_inicio', { ascending: true });
        if (!error && data) return data;
      } catch (e) {
        // continue
      }
    }
    // If no results by user id, try common email-like columns as fallback
    const emailCandidates = ['email', 'user_email', 'usuario_email', 'correo'];
    for (const col of emailCandidates) {
      try {
        const { data, error } = await supabase.from('reservas').select('id_reserva,id_espacio,fecha_inicio,fecha_fin').eq(col, this.user?.email ?? '').order('fecha_inicio', { ascending: true });
        if (!error && data && data.length > 0) return data;
      } catch (e) {
        // continue
      }
    }

    return [];
  }

  private async loadProfile() {
    this.loading = true;
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) {
        this.infoMessage = 'No se pudo obtener el usuario: ' + (userErr.message ?? String(userErr));
        this.loading = false;
        return;
      }
      const user = userData?.user ?? null;
      if (!user) {
        this.infoMessage = 'No hay sesión activa.';
        this.loading = false;
        return;
      }
      this.user = user;
  const meta: any = user.user_metadata ?? {};
  this.displayName = (meta['full_name'] || meta['name']) || user.email || user.id;

      // membership (best-effort, try multiple column names)
      const membership = await this.findMembershipForUser(user.id);
      if (membership) {
        this.membership = membership as Membership;
        // Do NOT trust membership.reservas_restantes as authoritative on the client side
        // (it may be stale). We'll compute remainingReservations below from actual reservations.
        this.remainingReservations = null;
      } else {
        this.membership = null;
      }

      // reservations
      this.reservations = await this.findReservationsForUser(user.id);
      // If membership is basic, compute remaining reservations (assume 5 total unless DB provides a stricter value)
      if ((this.membership?.tipo_membresia || '').toLowerCase().includes('basica')) {
        const allowed = 5; // assumption — adjust if DB has different limit

        // Prefer counting reservations that occurred during the membership period so that
        // once a reservation was used it still counts against the quota (doesn't free up after it expires).
        try {
          const parseDate = (s: any) => {
            if (!s) return null;
            // If already a Date
            if (s instanceof Date) return s;
            // Try direct parse
            let d = new Date(s);
            if (!isNaN(d.getTime())) return d;
            // Try replacing space with T (some DBs store 'YYYY-MM-DD HH:MM:SS')
            try {
              const normalized = String(s).replace(' ', 'T');
              d = new Date(normalized);
              if (!isNaN(d.getTime())) return d;
            } catch (err) {
              // fallthrough
            }
            // Last resort: Date.parse
            const ms = Date.parse(String(s));
            if (!isNaN(ms)) return new Date(ms);
            return null;
          };

          const memStart = parseDate(this.membership?.fecha_inicio) as Date | null;
          const memEnd = parseDate(this.membership?.fecha_fin) as Date | null;

          let usedReservations = 0;
          if (memStart || memEnd) {
            // If we have membership period info, count reservations whose start falls inside that window.
            usedReservations = this.reservations.filter(r => {
              if (!r?.fecha_inicio) return false;
              const rStart = parseDate(r.fecha_inicio);
              if (!rStart) return false;
              if (memStart && rStart < memStart) return false;
              if (memEnd && rStart > memEnd) return false;
              return true;
            }).length;
          } else {
            // Fallback: if membership period unknown, count all reservations (so used reservations don't get freed when they expire).
            usedReservations = this.reservations.length;
          }

          this.remainingReservations = Math.max(0, allowed - usedReservations);
        } catch (e) {
          // On any error, fallback to previous behaviour (count future reservations)
          const now = new Date();
          const futureReservations = this.reservations.filter(r => (r.fecha_fin ? new Date(r.fecha_fin) : now) >= now).length;
          this.remainingReservations = Math.max(0, 5 - futureReservations);
        }
      }

      // end loadProfile

    } catch (e: any) {
      console.error('loadProfile error', e);
      this.infoMessage = 'Error cargando perfil: ' + (e?.message ?? String(e));
    } finally {
      this.loading = false;
    }
  }

  /** Cancel (hard delete) a reservation owned by the user */
  async cancelReservation(id: any) {
    if (!id) return;
    const ok = window.confirm('¿Estás seguro de que quieres cancelar esta reserva?');
    if (!ok) return;
    this.loading = true;
    try {
      // Prevent cancelling if reservation has already started
      const reservation = this.reservations.find(r => String(r.id_reserva) === String(id));
      if (reservation) {
        const parseDate = (s: any) => {
          if (!s) return null;
          if (s instanceof Date) return s;
          let d = new Date(s);
          if (!isNaN(d.getTime())) return d;
          try { const normalized = String(s).replace(' ', 'T'); d = new Date(normalized); if (!isNaN(d.getTime())) return d; } catch(e) {}
          const ms = Date.parse(String(s)); if (!isNaN(ms)) return new Date(ms);
          return null;
        };
        const start = parseDate(reservation.fecha_inicio);
        const now = new Date();
        if (start && now >= start) {
          this.infoMessage = 'No puedes cancelar una reserva cuyo periodo ya comenzó.';
          this.loading = false;
          return;
        }
      }

      const { data, error } = await supabase.from('reservas').delete().eq('id_reserva', id);
      if (error) {
        console.error('cancelReservation error', error);
        this.infoMessage = 'Error al cancelar la reserva: ' + (error.message ?? String(error));
      } else {
        // remove locally
        this.reservations = this.reservations.filter(r => String(r.id_reserva) !== String(id));
        // recompute remaining for basic membership using the same logic as loadProfile
        if ((this.membership?.tipo_membresia || '').toLowerCase().includes('basica')) {
          try {
            // reuse the same computation as in loadProfile: count reservations within membership window
            const parseDate = (s: any) => {
              if (!s) return null;
              if (s instanceof Date) return s;
              let d = new Date(s);
              if (!isNaN(d.getTime())) return d;
              try { const normalized = String(s).replace(' ', 'T'); d = new Date(normalized); if (!isNaN(d.getTime())) return d; } catch(e) {}
              const ms = Date.parse(String(s)); if (!isNaN(ms)) return new Date(ms);
              return null;
            };
            const memStart = parseDate(this.membership?.fecha_inicio) as Date | null;
            const memEnd = parseDate(this.membership?.fecha_fin) as Date | null;
            let usedReservations = 0;
            if (memStart || memEnd) {
              usedReservations = this.reservations.filter(r => {
                if (!r?.fecha_inicio) return false;
                const rStart = parseDate(r.fecha_inicio);
                if (!rStart) return false;
                if (memStart && rStart < memStart) return false;
                if (memEnd && rStart > memEnd) return false;
                return true;
              }).length;
            } else {
              usedReservations = this.reservations.length;
            }
            const allowed = 5;
            this.remainingReservations = Math.max(0, allowed - usedReservations);
          } catch (err) {
            // fallback conservative
            const now = new Date();
            const futureReservations = this.reservations.filter(r => (r.fecha_fin ? new Date(r.fecha_fin) : now) >= now).length;
            this.remainingReservations = Math.max(0, 5 - futureReservations);
          }
        }
        this.infoMessage = 'Reserva cancelada correctamente.';
      }
    } catch (e: any) {
      console.error('cancelReservation unexpected', e);
      this.infoMessage = 'Error inesperado al cancelar: ' + (e?.message ?? String(e));
    } finally {
      this.loading = false;
    }
  }
}
