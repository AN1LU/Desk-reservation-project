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

  mostrarCalendario = false;
  mesActual = new Date();
  diasDelMes: Date[] = [];
  diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  ngOnInit() {
    this.generarCalendario(this.mesActual);
  }

  toggleCalendario() {
    this.mostrarCalendario = !this.mostrarCalendario;
  }
  generarCalendario(fecha: Date) {
    const inicio = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
    const fin = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0);
    const dias = [];

    for (let d = inicio.getDate(); d <= fin.getDate(); d++) {
      dias.push(new Date(fecha.getFullYear(), fecha.getMonth(), d));
    }

    this.diasDelMes = dias;
  }

  mesAnterior() {
    this.mesActual = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth() - 1, 1);
    this.generarCalendario(this.mesActual);
  }

  mesSiguiente() {
    this.mesActual = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth() + 1, 1);
    this.generarCalendario(this.mesActual);
  }

  esHoy(dia: Date): boolean {
    const hoy = new Date();
    return (
      dia.getDate() === hoy.getDate() &&
      dia.getMonth() === hoy.getMonth() &&
      dia.getFullYear() === hoy.getFullYear()
    );
  }

  seleccionarFecha(dia: Date) {
    alert(`Has seleccionado el día ${dia.toLocaleDateString()}`);
  }
  
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