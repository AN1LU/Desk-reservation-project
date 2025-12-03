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

  showReset = false;
  resetInfo: string | null = null;
  resetError: string | null = null;

  showResend = false;
  resendInfo: string | null = null;
  resendError: string | null = null;

  constructor(private auth: AuthService, private router: Router) {}

  async onSubmit(event: Event) {
    event.preventDefault();
    this.errorMsg = null;
    this.resendInfo = null;
    this.resendError = null;
    this.showResend = false;

    const form = event.target as HTMLFormElement;
    const email = (form.querySelector('#login__username') as HTMLInputElement).value.trim();
    const password = (form.querySelector('#login__password') as HTMLInputElement).value;

    if (!email || !password) {
      this.errorMsg = 'Correo y contraseña son obligatorios.';
      return;
    }

    this.loading = true;
    try {
      await this.auth.signIn(email, password);
      await this.router.navigate(['/home']);
    } catch (err: any) {
      const msg = this.auth.errorToMessage(err);
      this.errorMsg = msg;
      if (msg.toLowerCase().includes('no está confirmado')) this.showResend = true;
    } finally {
      this.loading = false;
    }
  }

  toggleReset(e: Event) {
    e.preventDefault();
    this.showReset = !this.showReset;
    this.resetInfo = null;
    this.resetError = null;
  }

  async onResetSubmit(e: Event) {
    e.preventDefault();
    this.resetInfo = null;
    this.resetError = null;

    const email =
      (e.target as HTMLFormElement)
        .querySelector<HTMLInputElement>('#reset__email')
        ?.value.trim() ?? '';

    if (!email) {
      this.resetError = 'Ingresa tu correo.';
      return;
    }

    try {
      await this.auth.sendPasswordReset(email, 'http://localhost:4200/reset');
      this.resetInfo = 'Si el correo existe, se envió el enlace para restablecer.';
    } catch (err: any) {
      this.resetError = this.auth.errorToMessage(err);
    }
  }

  async onResendConfirmation() {
    this.resendInfo = null;
    this.resendError = null;

    const emailInput = document.querySelector<HTMLInputElement>('#login__username');
    const email = emailInput?.value.trim() || '';
    if (!email) {
      this.resendError = 'Ingresa tu correo arriba y vuelve a intentar.';
      return;
    }

    try {
      await this.auth.resendEmailConfirmation(email);
      this.resendInfo = 'Reenviamos el correo de activación si la cuenta existe.';
    } catch (err: any) {
      this.resendError = this.auth.errorToMessage(err);
    }
  }
}
