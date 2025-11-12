import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { supabase } from '../services/supabase-client';

export interface Desk {
  id: number;
  nombre?: string | null;
  x_percent?: number | null;
  y_percent?: number | null;
  capacidad?: number | null;
  estado?: string | null;
  isReserved?: boolean;
  reservedFrom?: string | null;
  reservedTo?: string | null;
}

@Component({
  selector: 'app-reservations',
  standalone: true,
  templateUrl: './reservations.html',
  styleUrls: ['./reservations.css'],
  imports: [CommonModule, FormsModule, RouterLink],
})
export class ReservationsComponent implements OnInit, OnDestroy {
  fechaInicio: string = '';
  fechaFin: string = '';
  idEscritorio: number | null = null;
  loading = false;
  message = '';
  userReservationsCount: number = 0;
  userReservationsLimit: number = 5;
  desks: Desk[] = [];
  selectedDesk: number | null = null;
  editMode = false;
  // using only `espacios` table for positions (mapa_espacios removed)
  private draggingId: number | null = null;
  private dragOffset = { x: 0, y: 0 };
  private refreshTimer: any = null;

  toggleEditMode() {
    this.editMode = !this.editMode;
    // reset selection when leaving edit mode
    if (!this.editMode) this.draggingId = null;
  }

  onOverlayClick(evt: MouseEvent) {
    if (!this.editMode) return;
    // add a new desk at click position (percent)
    const card = (evt.currentTarget as HTMLElement).closest('.reservations-image-card') as HTMLElement;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = ((evt.clientX - rect.left) / rect.width) * 100;
    const y = ((evt.clientY - rect.top) / rect.height) * 100;
    // create a temporary id (max existing id + 1 or timestamp negative for unsaved)
    const maxId = this.desks.reduce((m, d) => Math.max(m, d.id ?? 0), 0);
    const newId = maxId + 1;
    this.desks = [...this.desks, { id: newId, x_percent: Number(x.toFixed(2)), y_percent: Number(y.toFixed(2)), capacidad: 1 } as any];
  }

  startDrag(evt: MouseEvent, d: any) {
    if (!this.editMode) return;
    evt.preventDefault();
    this.draggingId = d.id;
    const deskEl = (evt.currentTarget as HTMLElement);
    const rect = deskEl.getBoundingClientRect();
    this.dragOffset.x = evt.clientX - (rect.left + rect.width / 2);
    this.dragOffset.y = evt.clientY - (rect.top + rect.height / 2);
    // attach move/up handlers
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
  }

  private onMouseMove = (evt: MouseEvent) => {
    if (this.draggingId == null) return;
    const card = document.querySelector('.reservations-image-card') as HTMLElement;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = ((evt.clientX - rect.left - this.dragOffset.x) / rect.width) * 100;
    const y = ((evt.clientY - rect.top - this.dragOffset.y) / rect.height) * 100;
    // update desk coords in memory
    this.desks = this.desks.map((desk: any) => {
      if (desk.id === this.draggingId) {
        return { ...desk, x_percent: Number(Math.max(0, Math.min(100, x)).toFixed(2)), y_percent: Number(Math.max(0, Math.min(100, y)).toFixed(2)) };
      }
      return desk;
    });
  };

  private onMouseUp = (_evt: MouseEvent) => {
    this.draggingId = null;
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
  };

  /** Save current positions to the `espacios` table. Uses upsert so it works for existing rows. */
  async savePositions() {
    try {
      // Upsert into `espacios` first
      const espacioPayload = this.desks.map((d: any) => ({
        id_espacio: d.id,
        nombre: d.nombre ?? `Escritorio ${d.id}`,
        capacidad: d.capacidad ?? 1,
        x_percent: d.x_percent,
        y_percent: d.y_percent,
      }));

      const { error: upsertError } = await supabase.from('espacios').upsert(espacioPayload, { onConflict: 'id_espacio' });
      if (upsertError) throw upsertError;

      // We persist positions only to `espacios` now

      alert('Posiciones guardadas correctamente');
      this.editMode = false;
      return;
    } catch (err: any) {
      console.error('Error saving positions', err);
      alert('Error al guardar posiciones: ' + (err.message ?? err));
    }
  }

  getDeskStyle(d: Desk) {
    const left = (d.x_percent ?? 50) + '%';
    const top = (d.y_percent ?? 50) + '%';
    return { left, top };
  }

  async ngOnInit(): Promise<void> {
    await this.loadDesks();
    await this.computeReservationLimit();
    // periodically refresh reservation statuses so the UI shows rooms becoming occupied/released
    this.refreshTimer = setInterval(() => this.refreshReservationStatus(), 30_000); // every 30s
  }

  /** Compute the user's reservation limit based on active basic memberships (5 per basic) and update current count */
  async computeReservationLimit() {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const currentUser = userData?.user ?? null;
      if (!currentUser) return;

      // fetch user's memberships
      let memberships: any[] = [];
      try {
        const { data: mdata, error: mErr } = await supabase.from('membresias').select('*').eq('id_usuario_uuid', currentUser.id);
        if (!mErr && Array.isArray(mdata)) memberships = mdata;
      } catch (e) {
        console.warn('computeReservationLimit: memberships lookup failed', e);
      }

      const now = new Date();
      const basicActiveCount = memberships.filter(m => {
        if (!String(m.tipo_membresia || '').toLowerCase().includes('basica')) return false;
        if (!m.fecha_fin) return true;
        try { return new Date(m.fecha_fin) > now; } catch(e) { return true; }
      }).length;

      const allowedPerBasic = 5;
      this.userReservationsLimit = basicActiveCount > 0 ? basicActiveCount * allowedPerBasic : 5;

      // update current reservation count
      try {
        const { data: rdata, error: rErr } = await supabase.from('reservas').select('id_reserva').eq('id_usuario_uuid', currentUser.id);
        if (!rErr && Array.isArray(rdata)) this.userReservationsCount = rdata.length;
      } catch (e) {
        console.warn('computeReservationLimit: could not count user reservations', e);
      }
    } catch (e) {
      console.warn('computeReservationLimit error', e);
    }
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  async loadDesks() {
    try {
      // Read positions directly from `espacios`
      const espResp: any = await supabase.from('espacios').select('id_espacio,nombre,capacidad,x_percent,y_percent,estado').limit(500);
      const eData = espResp.data;
      const eError = espResp.error;

      if (!eError && eData && Array.isArray(eData) && eData.length > 0) {
        const hasCoords = eData.some((r: any) => r.x_percent != null && r.y_percent != null);
        if (hasCoords) {
          this.desks = eData.map((r: any) => ({
            id: r.id_espacio,
            nombre: r.nombre,
            capacidad: r.capacidad ?? 1,
            x_percent: r.x_percent != null ? Number(r.x_percent) : null,
            y_percent: r.y_percent != null ? Number(r.y_percent) : null,
            estado: r.estado ?? null,
            isReserved: false,
          }));
        } else {
          this.desks = eData.map((r: any) => ({ id: r.id_espacio, nombre: r.nombre, capacidad: r.capacidad ?? 1, estado: r.estado ?? null, isReserved: false }));
        }
        // after loading desks, also load current reservations to mark reserved desks
        await this.refreshReservationStatus();
        return;
      }
    } catch (e) {
      console.warn('loadDesks error', e);
    }

    // Fallback: create 24 mock desks with evenly distributed coordinates
    const total = 24;
    const cols = 6;
    const rows = Math.ceil(total / cols);
    this.desks = Array.from({ length: total }, (_, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = ((col + 0.5) / cols) * 100; // percent
      const y = ((row + 0.5) / rows) * 100; // percent
      return { id: i + 1, x_percent: Number(x.toFixed(2)), y_percent: Number(y.toFixed(2)), tipo_espacio: 'escritorio' };
    });
  }

  /** Refresh reservation statuses for loaded desks */
  async refreshReservationStatus() {
    try {
      // fetch reservations (current and future). We filter on client side.
      const resp: any = await supabase.from('reservas').select('id_reserva,id_espacio,fecha_inicio,fecha_fin');
      const reservations = resp.data ?? [];
      const now = new Date();
      // ensure reservedFrom/reservedTo are normalized to Date strings for display
      reservations.forEach((r: any) => {
        r.fecha_inicio = r.fecha_inicio; // keep as-is (ISO string expected)
        r.fecha_fin = r.fecha_fin;
      });
      const selectedStart = this.fechaInicio ? new Date(this.fechaInicio) : null;
      const selectedEnd = this.fechaFin ? new Date(this.fechaFin) : null;

      this.desks = this.desks.map((d: any) => {
        const related = reservations.filter((r: any) => Number(r.id_espacio) === Number(d.id));
        const isCurrentlyReserved = related.some((r: any) => {
          const s = new Date(r.fecha_inicio);
          const e = new Date(r.fecha_fin);
          return s <= now && now < e;
        });
        const overlapsWithSelected = selectedStart && selectedEnd
          ? related.some((r: any) => {
              const s = new Date(r.fecha_inicio);
              const e = new Date(r.fecha_fin);
              return !(e <= selectedStart || s >= selectedEnd);
            })
          : false;

        return {
          ...d,
          isReserved: Boolean(isCurrentlyReserved || overlapsWithSelected),
          reservedFrom: related.length ? related[0].fecha_inicio : null,
          reservedTo: related.length ? related[0].fecha_fin : null,
        };
      });
    } catch (err) {
      console.warn('refreshReservationStatus error', err);
    }
  }

  selectDesk(d: Desk | number) {
    // Accept either Desk object (from template) or id number (fallback)
    const deskObj = typeof d === 'number' ? this.desks.find(ds => ds.id === d) : d as Desk;
    if (!deskObj) return;
    if (deskObj.isReserved) {
      // do not allow selecting a reserved desk
      this.message = 'El espacio seleccionado está ocupado en este horario. Elige otro.';
      return;
    }
    this.selectedDesk = deskObj.id ?? null;
    this.idEscritorio = deskObj.id ?? null;
    // clear any previous message
    this.message = '';
  }

  onDateChange() {
    // recompute previews of reservation overlaps when user changes dates
    this.refreshReservationStatus();
  }

  async crearReserva() {
    this.message = '';
    if (!this.fechaInicio || !this.fechaFin) {
      this.message = 'Selecciona fecha y hora de inicio y fin.';
      return;
    }

    const inicio = new Date(this.fechaInicio);
    const fin = new Date(this.fechaFin);
    if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
      this.message = 'Fechas inválidas.';
      return;
    }

    // Ensure a desk/space was selected (either via selection or manual ID)
    const espacioId = this.idEscritorio ?? this.selectedDesk;
    if (!espacioId) {
      this.message = 'Selecciona un espacio antes de crear la reserva.';
      return;
    }

    // Prevent creating a reservation on a desk that is currently marked reserved
    const deskForId = this.desks.find(d => Number(d.id) === Number(espacioId));
    if (deskForId?.isReserved) {
      this.message = 'No puedes reservar un espacio que ya está ocupado en ese horario.';
      this.loading = false;
      return;
    }

    this.loading = true;
    try {
      // ensure user is present so we can set id_usuario_uuid on the new row
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      const currentUser = userData?.user ?? null;
      if (!currentUser) {
        this.message = 'Debes iniciar sesión para crear una reserva.';
        this.loading = false;
        return;
      }

      // quick count of total user's reservations (simple guard based on total count shown in profile)
      try {
        const { data: userResData, error: userResErr } = await supabase.from('reservas').select('id_reserva').eq('id_usuario_uuid', currentUser.id);
        if (!userResErr && Array.isArray(userResData)) {
          this.userReservationsCount = userResData.length;
        }
      } catch (e) {
        console.warn('crearReserva: could not count user reservations', e);
      }

      if (this.userReservationsCount >= 5) {
        this.message = 'Has alcanzado el número máximo de reservas permitidas para tu cuenta.';
        this.loading = false;
        return;
      }

      // --- Quota check for basic membership (client-side guard) ---
      try {
        console.log('[DEBUG] crearReserva: starting quota check');
        const parseDate = (s: any) => {
          if (!s) return null;
          if (s instanceof Date) return s;
          let d = new Date(s);
          if (!isNaN(d.getTime())) return d;
          try { const normalized = String(s).replace(' ', 'T'); d = new Date(normalized); if (!isNaN(d.getTime())) return d; } catch(e) {}
          const ms = Date.parse(String(s)); if (!isNaN(ms)) return new Date(ms);
          return null;
        };

        // fetch all memberships for this user and compute combined basic quota
        let memberships: any[] = [];
        try {
          const { data: mdata, error: mErr } = await supabase.from('membresias').select('*').eq('id_usuario_uuid', currentUser.id);
          if (!mErr && Array.isArray(mdata)) memberships = mdata;
        } catch (e) {
          console.warn('crearReserva: memberships lookup failed', e);
        }
        console.log('[DEBUG] crearReserva: memberships found count=', memberships.length);

        // consider only basic memberships for quota calculation
        const basicMemberships = memberships.filter(m => String(m.tipo_membresia || '').toLowerCase().includes('basica'));
        if (basicMemberships.length > 0) {
          const allowedPerBasic = 5;
          const allowed = allowedPerBasic * basicMemberships.length; // e.g., 2 basics -> 10 allowed

          // fetch user's reservations by the canonical user id column used on insert
          let userReservations: any[] = [];
          try {
            const { data: rdata, error: rErr } = await supabase.from('reservas').select('id_reserva,fecha_inicio').eq('id_usuario_uuid', currentUser.id);
            if (!rErr && rdata) userReservations = rdata;
          } catch (e) {
            console.warn('crearReserva: reservas lookup failed', e);
          }
          console.log('[DEBUG] crearReserva: userReservations (by id_usuario_uuid) length:', userReservations.length);

          // Count reservations that fall inside ANY of the basic membership periods.
          // Avoid double-counting by using a Set of reservation ids.
          const parseDate = (s: any) => {
            if (!s) return null;
            if (s instanceof Date) return s;
            let d = new Date(s);
            if (!isNaN(d.getTime())) return d;
            try { const normalized = String(s).replace(' ', 'T'); d = new Date(normalized); if (!isNaN(d.getTime())) return d; } catch(e) {}
            const ms = Date.parse(String(s)); if (!isNaN(ms)) return new Date(ms);
            return null;
          };

          const usedIds = new Set<number>();
          for (const m of basicMemberships) {
            const memStart = parseDate(m.fecha_inicio);
            const memEnd = parseDate(m.fecha_fin);
            for (const r of userReservations) {
              if (usedIds.has(Number(r.id_reserva))) continue;
              const rStart = parseDate(r.fecha_inicio);
              if (!rStart) continue;
              if (memStart && rStart < memStart) continue;
              if (memEnd && rStart > memEnd) continue;
              usedIds.add(Number(r.id_reserva));
            }
          }

          const usedReservations = usedIds.size;
          console.log('[DEBUG] crearReserva: combined usedReservations=', usedReservations, 'allowed=', allowed);
          if (usedReservations >= allowed) {
            this.message = `Has alcanzado el límite de reservas de tus membresías básicas (${usedReservations}/${allowed}).`;
            this.loading = false;
            return;
          }
        }
      } catch (e) {
        // if anything fails here, allow proceeding but log
        console.warn('Quota check failed', e);
      }
      // Insert directly into `reservas` table. Adjust column names if your schema differs.
      // Persist dates in local time (store as the same string the user selected)
      // The HTML `datetime-local` input gives a local datetime string like "2025-11-12T02:00" (no timezone).
      // Previously we converted to UTC with toISOString(), which caused the DB to show a different hour.
      // To store the user's local selection as-is, write the raw datetime-local value (this.fechaInicio/this.fechaFin)
      // or format the Date to omit timezone information. We'll send the same local-format string so DB shows it as entered.
      const payload = {
        id_espacio: espacioId,
        // store as local datetime string (no timezone) so it appears in DB as the same hour the user picked
        fecha_inicio: this.fechaInicio,
        fecha_fin: this.fechaFin,
        id_usuario_uuid: currentUser.id,
      } as any;

      const { data, error } = await supabase.from('reservas').insert([payload]).select('id_reserva').limit(1);

      if (error) {
        this.message = error.message ?? 'Error creando la reserva.';
      } else {
  const id = (data as any)?.[0]?.id_reserva ?? ((data as any)?.[0]?.id ?? null);
        this.message = 'Reserva creada correctamente. ID: ' + (id ?? 'desconocido');
        // reset simple
        this.fechaInicio = '';
        this.fechaFin = '';
        this.idEscritorio = null;
        this.selectedDesk = null;
        // refresh reservations so UI updates reserved state
        await this.refreshReservationStatus();
      }
    } catch (err: any) {
      console.error('crearReserva error', err);
      this.message = err?.message ?? String(err);
    } finally {
      this.loading = false;
    }
  }
}
