import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class LoginComponent {
  email     = '';
  password  = '';
  showPass  = false;
  isLoading = false;
  errorMsg  = '';
  submitted = false;

  constructor(private router: Router) {}

  login() {
    this.submitted = true;
    this.errorMsg  = '';

    if (!this.email || !this.password) {
      this.errorMsg = 'Заполните все поля';
      return;
    }

    this.isLoading = true;

    // TODO: заменить на AuthService.login()
    setTimeout(() => {
      this.isLoading = false;
      if (this.email === 'test@test.com' && this.password === '123456') {
        this.router.navigate(['/']);
      } else {
        this.errorMsg = 'Неверный email или пароль';
      }
    }, 1000);
  }

  loginWithGoogle() {
    // TODO: OAuth
    console.log('Google login');
  }
}