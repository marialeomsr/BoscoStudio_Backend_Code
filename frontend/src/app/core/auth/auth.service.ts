import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { LoginRequest, LoginResponse } from '../models/studio.models';

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
  get token(): string | null {
    return this.isLoggedIn() ? this.session()!.token : null;
  }

  login(credentials: LoginRequest) {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, credentials).pipe(
      tap((res) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(res));
        this.session.set(res);
      }),
    );
  }

  logout(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.session.set(null);
    this.router.navigate(['/login']);
  }

  private restore(): LoginResponse | null {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    } catch {
      return null;
    }
  }
}
