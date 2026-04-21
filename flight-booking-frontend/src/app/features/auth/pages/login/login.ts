import { Component } from '@angular/core';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth';
import { take } from 'rxjs/operators';

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

  private returnUrl = '/';

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private auth: AuthService
  ) {
    // Запоминаем куда вернуться после входа
    this.activatedRoute.queryParams.pipe(take(1)).subscribe(p => {
      this.returnUrl = p['returnUrl'] || '/';
    });
  }

  login() {
    this.submitted = true;
    this.errorMsg  = '';

    if (!this.email || !this.password) {
      this.errorMsg = 'Заполните все поля';
      return;
    }

    this.isLoading = true;

    this.auth.login({ email: this.email, password: this.password }).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigateByUrl(this.returnUrl); // ← редирект обратно
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMsg = err?.error?.detail ?? 'Неверный email или пароль';
      }
    });
  }

  loginWithGoogle() {
    // TODO: OAuth
  }
}