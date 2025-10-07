import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { RouterLink } from '@angular/router';
import { NgIf, NgFor } from '@angular/common';

@Component({
  selector: 'app-memberships',
  standalone: true,
  templateUrl: './memberships.html',
  styleUrls: ['./memberships.css'],
  imports: [RouterLink, NgIf, NgFor],
})
export class MembershipsComponent {
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

  goToPayment(membership: any) {
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
