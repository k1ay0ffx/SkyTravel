import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ProfileService } from '../../../../core/services/profile';
import { AuthService } from '../../../../core/services/auth';
import { User } from '../../../../core/models/user.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './profile.html',
  styleUrls: ['./profile.scss']
})
export class ProfileComponent implements OnInit {
  user: User = { id: 0, email: '', first_name: '', last_name: '' };
  tab: 'personal' | 'passport' | 'security' = 'personal';

  savedPersonal = false;
  savedPassport = false;
  savedSecurity = false;

  oldPassword     = '';
  newPassword     = '';
  confirmPassword = '';
  passError       = '';

  get initials(): string {
    return `${this.user.first_name?.[0] ?? ''}${this.user.last_name?.[0] ?? ''}`.toUpperCase();
  }

  constructor(
    private profileService: ProfileService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.profileService.getProfile().subscribe({
      next: user => this.user = { ...user }
    });
  }

  savePersonal(): void {
    this.profileService.updateProfile({
      first_name:    this.user.first_name,
      last_name:     this.user.last_name,
      email:         this.user.email,
      phone:         this.user.phone,
      date_of_birth: this.user.date_of_birth
    }).subscribe({
      next: () => { this.savedPersonal = true; setTimeout(() => this.savedPersonal = false, 3000); }
    });
  }

  savePassport(): void {
    this.profileService.updateProfile({
      passport_number: this.user.passport_number,
      passport_expiry: this.user.passport_expiry,
      nationality:     this.user.nationality
    }).subscribe({
      next: () => { this.savedPassport = true; setTimeout(() => this.savedPassport = false, 3000); }
    });
  }

  changePassword(): void {
    this.passError = '';
    if (this.newPassword.length < 8) { this.passError = 'Минимум 8 символов'; return; }
    if (this.newPassword !== this.confirmPassword) { this.passError = 'Пароли не совпадают'; return; }

    this.profileService.changePassword({
      old_password: this.oldPassword,
      new_password: this.newPassword
    }).subscribe({
      next: () => {
        this.savedSecurity  = true;
        this.oldPassword    = '';
        this.newPassword    = '';
        this.confirmPassword = '';
        setTimeout(() => this.savedSecurity = false, 3000);
      },
      error: (err) => {
        this.passError = err?.error?.old_password?.[0] ?? 'Ошибка смены пароля';
      }
    });
  }
}