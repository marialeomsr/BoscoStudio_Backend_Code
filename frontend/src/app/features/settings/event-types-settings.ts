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
import { EventTypeInfo } from '../../core/models/studio.models';
import { describeError } from '../../shared/api-error';
import { ConfirmDialog } from '../../shared/components/confirm-dialog';
import { AutoError, eventTypeName, intRange } from '../../shared/validators';

/** Add / rename / deactivate / delete event types. Packages and orders pick from this list. */
@Component({
  selector: 'app-event-types-settings',
  imports: [ReactiveFormsModule, AutoError, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSlideToggleModule],
  template: `
    <div class="head">
      <p class="intro">Event types appear in the order form. Each package belongs to one event type.</p>
      <button mat-flat-button (click)="startNew()"><mat-icon>add</mat-icon> Event type</button>
    </div>

    @if (editingId() !== null) {
      <form class="editor" [formGroup]="form" (ngSubmit)="save()">
        <mat-form-field appearance="outline"><mat-label>Name</mat-label><input matInput formControlName="eventTypeName" maxlength="30" /><mat-error auto></mat-error></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Sort order</mat-label><input matInput type="number" formControlName="sortOrder" /><mat-error auto></mat-error></mat-form-field>
        <mat-slide-toggle formControlName="isActive">Active</mat-slide-toggle>
        <div class="row-actions">
          <button mat-button type="button" (click)="editingId.set(null)">Cancel</button>
          <button mat-flat-button type="submit" [disabled]="form.invalid || busy()">{{ editingId() === 0 ? 'Add' : 'Save' }}</button>
        </div>
      </form>
    }

    <ul class="list">
      @for (t of types(); track t.eventTypeId) {
        <li [class.inactive]="!t.isActive">
          <div>
            <strong>{{ t.eventTypeName }}</strong>
            @if (!t.isActive) { <span class="tag">inactive</span> }
            <div class="muted">{{ t.packageCount }} package(s) · {{ t.orderCount }} order(s)</div>
          </div>
          <div class="row-actions">
            <button mat-icon-button aria-label="Edit" (click)="edit(t)"><mat-icon>edit</mat-icon></button>
            <button mat-icon-button aria-label="Delete" (click)="remove(t)"><mat-icon>delete</mat-icon></button>
          </div>
        </li>
      } @empty { <li class="muted">No event types yet.</li> }
    </ul>
  `,
  styles: `
    .head { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
    .intro, .muted { color: var(--mat-sys-on-surface-variant); margin: 0; font-size: 13px; }
    .editor { display: flex; flex-wrap: wrap; gap: 4px 12px; align-items: center; margin: 12px 0; padding: 12px; border: 1px solid var(--mat-sys-outline-variant); border-radius: 12px; background: var(--mat-sys-surface-container-low); }
    .list { list-style: none; padding: 0; margin: 12px 0 0; }
    .list li { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 10px 4px; border-bottom: 1px solid var(--mat-sys-outline-variant); }
    .inactive strong { opacity: .6; } .tag { font-size: 11px; background: var(--mat-sys-surface-variant); border-radius: 999px; padding: 1px 8px; margin-left: 6px; }
    .row-actions { display: flex; gap: 4px; margin-left: auto; }
  `,
})
export class EventTypesSettings {
  private readonly api = inject(StudioApi);
  private readonly snack = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  protected readonly types = signal<EventTypeInfo[]>([]);
  protected readonly editingId = signal<number | null>(null);   // null = closed, 0 = adding
  protected readonly busy = signal(false);

  protected readonly form = inject(NonNullableFormBuilder).group({
    eventTypeName: ['', [Validators.required, eventTypeName]],
    sortOrder: [0, intRange(0, 1000)],
    isActive: [true],
  });

  constructor() {
    this.load();
  }

  protected startNew(): void {
    this.form.reset({ eventTypeName: '', sortOrder: (this.types().at(-1)?.sortOrder ?? 0) + 1, isActive: true });
    this.editingId.set(0);
  }

  protected edit(t: EventTypeInfo): void {
    this.form.setValue({ eventTypeName: t.eventTypeName, sortOrder: t.sortOrder, isActive: t.isActive });
    this.editingId.set(t.eventTypeId);
  }

  protected save(): void {
    const id = this.editingId()!;
    const body = this.form.getRawValue();
    this.call(id === 0 ? this.api.createEventType(body) : this.api.updateEventType(id, body), id === 0 ? 'Event type added' : 'Event type saved');
  }

  protected remove(t: EventTypeInfo): void {
    ConfirmDialog.ask(this.dialog, {
      title: `Delete "${t.eventTypeName}"?`,
      message: t.orderCount || t.packageCount ? 'It is in use, so it cannot be deleted. Deactivate it instead (edit → Active off).' : 'This cannot be undone.',
      confirmText: 'Delete',
    }).subscribe((yes) => yes && this.call(this.api.deleteEventType(t.eventTypeId), 'Event type deleted'));
  }

  private call(request: Observable<unknown>, success: string): void {
    this.busy.set(true);
    request.subscribe({
      next: () => { this.busy.set(false); this.editingId.set(null); this.snack.open(success, 'OK', { duration: 2500 }); this.load(); },
      error: (e) => { this.busy.set(false); this.snack.open(describeError(e), 'Dismiss', { duration: 6000 }); },
    });
  }

  private load(): void {
    this.api.eventTypes(true).subscribe((t) => this.types.set(t));
  }
}
