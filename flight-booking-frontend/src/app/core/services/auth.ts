import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { User, AuthTokens, LoginRequest, RegisterRequest } from '../models/user.model';


@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  private readonly TOKEN_KEY = 'st_access';
  private readonly REFRESH_KEY = 'st_refresh';
  private readonly USER_KEY = 'st_user';
  private isLoggedInSubject = new BehaviorSubject<boolean>(!!localStorage.getItem('st_access'));  
  isLoggedIn$ = this.isLoggedInSubject.asObservable();

  constructor(private http: HttpClient) {
    this.restoreSession();
  }

  get isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_KEY);
  }

  private saveTokens(tokens: AuthTokens): void {
    localStorage.setItem(this.TOKEN_KEY, tokens.access);
    localStorage.setItem(this.REFRESH_KEY, tokens.refresh);
  }

  private saveUser(user: User): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  private restoreSession(): void {
    const userStr = localStorage.getItem(this.USER_KEY);
    if (userStr && this.getAccessToken()) {
      try {
        this.currentUserSubject.next(JSON.parse(userStr));
        this.isLoggedInSubject.next(true);
      } catch {}
    }
  }

  login(credentials: LoginRequest): Observable<AuthTokens> {
    // if (environment.useMock) {
    //   if (credentials.email && credentials.password) {
    //     const tokens: AuthTokens = { access: 'mock_access', refresh: 'mock_refresh' };
    //     const user: User = {
    //       id: 1, email: credentials.email,
    //       first_name: 'Александр', last_name: 'Смирнов',
    //       phone: '+7 777 123 45 67', nationality: 'KZ'
    //     };
    //     this.saveTokens(tokens);
    //     this.saveUser(user);
    //     return of(tokens);
    //   }
    //   return throwError(() => ({ error: { detail: 'Неверный email или пароль' } }));
    // }
    return this.http.post<AuthTokens>(`${environment.apiUrl}/auth/login/`, credentials).pipe(
  tap(tokens => {
    this.saveTokens(tokens);
    this.isLoggedInSubject.next(true); // Добавляем эту строку
    this.fetchCurrentUser().subscribe();
  })
);
  }

  register(data: RegisterRequest): Observable<AuthTokens> {
    if (environment.useMock) {
      const tokens: AuthTokens = { access: 'mock_access', refresh: 'mock_refresh' };
      const user: User = {
        id: 1, email: data.email,
        first_name: data.first_name, last_name: data.last_name
      };
      this.saveTokens(tokens);
      this.saveUser(user);
      return of(tokens);
    }
    return this.http.post<AuthTokens>(`${environment.apiUrl}/auth/register/`, data).pipe(
      tap(tokens => {
        this.saveTokens(tokens);
        this.fetchCurrentUser().subscribe();
        this.isLoggedInSubject.next(true);
      })
    );
  }

  logout(): Observable<any> {
  const refresh = this.getRefreshToken();
  localStorage.removeItem(this.TOKEN_KEY);
  localStorage.removeItem(this.REFRESH_KEY);
  localStorage.removeItem(this.USER_KEY);
  this.currentUserSubject.next(null);
  this.isLoggedInSubject.next(false); 
  if (environment.useMock) return of(null);
  return this.http.post(`${environment.apiUrl}/auth/logout/`, { refresh }).pipe(
    catchError(() => of(null))
  );
}

  refreshToken(): Observable<AuthTokens> {
    const refresh = this.getRefreshToken();
    if (!refresh) return throwError(() => new Error('No refresh token'));
    if (environment.useMock) {
      const tokens: AuthTokens = { access: 'mock_access_new', refresh: 'mock_refresh' };
      this.saveTokens(tokens);
      return of(tokens);
    }
    return this.http.post<AuthTokens>(`${environment.apiUrl}/auth/refresh/`, { refresh }).pipe(
      tap(tokens => this.saveTokens(tokens))
    );
  }

  fetchCurrentUser(): Observable<User> {
    if (environment.useMock) {
      const existing = this.currentUserSubject.value;
      return of(existing || { id: 1, email: 'user@example.com', first_name: 'Пользователь', last_name: '' });
    }
    return this.http.get<User>(`${environment.apiUrl}/auth/me/`).pipe(
      tap(user => this.saveUser(user))
    );
  }
}