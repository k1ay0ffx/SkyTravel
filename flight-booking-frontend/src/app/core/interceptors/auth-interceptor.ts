import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  // Пропускаем auth-эндпоинты без токена
  const isAuthUrl = req.url.includes('/auth/login')
    || req.url.includes('/auth/register')
    || req.url.includes('/auth/token/refresh');

  const token = auth.getAccessToken();

  // Прикрепляем токен если есть и это не auth-запрос
  const authReq = (token && !isAuthUrl)
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // 401 → пробуем обновить токен и повторить запрос
      if (error.status === 401 && !isAuthUrl && auth.getRefreshToken()) {
        return auth.refreshToken().pipe(
          switchMap(tokens => {
            const retryReq = req.clone({
              setHeaders: { Authorization: `Bearer ${tokens.access}` }
            });
            return next(retryReq);
          }),
          catchError(refreshError => {
            // Refresh тоже упал — разлогиниваем
            auth.logout().subscribe();
            return throwError(() => refreshError);
          })
        );
      }
      return throwError(() => error);
    })
  );
};