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
      this.errorMsg = 'Correo y contraseña son obligatorios.';
      return;
    }
    if (password.length < 6) {
      this.errorMsg = 'La contraseña debe tener al menos 6 caracteres.';
      return;
    }

    this.loading = true;
    try {
      await this.auth.signUp(email, password, username || undefined);
      this.successMsg = 'Cuenta creada. Revisa tu correo para confirmar tu cuenta.';
    } catch (err: any) {
      this.errorMsg = this.auth.errorToMessage(err);
    } finally {
      this.loading = false;
    }
  }
}
