
import { Routes } from '@angular/router';
import { LoginComponent } from './login/login';
import { RegisterComponent } from './register/register';
import { Home } from './home/home';
import { MembershipsComponent } from './memberships/memberships';
import { MyprofileComponent } from './myprofile/myprofile';
import { PaymentComponent } from './payment/payment';
import { PaymentMethodsComponent } from './payment-methods/payment-methods';
import { ReservationsComponent } from './reservations/reservations';
import { ResetPasswordComponent } from './reset/reset-password/reset-password';
import { GroupManagementComponent } from './group-management/group-management';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'reset', component: ResetPasswordComponent },
  { path: 'home', component: Home },
  { path: 'memberships', component: MembershipsComponent },
  { path: 'payment', component: PaymentComponent },
  { path: 'payment-methods', component: PaymentMethodsComponent },
  { path: 'reservations', component: ReservationsComponent },
  { path: 'profile', component: MyprofileComponent },
  { path: 'myprofile', component: MyprofileComponent },
  { path: 'group-management', component: GroupManagementComponent },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' },
];
