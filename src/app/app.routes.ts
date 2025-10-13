import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './login/login';
import { RegisterComponent } from './register/register';
import { Home } from './home/home';
import { Reservations } from './reservations/reservations';

export const routes: Routes = [
  
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'home', component: Home }, 
  { path: '', redirectTo: 'login', pathMatch: 'full' },
 
  { path: 'reservations', component: Reservations },
];

