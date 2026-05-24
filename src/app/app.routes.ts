import { Routes } from '@angular/router';
import { WelcomePageComponent } from './auth/welcome-page/welcome-page.component';
import { DashboardComponent } from './dashboard/dashboard/dashboard.component';
import { Signup } from './auth/signup/signup';
import { Login } from './auth/login/login';

export const routes: Routes = [
  { path: 'welcome', component: WelcomePageComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'signup', component: Signup },
  { path: 'login', component: Login },
  { path: '', redirectTo: '/welcome', pathMatch: 'full' }
];