// src/app/register/register.ts
import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgIf } from '@angular/common';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  templateUrl: './register.html',
  styleUrls: ['./register.css'],
  imports: [RouterLink, NgIf],
})
export class RegisterComponent {
  loading = false;
  errorMsg: string | null = null;
  successMsg: string | null = null;

  constructor(private auth: AuthService, private router: Router) {}

  async onSubmit(event: Event) {
    event.preventDefault();
    this.errorMsg = null;
    this.successMsg = null;

    const form = event.target as HTMLFormElement;
    const email = (form.querySelector('#reg__email') as HTMLInputElement).value.trim();
    const password = (form.querySelector('#reg__password') as HTMLInputElement).value;
    const username = (form.querySelector('#reg__username') as HTMLInputElement).value.trim();

    if (!email || !password) {
      this.errorMsg = 'Correo y contraseña son obligatorios';
      return;
    }
    if (password.length < 6) {
      this.errorMsg = 'La contraseña debe tener al menos 6 caracteres';
      return;
    }

    this.loading = true;
    try {
      await this.auth.signUp(email, password, username || undefined);

      // Si tu proyecto usa confirmación por correo:
      this.successMsg = 'Cuenta creada. Revisa tu correo para confirmar.';
      // Si no usas confirmación y quieres entrar directo, podrías hacer login aquí.
      // await this.auth.signIn(email, password);
      // await this.router.navigate(['/reservations']);
    } catch (err: any) {
      const msg = String(err?.message || err);

      if (msg.includes('usuarios_email_key') || msg.includes('duplicate key value')) {
        this.errorMsg = 'Ese correo ya está registrado.';
      } else if (msg.toLowerCase().includes('user already registered')) {
        this.errorMsg = 'Ese correo ya está registrado en Auth.';
      } else {
        this.errorMsg = 'No se pudo registrar: ' + msg;
      }
    } finally {
      this.loading = false;
    }
  }
}
