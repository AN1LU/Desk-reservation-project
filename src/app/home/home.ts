import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { supabase } from '../services/supabase-client';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.html',
  styleUrls: ['./home.css'],
  imports: [CommonModule, RouterLink],
})
export class Home implements OnInit {
  hasMembership = false;
  hasCorporateMembership = false;
  loading = true;
  errorMessage = '';

  constructor(private router: Router) {}

  async ngOnInit() {
    await this.checkMembership();
  }

  async checkMembership() {
    this.loading = true;
    try {
      const { data: userData } = await supabase.auth.getUser();
      const currentUser = userData?.user ?? null;
      
      if (!currentUser) {
        this.hasMembership = false;
        this.loading = false;
        return;
      }

      const { data, error } = await supabase
        .from('membresias')
        .select('*')
        .eq('id_usuario_uuid', currentUser.id);

      if (!error && data && data.length > 0) {
        // Verificar si tiene al menos una membresía activa
        const now = new Date();
        this.hasMembership = data.some((m: any) => {
          if (!m.fecha_fin) return true; // Sin fecha de fin = activa
          try {
            return new Date(m.fecha_fin) > now;
          } catch (e) {
            return true;
          }
        });
        
        // Verificar si tiene membresía corporativa activa
        this.hasCorporateMembership = data.some((m: any) => {
          const isCorporate = String(m.tipo_membresia || '').toLowerCase().includes('corporat');
          if (!isCorporate) return false;
          if (!m.fecha_fin) return true;
          try {
            return new Date(m.fecha_fin) > now;
          } catch (e) {
            return true;
          }
        });
      } else {
        this.hasMembership = false;
        this.hasCorporateMembership = false;
      }
    } catch (e) {
      console.error('Error checking membership:', e);
      this.hasMembership = false;
    } finally {
      this.loading = false;
    }
  }

  goToReservations(event: Event) {
    event.preventDefault();
    if (!this.hasMembership) {
      this.errorMessage = 'Necesitas una membresía activa para poder hacer reservaciones.';
      setTimeout(() => {
        this.errorMessage = '';
      }, 5000);
    } else {
      this.router.navigate(['/reservations']);
    }
  }

  goToGroupManagement() {
    this.router.navigate(['/group-management']);
  }
}
