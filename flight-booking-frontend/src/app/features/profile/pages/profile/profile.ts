import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { delay, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { User, ChangePasswordRequest } from 'src/app/core/models/user.model';
import { AuthService } from 'src/app/core/services/auth';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  constructor(private http: HttpClient, private auth: AuthService) {}

  updateProfile(data: Partial<User>): Observable<User> {
    if (environment.useMock) {
      const updated: User = { ...this.auth.currentUser!, ...data };
      return of(updated).pipe(
        delay(500),
        tap(user => (this.auth as any).saveUser(user))
      );
    }
    return this.http.patch<User>(`${environment.apiUrl}/profile/`, data).pipe(
      tap(user => (this.auth as any).saveUser(user))
    );
  }

  changePassword(data: ChangePasswordRequest): Observable<void> {
    if (environment.useMock) {
      if (data.old_password.length < 3) {
        return throwError(() => ({ error: { old_password: ['Неверный текущий пароль'] } }));
      }
      return of(undefined).pipe(delay(600));
    }
    return this.http.post<void>(`${environment.apiUrl}/profile/change-password/`, data);
  }
}