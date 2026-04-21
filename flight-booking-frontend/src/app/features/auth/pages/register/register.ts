import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './register.html',
  styleUrls: ['./register.scss']
})
export class RegisterComponent {
  firstName = ''; lastName = ''; email = ''; password = ''; confirmPassword = '';
  agreeTerms = false; showPass = false; isLoading = false;
  errorMsg = ''; successMsg = ''; submitted = false;

  get passStrengthPct(): number {
    const p = this.password;
    if (!p.length) return 0;
    let score = 0;
    if (p.length >= 8)                            score += 33;
    if (/[A-Z]/.test(p) && /[0-9]/.test(p))      score += 33;
    if (/[^A-Za-z0-9]/.test(p))                  score += 34;
    return score;
  }

  get passStrengthClass(): string {
    const pct = this.passStrengthPct;
    if (pct <= 33) return 'weak';
    if (pct <= 66) return 'medium';
    return 'strong';
  }

  get passStrengthLabel(): string {
    const pct = this.passStrengthPct;
    if (pct <= 33) return 'Слабый';
    if (pct <= 66) return 'Средний';
    return 'Надёжный';
  }

  constructor(private router: Router, private auth: AuthService) {}

  register(): void {
    this.submitted = true;
    this.errorMsg  = '';

    if (!this.firstName || !this.lastName || !this.email || !this.password) {
      this.errorMsg = 'Заполните все поля'; return;
    }
    if (this.password.length < 8) {
      this.errorMsg = 'Пароль должен быть минимум 8 символов'; return;
    }
    if (this.password !== this.confirmPassword) {
      this.errorMsg = 'Пароли не совпадают'; return;
    }
    if (!this.agreeTerms) {
      this.errorMsg = 'Примите условия использования'; return;
    }

    this.isLoading = true;

    this.auth.register({
        email:            this.email,
        password:         this.password,
        password_confirm: this.confirmPassword,
        first_name:       this.firstName,
        last_name:        this.lastName
    }).subscribe({
      next: () => {
        this.successMsg = 'Аккаунт создан! Перенаправляем...';
        setTimeout(() => this.router.navigate(['/profile']), 1200);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMsg  = err?.error?.email?.[0]
          ?? err?.error?.detail
          ?? 'Ошибка регистрации. Попробуйте снова.';
      }
    });
  }
}