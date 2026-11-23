import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { StudioApi } from '../../core/api/studio-api';
import { AuthService } from '../../core/auth/auth.service';
import { LoginRequest } from '../../core/models/studio.models';
import { describeError } from '../../shared/api-error';
import { AppFooter } from '../../shared/components/app-footer';

/**
 * Sign-in. Desktop: brand panel on the left, form on the right. Phone: brand band on top, form card below.
 * Same colours as the rest of the app (blue -> purple accent).
 */
@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, AppFooter, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule],
  template: `
    <main class="screen">
      <section class="brand">
        <div class="logo"><mat-icon>photo_camera</mat-icon></div>
        <h1>{{ studioName() }}</h1>
        <p class="tag">{{ tagline() }}</p>
        <ul class="points">
          <li><mat-icon>calendar_month</mat-icon><span>Calendar that warns you about double bookings</span></li>
          <li><mat-icon>account_balance_wallet</mat-icon><span>Payments, balances and expenses per shoot</span></li>
          <li><mat-icon>photo_album</mat-icon><span>Albums tracked from selection to hand-over</span></li>
          <li><mat-icon>description</mat-icon><span>Quotations and invoices ready to print</span></li>
        </ul>
      </section>

      <section class="panel">
        <form class="card" [formGroup]="form" (ngSubmit)="submit()">
          <h2>Welcome back</h2>
          <p class="sub">Sign in to manage your studio.</p>

          <mat-form-field appearance="outline">
            <mat-label>Username</mat-label>
            <mat-icon matPrefix>person</mat-icon>
            <input matInput formControlName="username" autocomplete="username" autofocus />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Password</mat-label>
            <mat-icon matPrefix>lock</mat-icon>
            <input matInput [type]="show() ? 'text' : 'password'" formControlName="password" autocomplete="current-password" />
            <button mat-icon-button matSuffix type="button" (click)="show.set(!show())" [attr.aria-label]="show() ? 'Hide password' : 'Show password'">
              <mat-icon>{{ show() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
          </mat-form-field>

          @if (error()) { <div class="error" role="alert"><mat-icon>error</mat-icon>{{ error() }}</div> }

          <button mat-flat-button class="go" type="submit" [disabled]="form.invalid || busy()">
            {{ busy() ? 'Signing in…' : 'Sign in' }}
          </button>
          <p class="foot">Owners only · each person has their own login</p>
        </form>
      </section>
    </main>
    <app-footer />
  `,
  styles: `
    :host { display: flex; flex-direction: column; min-height: 100dvh; background: #f4f6fb; }
    .screen { flex: 1; display: grid; grid-template-columns: 1fr; background: #f4f6fb; }

    /* ---- brand ---- */
    .brand {
      position: relative; overflow: hidden; color: #fff; padding: 32px 24px 72px;
      background:
        radial-gradient(circle at 85% 12%, rgba(255, 255, 255, .18) 0, transparent 38%),
        radial-gradient(circle at 10% 95%, rgba(255, 255, 255, .12) 0, transparent 40%),
        linear-gradient(135deg, #1565c0 0%, #6a1b9a 100%);
    }
    .logo { width: 56px; height: 56px; border-radius: 16px; display: grid; place-items: center; background: rgba(255, 255, 255, .2); border: 1px solid rgba(255, 255, 255, .35); }
    .logo mat-icon { font-size: 30px; width: 30px; height: 30px; }
    h1 { margin: 16px 0 4px; font-size: 30px; font-weight: 500; letter-spacing: .3px; }
    .tag { margin: 0; opacity: .9; max-width: 34ch; }
    .points { display: none; list-style: none; margin: 32px 0 0; padding: 0; }
    .points li { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; opacity: .95; }
    .points mat-icon { flex: none; padding: 6px; border-radius: 10px; background: rgba(255, 255, 255, .18); box-sizing: content-box; }

    /* ---- form ---- */
    .panel { display: grid; place-items: start center; padding: 0 16px 24px; }
    .card {
      width: min(100%, 420px); margin-top: -44px; position: relative; display: flex; flex-direction: column; padding: 24px 24px 20px; background: #fff;
      border-radius: 20px; border: 1px solid rgba(25, 118, 210, .15); box-shadow: 0 12px 32px rgba(40, 30, 90, .14);
    }
    h2 { margin: 0; font-size: 22px; font-weight: 500; color: #1a237e; }
    .sub { margin: 2px 0 18px; color: var(--mat-sys-on-surface-variant); }
    .error { display: flex; align-items: center; gap: 8px; margin: 0 0 12px; padding: 8px 12px; border-radius: 10px; color: #b71c1c; background: #ffebee; border: 1px solid #ffcdd2; font-size: 14px; }
    .error mat-icon { font-size: 20px; width: 20px; height: 20px; flex: none; }
    .go { height: 46px; font-size: 16px; --mat-button-filled-container-color: #1565c0; --mat-button-filled-label-text-color: #fff; }
    .foot { margin: 14px 0 0; text-align: center; font-size: 12px; color: var(--mat-sys-on-surface-variant); }

    /* ---- desktop: two columns ---- */
    @media (min-width: 900px) {
      .screen { grid-template-columns: 1.1fr 1fr; }
      .brand { padding: 56px 56px 40px; display: flex; flex-direction: column; justify-content: center; }
      h1 { font-size: 40px; }
      .points { display: block; }
      .panel { place-items: center; padding: 24px; }
      .card { margin-top: 0; }
    }
  `,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly api = inject(StudioApi);

  protected readonly busy = signal(false);
  protected readonly show = signal(false);
  protected readonly error = signal('');
  /** Studio name and tagline come from Settings > Studio details; these are shown until they load (or if the call fails). */
  protected readonly studioName = signal('Photo Studio Manager');
  protected readonly tagline = signal('Bookings, payments and deliveries, all in one place.');

  protected readonly form = new FormGroup({
    username: new FormControl('', { nonNullable: true, validators: Validators.required }),
    password: new FormControl('', { nonNullable: true, validators: Validators.required }),
  });

  constructor() {
    this.api.branding().subscribe({
      next: (b) => {
        this.studioName.set(b.studioName);
        this.tagline.set(b.tagline?.trim() || 'Bookings, payments and deliveries, all in one place.');
      },
      error: () => undefined,
    });
  }

  protected submit(): void {
    this.busy.set(true);
    this.error.set('');
    const credentials: LoginRequest = this.form.getRawValue();
    this.auth.login(credentials).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (e) => {
        this.busy.set(false);
        this.error.set(e.status === 401 ? 'Invalid username or password.' : describeError(e));
      },
    });
  }
}
