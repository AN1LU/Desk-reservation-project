import { Routes } from '@angular/router';
import { LoginComponent } from './login/login';
import { RegisterComponent } from './register/register';
import { Home } from './home/home';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'home', component: Home }, // 👈 nueva ruta
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' },
];
