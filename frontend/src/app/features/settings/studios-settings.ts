import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';
import { StudioApi } from '../../core/api/studio-api';
import { AuthService } from '../../core/auth/auth.service';
import { Studio } from '../../core/models/studio.models';
import { describeError } from '../../shared/api-error';
import { ConfirmDialog } from '../../shared/components/confirm-dialog';
import { InputFilter } from '../../shared/input-filter';
import { AutoError, email, personName, strongPassword, username } from '../../shared/validators';

/** SuperAdmin: the client studios. Each studio has its own owner / staff logins and sees only its own data. */
@Component({
  selector: 'app-studios-settings',
  imports: [ReactiveFormsModule, InputFilter, AutoError, DatePipe, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSlideToggleModule],
  template: `
    <div class="head">
      <p class="intro">One application, many studios. Every studio gets its own owner login and sees only its own clients, orders and settings. Open a studio to manage its event types, packages, studio details and staff logins.</p>
      <button mat-flat-button (click)="adding.set(!adding())"><mat-icon>add_business</mat-icon> Add studio</button>
    </div>

    @if (adding()) {
      <form class="editor" [formGroup]="form" (ngSubmit)="create()">
        <mat-form-field appearance="outline" class="full"><mat-label>Studio name</mat-label><input matInput formControlName="studioName" />
          <mat-error auto></mat-error></mat-form-field>
        <p class="full intro">The first login of the studio (its Owner). The owner can then be given staff logins.</p>
        <mat-form-field appearance="outline"><mat-label>Owner username</mat-label><input matInput formControlName="ownerUsername" appInputType="username" autocomplete="off" />
          <mat-error auto></mat-error></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Owner full name</mat-label><input matInput formControlName="ownerFullName" />
          <mat-error auto></mat-error></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Owner email (optional)</mat-label><input matInput type="email" formControlName="ownerEmail" />
          <mat-error auto></mat-error></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Owner password</mat-label><input matInput type="password" formControlName="ownerPassword" autocomplete="new-password" />
          <mat-hint>8+ characters with a letter and a number</mat-hint><mat-error auto></mat-error></mat-form-field>
        <div class="row-actions full">
          <button mat-button type="button" (click)="adding.set(false)">Cancel</button>
          <button mat-flat-button type="submit" [disabled]="form.invalid || busy()">Create studio</button>
        </div>
      </form>
    }

    @if (editId() !== null) {
      <form class="editor" [formGroup]="editForm" (ngSubmit)="saveEdit()">
        <mat-form-field appearance="outline"><mat-label>Studio name</mat-label><input matInput formControlName="studioName" />
          <mat-error auto></mat-error></mat-form-field>
        <mat-slide-toggle formControlName="isActive">Active (its logins can sign in)</mat-slide-toggle>
        <div class="row-actions full">
          <button mat-button type="button" (click)="editId.set(null)">Cancel</button>
          <button mat-flat-button type="submit" [disabled]="editForm.invalid || busy()">Save</button>
        </div>
      </form>
    }

    <ul class="list">
      @for (s of studios(); track s.studioId) {
        <li [class.off]="!s.isActive">
          <span class="avatar">{{ s.studioName.charAt(0) }}</span>
          <div class="who">
            <strong>{{ s.studioName }}
              @if (s.studioId === auth.studioId()) { <span class="tag">viewing</span> }
              @if (!s.isActive) { <span class="tag off">inactive</span> }</strong>
            <small>{{ s.userCount }} login(s) · {{ s.orderCount }} order(s) · since {{ s.createdAt | date: 'd MMM yyyy' }}</small>
          </div>
          <div class="row-actions">
            @if (s.studioId !== auth.studioId()) {
              <button mat-stroked-button (click)="open(s)">Open</button>
            }
            <button mat-icon-button aria-label="Edit studio" title="Rename / switch off" (click)="startEdit(s)"><mat-icon>edit</mat-icon></button>
            <button mat-icon-button aria-label="Delete studio" title="Delete studio" (click)="remove(s)"><mat-icon>delete</mat-icon></button>
          </div>
        </li>
      } @empty { <li>No studios yet.</li> }
    </ul>
  `,
  styles: `
    .head { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
    .intro { margin: 0; font-size: 13px; color: var(--mat-sys-on-surface-variant); max-width: 640px; }
    .editor { display: grid; grid-template-columns: 1fr; gap: 0 12px; margin: 12px 0; padding: 12px; border: 1px solid var(--mat-sys-outline-variant); border-radius: 12px; background: var(--mat-sys-surface-container-low); }
    @media (min-width: 700px) { .editor { grid-template-columns: 1fr 1fr; } .editor .full { grid-column: 1 / -1; } }
    .row-actions { display: flex; gap: 4px; justify-content: flex-end; align-items: center; }
    .list { list-style: none; margin: 12px 0 0; padding: 0; }
    .list li { display: flex; align-items: center; gap: 12px; padding: 10px 4px; border-bottom: 1px solid var(--mat-sys-outline-variant); flex-wrap: wrap; }
    .list li.off { opacity: .65; }
    .avatar { width: 38px; height: 38px; flex: none; border-radius: 50%; display: grid; place-items: center; font-weight: 500; color: #fff; background: #00695c; text-transform: uppercase; }
    .who { flex: 1; min-width: 180px; display: flex; flex-direction: column; } .who small { color: var(--mat-sys-on-surface-variant); }
    .tag { font-size: 11px; font-weight: 400; margin-left: 8px; padding: 1px 8px; border-radius: 999px; background: color-mix(in srgb, var(--mat-sys-primary) 14%, transparent); }
    .tag.off { background: #ffebee; color: #b71c1c; }
  `,
})
export class StudiosSettings {
  private readonly api = inject(StudioApi);
  private readonly snack = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly auth = inject(AuthService);

  protected readonly studios = signal<Studio[]>([]);
  protected readonly adding = signal(false);
  protected readonly editId = signal<number | null>(null);
  protected readonly busy = signal(false);

  protected readonly form = this.fb.group({
    studioName: ['', [Validators.required, personName, Validators.maxLength(150)]],
    ownerUsername: ['', [Validators.required, username]],
    ownerFullName: ['', [Validators.required, personName, Validators.maxLength(100)]],
    ownerEmail: ['', [email, Validators.maxLength(150)]],
    ownerPassword: ['', [Validators.required, strongPassword]],
  });
  protected readonly editForm = this.fb.group({
    studioName: ['', [Validators.required, personName, Validators.maxLength(150)]],
    isActive: [true],
  });

  constructor() {
    this.load();
  }

  protected create(): void {
    const v = this.form.getRawValue();
    this.call(
      this.api.createStudio({
        studioName: v.studioName.trim(), ownerUsername: v.ownerUsername.trim(), ownerFullName: v.ownerFullName.trim(),
        ownerEmail: v.ownerEmail.trim() || null, ownerPassword: v.ownerPassword,
      }),
      `${v.studioName} created. ${v.ownerFullName} can sign in as ${v.ownerUsername}.`,
      () => { this.adding.set(false); this.form.reset(); },
    );
  }

  protected startEdit(s: Studio): void {
    this.editForm.reset({ studioName: s.studioName, isActive: s.isActive });
    this.editId.set(s.studioId);
    this.adding.set(false);
  }

  protected saveEdit(): void {
    const v = this.editForm.getRawValue();
    this.call(this.api.updateStudioRecord(this.editId()!, { studioName: v.studioName.trim(), isActive: v.isActive }), 'Studio updated', () => this.editId.set(null));
  }

  /** Work inside this studio (the SuperAdmin sees one studio at a time). */
  protected open(s: Studio): void {
    this.auth.pickStudio(s.studioId);
    location.reload();
  }

  protected remove(s: Studio): void {
    ConfirmDialog.ask(this.dialog, {
      title: `Delete ${s.studioName}?`,
      message: 'Only a studio with no clients or orders can be deleted (otherwise switch it off). Its logins, event types and packages are removed.',
      confirmText: 'Delete',
    }).subscribe((yes) => yes && this.call(this.api.deleteStudio(s.studioId), 'Studio deleted'));
  }

  private call(request: Observable<unknown>, success: string, after?: () => void): void {
    this.busy.set(true);
    request.subscribe({
      next: () => { this.busy.set(false); after?.(); this.snack.open(success, 'OK', { duration: 4000 }); this.load(); },
      error: (e) => { this.busy.set(false); this.snack.open(describeError(e), 'Dismiss', { duration: 6000 }); this.load(); },
    });
  }

  private load(): void {
    this.api.studios().subscribe((s) => this.studios.set(s));
  }
}
