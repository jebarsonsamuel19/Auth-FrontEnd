import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Login } from '../login/login';
import { Signup } from '../signup/signup';

@Component({
  selector: 'app-welcome-page',
  standalone: true,
  imports: [CommonModule, Login, Signup],
  templateUrl: './welcome-page.component.html',
  styleUrls: ['./welcome-page.component.css']
})
export class WelcomePageComponent {
  isLogin = true;

  switchMode(loginMode: boolean) {
    this.isLogin = loginMode;
  }
}