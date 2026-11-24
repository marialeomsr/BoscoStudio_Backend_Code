import { AutoMaxLength } from '../../shared/validators';
import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';
import { StudioApi } from '../../core/api/studio-api';
import { AuthService } from '../../core/auth/auth.service';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { PERMISSION_GROUPS, RoleInfo, SUPER_ADMIN } from '../../core/models/studio.models';
import { describeError } from '../../shared/api-error';
import { ConfirmDialog } from '../../shared/components/confirm-dialog';
import { AutoError } from '../../shared/validators';

/**
 * The role master: a role is a named default set of permissions that a new login starts with. Shared roles are changed by the SuperAdmin only;
 * a studio Owner adds and changes the roles of their own studio.
 */
@Component({
  selector: 'app-roles-settings',
  imports: [AutoMaxLength, ReactiveFormsModule, AutoError, MatButtonModule, MatCheckboxModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSlideToggleModule],
  template: `
    <div class="head">
      <p class="intro">Shared roles come with the application and only the SuperAdmin can change them. Add your own roles for this studio; they are not visible to any other studio. People sign in again to pick up changes.</p>
      <button mat-flat-button (click)="startAdd()"><mat-icon>add</mat-icon> Add role</button>
    </div>

    @if (editing()) {
      <form class="editor" [formGroup]="form" (ngSubmit)="save()">
        <mat-form-field appearance="outline"><mat-label>Role name</mat-label>
          <input matInput formControlName="roleName" />
          @if (isSystem()) { <mat-hint>System role: the name is fixed</mat-hint> }
          <mat-error auto></mat-error></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Description (optional)</mat-label><input matInput formControlName="description" />
          <mat-error auto></mat-error></mat-form-field>
        @if (auth.isSuperAdmin() && editId() === null) {
          <mat-slide-toggle class="full" [checked]="forStudio()" (change)="forStudio.set($event.checked)">Only for the studio being viewed (off = shared by every studio)</mat-slide-toggle>
        }
        <fieldset class="perms full">
          <legend>Default permissions</legend>
          @if (isSuperAdmin()) {
            <p class="intro">The SuperAdmin always has every permission.</p>
          } @else {
            <p class="intro">Everyone can view orders, the calendar, albums, clients and payments. Tick what this role may change.</p>
          }
          @for (g of permissionGroups; track g.title) {
            <div class="group"><strong>{{ g.title }}</strong>
              @for (p of g.items; track p.key) {
                <mat-checkbox [checked]="isSuperAdmin() || perms().has(p.key)" [disabled]="isSuperAdmin()" (change)="toggle(p.key, $event.checked)">{{ p.label }}</mat-checkbox>
              }
            </div>
          }
        </fieldset>
        <div class="row-actions full">
          <button mat-button type="button" (click)="editing.set(false)">Cancel</button>
          <button mat-flat-button type="submit" [disabled]="form.invalid || busy()">Save role</button>
        </div>
      </form>
    }

    <ul class="list">
      @for (r of roles(); track r.roleId) {
        <li>
          <div class="who">
            <strong>{{ r.roleName }}@if (r.isSystem) { <span class="tag">system</span> }@if (r.studioId === null) { <span class="tag">shared</span> } @else { <span class="tag">this studio</span> }</strong>
            <small>{{ r.description || 'No description' }} · {{ r.permissions.length }} permission(s) · {{ r.userCount }} login(s)</small>
          </div>
          <div class="row-actions">
            @if (canEdit(r)) {
              <button mat-icon-button aria-label="Edit role" title="Edit role" (click)="startEdit(r)"><mat-icon>edit</mat-icon></button>
            }
            @if (canEdit(r) && !r.isSystem) {
              <button mat-icon-button aria-label="Delete role" title="Delete role" (click)="remove(r)"><mat-icon>delete</mat-icon></button>
            }
          </div>
        </li>
      }
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
    .who { flex: 1; min-width: 200px; display: flex; flex-direction: column; } .who small { color: var(--mat-sys-on-surface-variant); }
    .tag { font-size: 11px; font-weight: 400; margin-left: 8px; padding: 1px 8px; border-radius: 999px; background: color-mix(in srgb, #546e7a 16%, transparent); }
    .perms { margin: 4px 0 8px; padding: 8px 12px; border: 1px solid var(--mat-sys-outline-variant); border-radius: 10px; }
    .perms legend { padding: 0 6px; font-weight: 500; }
    .perms .intro { margin: 0 0 6px; }
    .group { display: flex; flex-direction: column; padding: 4px 0; } .group strong { font-size: 13px; }
  `,
})
export class RolesSettings {
  private readonly api = inject(StudioApi);
  private readonly snack = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly auth = inject(AuthService);
  protected readonly forStudio = signal(false);

  /** The SuperAdmin may change any role; an Owner only the roles of their own studio. */
  protected canEdit(r: RoleInfo): boolean {
    return this.auth.isSuperAdmin() || r.studioId !== null;
  }

  protected readonly roles = signal<RoleInfo[]>([]);
  protected readonly editing = signal(false);
  protected readonly editId = signal<number | null>(null);
  protected readonly isSystem = signal(false);
  protected readonly isSuperAdmin = signal(false);
  protected readonly perms = signal<ReadonlySet<string>>(new Set());
  protected readonly permissionGroups = PERMISSION_GROUPS;
  protected readonly busy = signal(false);

  protected readonly form = this.fb.group({
    roleName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(30), Validators.pattern(/^[\p{L}\p{N} _-]+$/u)]],
    description: ['', Validators.maxLength(200)],
  });

  constructor() {
    this.load();
  }

  protected startAdd(): void {
    this.form.reset({ roleName: '', description: '' });
    this.form.controls.roleName.enable();
    this.perms.set(new Set());
    this.editId.set(null);
    this.isSystem.set(false);
    this.isSuperAdmin.set(false);
    this.forStudio.set(!this.auth.isSuperAdmin());
    this.editing.set(true);
  }

  protected startEdit(r: RoleInfo): void {
    this.form.reset({ roleName: r.roleName, description: r.description ?? '' });
    if (r.isSystem) this.form.controls.roleName.disable(); else this.form.controls.roleName.enable();
    this.perms.set(new Set(r.permissions));
    this.editId.set(r.roleId);
    this.isSystem.set(r.isSystem);
    this.isSuperAdmin.set(r.roleName === SUPER_ADMIN);
    this.editing.set(true);
  }

  protected toggle(key: string, on: boolean): void {
    this.perms.update((s) => { const next = new Set(s); if (on) next.add(key); else next.delete(key); return next; });
  }

  protected save(): void {
    const v = this.form.getRawValue();   // includes the name even when it is locked
    const body = { roleName: v.roleName.trim(), description: v.description.trim() || null, permissions: [...this.perms()], forThisStudio: this.auth.isSuperAdmin() ? this.forStudio() : true };
    const id = this.editId();
    this.call(id === null ? this.api.createRole(body) : this.api.updateRole(id, body), 'Role saved', () => this.editing.set(false));
  }

  protected remove(r: RoleInfo): void {
    ConfirmDialog.ask(this.dialog, {
      title: `Delete the ${r.roleName} role?`,
      message: 'A role that is still used by a login cannot be deleted.',
      confirmText: 'Delete',
    }).subscribe((yes) => yes && this.call(this.api.deleteRole(r.roleId), 'Role deleted'));
  }

  private call(request: Observable<unknown>, success: string, after?: () => void): void {
    this.busy.set(true);
    request.subscribe({
      next: () => { this.busy.set(false); after?.(); this.snack.open(success, 'OK', { duration: 4000 }); this.load(); },
      error: (e) => { this.busy.set(false); this.snack.open(describeError(e), 'Dismiss', { duration: 6000 }); this.load(); },
    });
  }

  private load(): void {
    this.api.roles().subscribe((r) => this.roles.set(r));
  }
}
