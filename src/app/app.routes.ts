import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './login/login';
import { RegisterComponent } from './register/register';
import { Home } from './home/home';
import { Reservations } from './reservations/reservations';
import { ResetPasswordComponent } from './reset/reset-password/reset-password';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'home', component: Home },
  { path: 'reservations', component: Reservations },
  { path: 'reset', component: ResetPasswordComponent }, // ← nuevo
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];
