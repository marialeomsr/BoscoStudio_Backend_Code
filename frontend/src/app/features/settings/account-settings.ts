import { AutoMaxLength } from '../../shared/validators';
import { Component, inject, signal } from '@angular/core';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { StudioApi } from '../../core/api/studio-api';
import { AuthService } from '../../core/auth/auth.service';
import { describeError } from '../../shared/api-error';
import { InputFilter } from '../../shared/input-filter';
import { AutoError, email, personName, strongPassword, username } from '../../shared/validators';

const passwordsMatch = (group: AbstractControl): ValidationErrors | null =>
  group.get('newPassword')?.value === group.get('confirmPassword')?.value ? null : { mismatch: true };


/** The signed-in owner's own account: profile (incl. username) and password. */
@Component({
  selector: 'app-account-settings',
  imports: [AutoMaxLength, ReactiveFormsModule, InputFilter, AutoError, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <div class="wrap">
      <form class="card" [formGroup]="profile" (ngSubmit)="saveProfile()">
        <h3>My profile</h3>
        <p class="intro">Your username is what you sign in with. Changing it needs your current password.</p>
        <mat-form-field appearance="outline"><mat-label>Username</mat-label>
          <input matInput formControlName="username" appInputType="username" autocomplete="username" />
<mat-error auto></mat-error></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Full name</mat-label><input matInput formControlName="fullName" /><mat-error auto></mat-error></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Email (optional)</mat-label><input matInput type="email" formControlName="email" /><mat-error auto></mat-error></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Current password</mat-label>
          <input matInput type="password" formControlName="currentPassword" autocomplete="current-password" /><mat-error auto></mat-error></mat-form-field>
        <div class="actions"><button mat-flat-button type="submit" [disabled]="profile.invalid || savingProfile()">Save profile</button></div>
      </form>

      <form class="card" [formGroup]="form" (ngSubmit)="save()">
        <h3>Change password</h3>
        <p class="intro">Use at least 8 characters. You will be signed out afterwards.</p>
        <mat-form-field appearance="outline"><mat-label>Current password</mat-label>
          <input matInput type="password" formControlName="currentPassword" autocomplete="current-password" /><mat-error auto></mat-error></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>New password</mat-label>
          <input matInput type="password" formControlName="newPassword" autocomplete="new-password" />
<mat-error auto></mat-error></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Confirm new password</mat-label>
          <input matInput type="password" formControlName="confirmPassword" autocomplete="new-password" />
          @if (form.hasError('mismatch') && form.controls.confirmPassword.touched) { <mat-error>Passwords do not match</mat-error> }</mat-form-field>
        <div class="actions"><button mat-flat-button type="submit" [disabled]="form.invalid || saving()">Change password</button></div>
      </form>
    </div>
  `,
  styles: `
    .wrap { display: grid; gap: 16px; grid-template-columns: 1fr; }
    @media (min-width: 900px) { .wrap { grid-template-columns: 1fr 1fr; align-items: start; } }
    .card { display: flex; flex-direction: column; padding: 4px 16px 12px; border: 1px solid color-mix(in srgb, var(--mat-sys-primary) 25%, transparent); border-radius: 12px; }
    h3 { margin: 12px 0 4px; font-size: 16px; font-weight: 500; }
    .intro { margin: 0 0 12px; font-size: 13px; color: var(--mat-sys-on-surface-variant); }
    .actions { display: flex; justify-content: flex-end; }
  `,
})
export class AccountSettings {
  protected readonly auth = inject(AuthService);
  private readonly api = inject(StudioApi);
  private readonly snack = inject(MatSnackBar);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly saving = signal(false);
  protected readonly savingProfile = signal(false);

  protected readonly profile = this.fb.group({
    username: ['', [Validators.required, username, Validators.maxLength(50)]],
    fullName: ['', [Validators.required, personName, Validators.maxLength(100)]],
    email: ['', [email, Validators.maxLength(150)]],
    currentPassword: ['', [Validators.required, Validators.maxLength(100)]],
  });

  protected readonly form = this.fb.group(
    {
      currentPassword: ['', [Validators.required, Validators.maxLength(100)]],
      newPassword: ['', [Validators.required, strongPassword]],
      confirmPassword: ['', [Validators.required, Validators.maxLength(100)]],
    },
    { validators: passwordsMatch },
  );

  constructor() {
    this.api.me().subscribe((me) => this.profile.patchValue({ username: me.username, fullName: me.fullName, email: me.email ?? '' }));
  }

  protected saveProfile(): void {
    const v = this.profile.getRawValue();
    this.savingProfile.set(true);
    this.api.updateProfile({ username: v.username.trim(), fullName: v.fullName.trim(), email: v.email.trim() || null, currentPassword: v.currentPassword }).subscribe({
      next: (session) => {
        this.savingProfile.set(false);
        this.auth.setSession(session);   // new token carries the new username
        this.profile.controls.currentPassword.reset('');
        this.snack.open('Profile saved. Use the new username next time you sign in.', 'OK', { duration: 5000 });
      },
      error: (e) => { this.savingProfile.set(false); this.snack.open(describeError(e), 'Dismiss', { duration: 6000 }); },
    });
  }

  protected save(): void {
    const { currentPassword, newPassword } = this.form.getRawValue();
    this.saving.set(true);
    this.api.changePassword({ currentPassword, newPassword }).subscribe({
      next: () => {
        this.snack.open('Password changed. Please sign in again.', 'OK', { duration: 4000 });
        this.auth.logout();
      },
      error: (e) => { this.saving.set(false); this.snack.open(describeError(e), 'Dismiss', { duration: 6000 }); },
    });
  }
}
