
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
  showCancelConfirmation = false;
  showCancelReservationConfirmation = false;
  reservationToCancel: any = null;

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

  /** Cancel membership */
  async cancelMembership() {
    if (!this.membership) {
      this.infoMessage = 'No tienes una membresía activa para cancelar.';
      return;
    }

    // Mostrar modal de confirmación personalizado
    this.showCancelConfirmation = true;
  }

  async confirmCancelMembership() {
    this.showCancelConfirmation = false;

    if (!this.membership) {
      return;
    }

    this.loading = true;
    this.infoMessage = '';

    try {
      // Obtener el ID de la membresía
      const membershipId = this.membership.id || (this.membership as any).id_membresia || (this.membership as any).idMembresia;
      const membershipType = this.membership.tipo_membresia;
      const groupId = (this.membership as any).id_grupo;
      
      if (!membershipId) {
        this.infoMessage = 'Error: No se pudo identificar la membresía.';
        console.error('Membership object:', this.membership);
        this.loading = false;
        return;
      }

      console.log('Attempting to delete membership:', { membershipId, membershipType, groupId });

      // Si es membresía corporativa, eliminar todas las membresías del grupo y el grupo mismo
      if (membershipType?.toLowerCase() === 'corporativa' && groupId) {
        console.log('[DEBUG] Deleting corporate membership and all group members');
        
        // Usar función RPC para eliminar todo el grupo (bypasea RLS)
        const { data: deleteResult, error: deleteError } = await supabase.rpc('eliminar_grupo_corporativo', {
          p_id_grupo: groupId
        });
        
        console.log('[DEBUG] eliminar_grupo_corporativo response:', deleteResult);
        
        if (deleteError) {
          console.error('[DEBUG] Error calling RPC:', deleteError);
          this.infoMessage = 'Error al eliminar el grupo: ' + deleteError.message;
          this.loading = false;
          return;
        }
        
        if (deleteResult && !deleteResult.success) {
          console.error('[DEBUG] RPC returned error:', deleteResult.error);
          this.infoMessage = 'Error: ' + deleteResult.error;
          this.loading = false;
          return;
        }
        
        console.log('[DEBUG] Group and all related data deleted successfully');
        
        this.membership = null;
        this.remainingReservations = null;
        this.reservations = [];
        this.infoMessage = 'Membresía corporativa cancelada. Todas las membresías del grupo, reservaciones y el grupo han sido eliminados.';
        
        // NO recargar perfil para membresía corporativa eliminada
        // porque el grupo ya no existe y causaría errores
        setTimeout(() => {
          this.infoMessage = '';
        }, 3000);
        
      } else {
        // Para membresías no corporativas, proceso normal
        const idCandidates = ['id', 'id_membresia', 'idMembresia'];
        let deleted = false;

        for (const idCol of idCandidates) {
          try {
            const { data, error } = await supabase
              .from('membresias')
              .delete()
              .eq(idCol, membershipId)
              .select();

            if (!error) {
              console.log('Membership deleted successfully with column:', idCol, data);
              deleted = true;
              break;
            } else {
              console.log('Failed with column:', idCol, error);
            }
          } catch (e) {
            console.log('Exception with column:', idCol, e);
            continue;
          }
        }

        if (deleted) {
          // Eliminar todas las reservaciones del usuario
          try {
            const { data: userData } = await supabase.auth.getUser();
            const currentUser = userData?.user ?? null;
            
            if (currentUser) {
              const { error: deleteReservationsError } = await supabase
                .from('reservas')
                .delete()
                .eq('id_usuario_uuid', currentUser.id);
              
              if (deleteReservationsError) {
                console.error('Error deleting reservations:', deleteReservationsError);
              } else {
                console.log('All user reservations deleted successfully');
              }
            }
          } catch (e) {
            console.error('Error deleting reservations:', e);
          }

          this.membership = null;
          this.remainingReservations = null;
          this.reservations = [];
          this.infoMessage = 'Membresía y todas las reservaciones canceladas exitosamente.';
        } else {
          this.infoMessage = 'Error al cancelar la membresía. Por favor intenta de nuevo.';
        }
        
        // Solo recargar para membresías no corporativas
        setTimeout(() => {
          this.infoMessage = '';
          this.loadProfile();
        }, 2000);
      }
      
    } catch (e: any) {
      console.error('cancelMembership unexpected error:', e);
      this.infoMessage = 'Error inesperado al cancelar: ' + (e?.message ?? String(e));
    } finally {
      this.loading = false;
    }
  }

  cancelCancelMembership() {
    this.showCancelConfirmation = false;
  }

  cancelCancelReservation() {
    this.showCancelReservationConfirmation = false;
    this.reservationToCancel = null;
  }

  /** Cancel (hard delete) a reservation owned by the user */
  async cancelReservation(id: any) {
    if (!id) return;
    // Guardar la reserva a cancelar y mostrar modal
    this.reservationToCancel = id;
    this.showCancelReservationConfirmation = true;
  }

  async confirmCancelReservation() {
    const id = this.reservationToCancel;
    this.showCancelReservationConfirmation = false;
    this.reservationToCancel = null;
    
    if (!id) return;
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
