import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgIf } from '@angular/common';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
  imports: [RouterLink, NgIf],
})
export class LoginComponent {
  loading = false;
  errorMsg: string | null = null;

  constructor(private auth: AuthService, private router: Router) {}

  async onSubmit(event: Event) {
    event.preventDefault();
    this.errorMsg = null;

    const form = event.target as HTMLFormElement;
    const email = (form.querySelector('#login__username') as HTMLInputElement).value.trim();
    const password = (form.querySelector('#login__password') as HTMLInputElement).value;

    if (!email || !password) {
      this.errorMsg = 'Correo y contraseña son obligatorios';
      return;
    }

    this.loading = true;
    try {
      await this.auth.signIn(email, password); // 👈 login con Supabase
      await this.router.navigate(['/home']); // 👈 navegar a Home si todo ok
    } catch (err: any) {
      this.errorMsg = err?.message ?? 'No se pudo iniciar sesión';
    } finally {
      this.loading = false;
    }
  }
}
