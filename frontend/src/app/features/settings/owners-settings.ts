import { AutoMaxLength } from '../../shared/validators';
import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';
import { StudioApi } from '../../core/api/studio-api';
import { OwnerInfo, OwnerRole, PERMISSION_GROUPS, RoleInfo, SUPER_ADMIN } from '../../core/models/studio.models';
import { describeError } from '../../shared/api-error';
import { ConfirmDialog } from '../../shared/components/confirm-dialog';
import { InputFilter } from '../../shared/input-filter';
import { AutoError, email, personName, strongPassword, username } from '../../shared/validators';

/** The logins (owner / staff) of the studio in scope, and what each may do. Roles come from the Roles master table. */
@Component({
  selector: 'app-owners-settings',
  imports: [AutoMaxLength, ReactiveFormsModule, InputFilter, AutoError, DatePipe, MatButtonModule, MatCheckboxModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule],
  template: `
    <div class="head">
      <p class="intro">Each person of this studio signs in with their own username and password. The role decides what they can do. Studios only ever see their own logins.</p>
      <button mat-flat-button (click)="adding.set(!adding())"><mat-icon>person_add</mat-icon> Add login</button>
    </div>

    <ul class="roles">
      @for (r of roles(); track r.roleId) { <li><strong>{{ r.roleName }}</strong> {{ r.description }}</li> }
    </ul>

    @if (adding()) {
      <form class="editor" [formGroup]="form" (ngSubmit)="create()">
        <mat-form-field appearance="outline"><mat-label>Username</mat-label><input matInput formControlName="username" appInputType="username" autocomplete="off" />
          <mat-error auto></mat-error></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Full name</mat-label><input matInput formControlName="fullName" />
          <mat-error auto></mat-error></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Email (optional)</mat-label><input matInput type="email" formControlName="email" />
          <mat-error auto></mat-error></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Password</mat-label><input matInput type="password" formControlName="password" autocomplete="new-password" />
          <mat-hint>8+ characters with a letter and a number</mat-hint><mat-error auto></mat-error></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Role</mat-label>
          <mat-select formControlName="role">@for (r of roles(); track r.roleId) { <mat-option [value]="r.roleName">{{ r.roleName }}</mat-option> }</mat-select>
          <mat-hint>{{ roleHelp(form.controls.role.value) }}</mat-hint></mat-form-field>
        <div class="row-actions full">
          <button mat-button type="button" (click)="adding.set(false)">Cancel</button>
          <button mat-flat-button type="submit" [disabled]="form.invalid || busy()">Create login</button>
        </div>
      </form>
    }

    @if (editId() !== null) {
      <form class="editor" [formGroup]="editForm" (ngSubmit)="saveEdit()">
        <p class="full intro">Editing {{ editName() }}. Leave the password blank to keep it unchanged.</p>
        <mat-form-field appearance="outline"><mat-label>Username</mat-label><input matInput formControlName="username" appInputType="username" autocomplete="off" />
          <mat-error auto></mat-error></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Full name</mat-label><input matInput formControlName="fullName" />
          <mat-error auto></mat-error></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Email (optional)</mat-label><input matInput type="email" formControlName="email" />
          <mat-error auto></mat-error></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>New password (optional)</mat-label><input matInput type="password" formControlName="newPassword" autocomplete="new-password" />
          <mat-hint>8+ characters with a letter and a number</mat-hint><mat-error auto></mat-error></mat-form-field>
        <fieldset class="perms full">
          <legend>What {{ editName() }} can do</legend>
          <p class="intro">Everyone can view orders, the calendar, albums, clients and payments. Tick what they may change.</p>
          @for (g of permissionGroups; track g.title) {
            <div class="group"><strong>{{ g.title }}</strong>
              @for (p of g.items; track p.key) {
                <mat-checkbox [checked]="editPerms().has(p.key)" (change)="togglePermission(p.key, $event.checked)">{{ p.label }}</mat-checkbox>
              }
            </div>
          }
        </fieldset>
        <div class="row-actions full">
          <button mat-button type="button" (click)="editId.set(null)">Cancel</button>
          <button mat-flat-button type="submit" [disabled]="editForm.invalid || busy()">Save changes</button>
        </div>
      </form>
    }

    <ul class="list">
      @for (o of owners(); track o.ownerId) {
        <li>
          <span class="avatar">{{ o.fullName.charAt(0) }}</span>
          <div class="who">
            <strong>{{ o.fullName }}@if (o.isCurrent) { <span class="tag">you</span> }<span class="tag role">{{ o.role }}</span></strong>
            <small>{{ o.username }}@if (o.email) { · {{ o.email }} } · since {{ o.createdAt | date: 'd MMM yyyy' }}</small>
          </div>
          @if (!o.isCurrent) {
            <mat-form-field appearance="outline" subscriptSizing="dynamic" class="rolepick">
              <mat-label>Role</mat-label>
              <mat-select [value]="o.role" (selectionChange)="changeRole(o, $event.value)">
                @for (r of roles(); track r.roleId) { <mat-option [value]="r.roleName">{{ r.roleName }}</mat-option> }
              </mat-select>
            </mat-form-field>
            <div class="row-actions">
              <button mat-icon-button aria-label="Edit login details" title="Edit login details / password" (click)="startEdit(o)"><mat-icon>edit</mat-icon></button>
              <button mat-icon-button aria-label="Remove login" title="Remove login" (click)="remove(o)"><mat-icon>delete</mat-icon></button>
            </div>
          }
        </li>
      }
    </ul>
  `,
  styles: `
    .head { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
    .intro { margin: 0; font-size: 13px; color: var(--mat-sys-on-surface-variant); }
    .roles { list-style: none; margin: 12px 0 0; padding: 8px 12px; font-size: 13px; color: var(--mat-sys-on-surface-variant); border-radius: 10px; background: var(--mat-sys-surface-container-low); }
    .roles li { padding: 2px 0; } .roles strong { color: var(--mat-sys-on-surface); display: inline-block; min-width: 64px; }
    .editor { display: grid; grid-template-columns: 1fr; gap: 0 12px; margin: 12px 0; padding: 12px; border: 1px solid var(--mat-sys-outline-variant); border-radius: 12px; background: var(--mat-sys-surface-container-low); }
    @media (min-width: 700px) { .editor { grid-template-columns: 1fr 1fr; } .editor .full { grid-column: 1 / -1; } }
    .row-actions { display: flex; gap: 4px; justify-content: flex-end; align-items: center; }
    .list { list-style: none; margin: 12px 0 0; padding: 0; }
    .list li { display: flex; align-items: center; gap: 12px; padding: 10px 4px; border-bottom: 1px solid var(--mat-sys-outline-variant); flex-wrap: wrap; }
    .avatar { width: 38px; height: 38px; flex: none; border-radius: 50%; display: grid; place-items: center; font-weight: 500; color: #fff; background: #546e7a; text-transform: uppercase; }
    .who { flex: 1; min-width: 180px; display: flex; flex-direction: column; } .who small { color: var(--mat-sys-on-surface-variant); }
    .tag { font-size: 11px; font-weight: 400; margin-left: 8px; padding: 1px 8px; border-radius: 999px; background: color-mix(in srgb, var(--mat-sys-primary) 14%, transparent); }
    .tag.role { background: color-mix(in srgb, #546e7a 16%, transparent); }
    .rolepick { width: 130px; flex: none; }
    .grow { grid-column: 1 / -1; }
    .perms { margin: 4px 0 8px; padding: 8px 12px; border: 1px solid var(--mat-sys-outline-variant); border-radius: 10px; }
    .perms legend { padding: 0 6px; font-weight: 500; }
    .perms .intro { margin: 0 0 6px; }
    .group { display: flex; flex-direction: column; padding: 4px 0; } .group strong { font-size: 13px; }
  `,
})
export class OwnersSettings {
  private readonly api = inject(StudioApi);
  private readonly snack = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly fb = inject(NonNullableFormBuilder);

  /** The role master, without SuperAdmin (that is not a studio role). */
  protected readonly roles = signal<RoleInfo[]>([]);
  protected readonly owners = signal<OwnerInfo[]>([]);
  protected readonly adding = signal(false);
  protected readonly editId = signal<number | null>(null);
  protected readonly editName = signal('');
  protected readonly editPerms = signal<ReadonlySet<string>>(new Set());
  protected readonly permissionGroups = PERMISSION_GROUPS;
  protected readonly busy = signal(false);

  protected readonly form = this.fb.group({
    username: ['', [Validators.required, username, Validators.maxLength(50)]],
    fullName: ['', [Validators.required, personName, Validators.maxLength(100)]],
    email: ['', [email, Validators.maxLength(150)]],
    password: ['', [Validators.required, strongPassword]],
    role: this.fb.control<OwnerRole>('Staff'),
  });
  protected readonly editForm = this.fb.group({
    username: ['', [Validators.required, username, Validators.maxLength(50)]],
    fullName: ['', [Validators.required, personName, Validators.maxLength(100)]],
    email: ['', [email, Validators.maxLength(150)]],
    newPassword: ['', strongPassword],   // blank = keep the current password
  });

  constructor() {
    this.load();
    this.api.roles().subscribe((r) => this.roles.set(r.filter((x) => x.roleName !== SUPER_ADMIN)));
  }

  protected roleHelp(name: OwnerRole): string {
    return this.roles().find((r) => r.roleName === name)?.description ?? '';
  }

  protected create(): void {
    const v = this.form.getRawValue();
    this.call(
      this.api.createOwner({ username: v.username.trim(), fullName: v.fullName.trim(), email: v.email.trim() || null, password: v.password, role: v.role }),
      `${v.fullName} can now sign in as ${v.username} (${v.role})`,
      () => { this.adding.set(false); this.form.reset({ role: 'Staff' }); },
    );
  }

  protected changeRole(o: OwnerInfo, role: OwnerRole): void {
    this.call(this.api.changeOwnerRole(o.ownerId, role), `${o.fullName} is now ${role}, with that role's standard permissions. They sign in again to get the new access.`);
  }

  protected startEdit(o: OwnerInfo): void {
    this.editForm.reset({ username: o.username, fullName: o.fullName, email: o.email ?? '', newPassword: '' });
    this.editName.set(o.fullName);
    this.editPerms.set(new Set(o.permissions));
    this.editId.set(o.ownerId);
    this.adding.set(false);
  }

  protected togglePermission(key: string, on: boolean): void {
    this.editPerms.update((s) => { const next = new Set(s); if (on) next.add(key); else next.delete(key); return next; });
  }

  protected saveEdit(): void {
    const v = this.editForm.getRawValue();
    this.call(
      this.api.updateOwner(this.editId()!, { username: v.username.trim(), fullName: v.fullName.trim(), email: v.email.trim() || null, newPassword: v.newPassword || null,
        permissions: [...this.editPerms()] }),
      v.newPassword ? 'Details and password updated' : 'Details updated',
      () => this.editId.set(null),
    );
  }

  protected remove(o: OwnerInfo): void {
    ConfirmDialog.ask(this.dialog, {
      title: `Remove ${o.fullName}?`,
      message: `${o.username} will no longer be able to sign in, and is signed out straight away. Orders and other data are not affected.`,
      confirmText: 'Remove',
    }).subscribe((yes) => yes && this.call(this.api.deleteOwner(o.ownerId), 'Login removed'));
  }

  private call(request: Observable<unknown>, success: string, after?: () => void): void {
    this.busy.set(true);
    request.subscribe({
      next: () => { this.busy.set(false); after?.(); this.snack.open(success, 'OK', { duration: 4000 }); this.load(); },
      error: (e) => { this.busy.set(false); this.snack.open(describeError(e), 'Dismiss', { duration: 6000 }); this.load(); },
    });
  }

  private load(): void {
    this.api.owners().subscribe((o) => this.owners.set(o));
  }
}
