import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

/** Adds the JWT to every request and signs the owner out when the API answers 401 on a protected call. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token;
  // The SuperAdmin works in one studio at a time; the API ignores this header for studio logins.
  const studio = auth.isSuperAdmin() ? auth.studioId() : null;
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (studio) headers['X-Studio-Id'] = String(studio);
  const authed = Object.keys(headers).length ? req.clone({ setHeaders: headers }) : req;

  return next(authed).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && !req.url.endsWith('/auth/login')) auth.endSession();
      return throwError(() => err);
    }),
  );
};
