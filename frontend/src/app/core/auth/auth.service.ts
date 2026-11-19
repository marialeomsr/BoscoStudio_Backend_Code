import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, of, tap, timeout } from 'rxjs';
import { environment } from '../../environments/environment';
import { LoginRequest, LoginResponse, OwnerRole } from '../models/studio.models';

const STORAGE_KEY = 'bosco.session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly session = signal<LoginResponse | null>(this.restore());

  readonly isLoggedIn = computed(() => {
    const s = this.session();
    return !!s && new Date(s.expiresAtUtc).getTime() > Date.now();
  });
  readonly ownerName = computed(() => this.session()?.fullName ?? '');
  readonly role = computed<OwnerRole | null>(() => this.session()?.role ?? null);
  readonly permissions = computed(() => new Set(this.session()?.permissions ?? []));

  /** Does the signed-in owner hold this permission (e.g. 'orders.delete')? The API checks it again on every call. */
  can(permission: string): boolean {
    return this.permissions().has(permission);
  }
  get token(): string | null {
    return this.isLoggedIn() ? this.session()!.token : null;
  }

  login(credentials: LoginRequest) {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, credentials).pipe(tap((res) => this.setSession(res)));
  }

  /** Replace the stored session, e.g. after the owner renamed their account and got a new token. */
  setSession(res: LoginResponse): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(res));
    this.session.set(res);
  }

  /** The owner chose to sign out: tell the API (so the sign-out is recorded), then end the session either way. */
  logout(): void {
    if (!this.isLoggedIn()) return this.endSession();
    this.http.post(`${environment.apiUrl}/auth/logout`, {}).pipe(
      timeout(3000),
      catchError(() => of(null)),
      finalize(() => this.endSession()),
    ).subscribe();
  }

  /** Forget the session locally without calling the API (expired or rejected token). */
  endSession(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.session.set(null);
    this.router.navigate(['/login']);
  }

  private restore(): LoginResponse | null {
    try {
      const s = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as LoginResponse | null;
      return s?.role && s.permissions ? s : null;   // a session saved before permissions existed: sign in again
    } catch {
      return null;
    }
  }
}
