import { Component, DoCheck, inject, input, signal } from '@angular/core';
import { ControlValueAccessor, NgControl } from '@angular/forms';
import { ErrorStateMatcher } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { toIsoDate, parseIsoDate } from '../date-utils';
import { errorText } from '../validators';

/**
 * Date picker for a 'yyyy-MM-dd' string form control (what the API expects).
 * Usage: <app-date-field label="Date" formControlName="eventDate" />
 * The outer control's validators (required, sensibleDate, ...) drive the error text, as with <mat-error auto>.
 */
@Component({
  selector: 'app-date-field',
  imports: [MatFormFieldModule, MatInputModule, MatDatepickerModule],
  template: `
    <mat-form-field appearance="outline" [subscriptSizing]="dynamic() ? 'dynamic' : 'fixed'">
      <mat-label>{{ label() }}</mat-label>
      <input matInput [matDatepicker]="picker" [min]="minDate()" [max]="maxDate()" [value]="value()"
             [disabled]="disabled()" [errorStateMatcher]="matcher" maxlength="10" placeholder="dd/mm/yyyy"
             (dateChange)="pick($event.value)" (blur)="onTouched()" />
      <mat-datepicker-toggle matIconSuffix [for]="picker" />
      <mat-datepicker #picker (closed)="onTouched()" />
      @if (message()) { <mat-error>{{ message() }}</mat-error> }
    </mat-form-field>
  `,
  styles: [':host { display: block; } mat-form-field { width: 100%; }'],
})
export class DateField implements ControlValueAccessor, DoCheck {
  readonly label = input('Date');
  /** 'yyyy-MM-dd' limits for the calendar (the validators on the control still decide validity). */
  readonly min = input<string | null>('2000-01-01');
  readonly max = input<string | null>(null);
  readonly dynamic = input(false);

  protected readonly value = signal<Date | null>(null);
  protected readonly disabled = signal(false);
  protected readonly message = signal('');
  private readonly ngControl = inject(NgControl, { self: true, optional: true });

  protected readonly matcher: ErrorStateMatcher = {
    isErrorState: () => !!this.ngControl?.control && this.ngControl.control.invalid && this.ngControl.control.touched,
  };

  constructor() {
    if (this.ngControl) this.ngControl.valueAccessor = this;
  }

  protected minDate = () => (this.min() ? parseIsoDate(this.min()!) : null);
  protected maxDate = () => (this.max() ? parseIsoDate(this.max()!) : null);

  ngDoCheck(): void {
    const c = this.ngControl?.control;
    this.message.set(c && c.invalid && c.touched ? errorText(c) : '');
  }

  private onChange: (v: string) => void = () => {};
  protected onTouched: () => void = () => {};

  protected pick(d: Date | null): void {
    this.value.set(d);
    this.onChange(d ? toIsoDate(d) : '');
  }

  writeValue(v: string | null): void { this.value.set(v ? parseIsoDate(v) : null); }
  registerOnChange(fn: (v: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(d: boolean): void { this.disabled.set(d); }
}
