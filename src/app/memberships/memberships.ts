import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { RouterLink } from '@angular/router';
import { NgFor, CommonModule } from '@angular/common';
import { supabase } from '../services/supabase-client';

@Component({
  selector: 'app-memberships',
  standalone: true,
  templateUrl: './memberships.html',
  styleUrls: ['./memberships.css'],
  imports: [RouterLink, NgFor, CommonModule],
})
export class MembershipsComponent implements OnInit {
  memberships = [
    {
      name: 'Básica',
      price: '$10/mes',
      description: 'Acceso limitado a escritorios.',
      features: [
        'Reservas hasta 5 días al mes   ',
        'Acceso en horario laboral',
        'Acceso a escritorios',
        'Acesso a salas individuales'
        
      ]
    },
    {
      name: 'Premium',
      price: '$25/mes',
      description: 'Acceso ilimitado y prioridad en reservas.',
      features: [
        'Reservas ilimitadas',
        'Acceso en horario laboral',
        'Una sola reserva por vez',
        'Acceso a escritorios',
        'Acesso a salas individuales'
      ]
    },
    {
      name: 'Corporativa',
      price: '$100/mes',
      description: 'Para empresas, incluye reportes y soporte.',
      features: [
        'Reservas para equipos',
        'Reportes de uso mensuales',
        'Soporte dedicado',
        'Gestión de usuarios corporativos'
      ]
    },
  ];
  constructor(private router: Router) {}

  // runtime state
  user: any = null;
  currentMembership: any = null;
  loading = false;
  usedReservationsCount = 0;
  allowPurchase = true; // computed: whether the user is allowed to purchase a new membership

  async ngOnInit(): Promise<void> {
    // try to detect an active membership for the signed-in user
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user ?? null;
      if (!user) return;
      this.user = user;
      this.currentMembership = await this.findMembershipForUser(user.id);

      // compute used reservations count for this user (canonical column id_usuario_uuid)
      try {
        const { data: rdata, error: rErr } = await supabase.from('reservas').select('id_reserva,fecha_inicio').eq('id_usuario_uuid', user.id);
        if (!rErr && Array.isArray(rdata)) {
          this.usedReservationsCount = rdata.length;
        }
      } catch (e) {
        console.warn('memberships: could not load user reservations', e);
      }

      // compute allowPurchase logic: allow if no active membership OR if membership is basic but usedReservations >= allowed (so user can upgrade/pay)
      const isBasic = (this.currentMembership?.tipo_membresia || '').toLowerCase().includes('basica');
      // Use the getter which checks fecha_fin correctly
      const hasActive = this.hasActiveMembership;
      const allowed = 5;
      this.allowPurchase = !hasActive || (isBasic && this.usedReservationsCount >= allowed);
    } catch (e) {
      // ignore — best-effort
      console.warn('memberships: could not load user/membership', e);
    }
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

  get hasActiveMembership() {
    if (!this.currentMembership) return false;
    const fin = this.currentMembership.fecha_fin;
    if (!fin) return true; // if no end date, assume active
    try {
      return new Date(fin) > new Date();
    } catch (e) {
      return true;
    }
  }

  goToPayment(membership: any) {
    // guard: use allowPurchase which encodes whether user may purchase now
    if (!this.allowPurchase) {
      alert('No puedes contratar otra membresía en este momento.');
      return;
    }

    this.router.navigate(['/payment'], {
      queryParams: {
        name: membership.name,
        price: membership.price,
        description: membership.description,
        features: JSON.stringify(membership.features)
      }
    });
  }
}
