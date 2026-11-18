import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { LoginRequest } from '../../core/models/studio.models';
import { describeError } from '../../shared/api-error';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <div class="wrap">
      <mat-card>
        <mat-card-header><mat-card-title>Bosco Studio</mat-card-title><mat-card-subtitle>Owner sign in</mat-card-subtitle></mat-card-header>
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="submit()">
            <mat-form-field appearance="outline">
              <mat-label>Username</mat-label>
              <input matInput formControlName="username" autocomplete="username" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Password</mat-label>
              <input matInput type="password" formControlName="password" autocomplete="current-password" />
            </mat-form-field>
            @if (error()) { <p class="error">{{ error() }}</p> }
            <button mat-flat-button type="submit" [disabled]="form.invalid || busy()">Sign in</button>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: `
    .wrap { min-height: 100dvh; display: grid; place-items: center; padding: 16px; }
    mat-card { width: min(100%, 380px); padding: 16px; }
    form { display: flex; flex-direction: column; gap: 4px; margin-top: 16px; }
    .error { color: var(--mat-sys-error); margin: 0 0 8px; }
  `,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly busy = signal(false);
  protected readonly error = signal('');

  protected readonly form = new FormGroup({
    username: new FormControl('', { nonNullable: true, validators: Validators.required }),
    password: new FormControl('', { nonNullable: true, validators: Validators.required }),
  });

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
