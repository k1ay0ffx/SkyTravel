import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { delay, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { User, ChangePasswordRequest } from '../models/user.model';
import { AuthService } from './auth';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  constructor(private http: HttpClient, private auth: AuthService) {}

  getProfile(): Observable<User> {
    if (environment.useMock) {
      return of(this.auth.currentUser!).pipe(delay(300));
    }
    return this.auth.fetchCurrentUser();
  }

  updateProfile(data: Partial<User>): Observable<User> {
    if (environment.useMock) {
      const updated: User = { ...this.auth.currentUser!, ...data };
      return of(updated).pipe(
        delay(500),
        tap(() => this.auth.fetchCurrentUser().subscribe())
      );
    }
    return this.http.patch<User>(`${environment.apiUrl}/auth/profile/`, data).pipe(
      tap(() => this.auth.fetchCurrentUser().subscribe())
    );
  }

  changePassword(data: ChangePasswordRequest): Observable<void> {
    if (environment.useMock) {
      if (data.old_password.length < 3) {
        return throwError(() => ({ error: { old_password: ['Неверный текущий пароль'] } }));
      }
      return of(undefined).pipe(delay(600));
    }
    return this.http.post<void>(`${environment.apiUrl}/auth/change-password/`, data);
  }
}