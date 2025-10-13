import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QRCodeComponent } from 'angularx-qrcode';
import { RouterLink } from '@angular/router';
import { SupabaseService } from '../services/reservations.service';

@Component({
  selector: 'app-reservations',
  standalone: true,
  imports: [CommonModule, QRCodeComponent],
  templateUrl: './reservations.html',
  styleUrl: './reservations.css'
})

export class Reservations {
  escritorios = Array.from({ length: 20 }, (_, i) => i + 1); // 20 escritorios
  mostrarQR = false;
  qrData = '';

  reservar(item: string) {
    this.qrData = `${item} reservado exitosamente`;
    this.mostrarQR = true;
  }

  reservarSala(nombre: string) {
    this.qrData = `${nombre} reservada exitosamente`;
    this.mostrarQR = true;
  }

  cerrarQR() {
    this.mostrarQR = false;
  }
}