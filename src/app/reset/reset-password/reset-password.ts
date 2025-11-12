import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { NgIf } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  templateUrl: './reset-password.html',
  styleUrls: ['./reset-password.css'],
  imports: [NgIf],
})
export class ResetPasswordComponent {
  loading = false;
  errorMsg: string | null = null;
  successMsg: string | null = null;

  constructor(private auth: AuthService, private router: Router) {}

  async onSubmit(event: Event) {
    event.preventDefault();
    this.errorMsg = null;
    this.successMsg = null;

    const form = event.target as HTMLFormElement;
    const password = (form.querySelector('#new_password') as HTMLInputElement).value;
    const confirm = (form.querySelector('#confirm_password') as HTMLInputElement).value;

    if (!password || password.length < 6) {
      this.errorMsg = 'La contraseña debe tener al menos 6 caracteres.';
      return;
    }
    if (password !== confirm) {
      this.errorMsg = 'Las contraseñas no coinciden.';
      return;
    }

    this.loading = true;
    try {
      await this.auth.loadSessionFromURL();
      await this.auth.updatePassword(password);
      this.successMsg = 'Contraseña actualizada correctamente.';
      setTimeout(() => this.router.navigate(['/login']), 2000);
    } catch (err: any) {
      this.errorMsg = this.auth.errorToMessage(err);
    } finally {
      this.loading = false;
    }
  }
}
