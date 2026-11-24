import { AfterViewInit, Directive, ElementRef, inject } from '@angular/core';
import { AbstractControl, FormControl, NgControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MatFormField } from '@angular/material/form-field';

/**
 * Field rules for every form. They mirror BoscoStudio/Application/Validators/Rules.cs (the API re-checks everything),
 * so the owner sees the problem under the field instead of after pressing Save.
 * Each rule returns { key: 'message' } and treats an empty value as valid: add Validators.required for mandatory fields.
 */

const blank = (v: unknown): boolean => v === null || v === undefined || String(v).trim() === '';
const fail = (key: string, message: string): ValidationErrors => ({ [key]: message });

export const MAX_MONEY = 99_999_999.99;
export const EARLIEST_DATE = '2000-01-01';

// ---------- phone / email / names ----------

/** 7 to 15 digits (E.164 maximum), optional leading +, spaces / dashes / brackets allowed. */
export const phone: ValidatorFn = (c) => {
  const v = String(c.value ?? '').trim();
  if (!v) return null;
  const digits = v.replace(/\D/g, '').length;
  return /^\+?[0-9\s\-()]+$/.test(v) && digits >= 7 && digits <= 15
    ? null
    : fail('phone', 'Enter a valid phone number: 7 to 15 digits (a leading +, spaces, dashes and brackets are allowed).');
};

export const requiredPhone: ValidatorFn[] = [Validators.required, phone, Validators.maxLength(30)];

export const email: ValidatorFn = (c) =>
  blank(c.value) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(c.value).trim())
    ? null
    : fail('email', 'Enter a valid email address, e.g. name@example.com.');

/** A name needs at least 2 characters including a letter (rejects "1234" or "---"). */
export const personName: ValidatorFn = (c) => {
  const v = String(c.value ?? '').trim();
  return !v || (v.length >= 2 && /\p{L}/u.test(v)) ? null : fail('personName', 'Enter a name with at least 2 characters, including letters.');
};

/** A phone number or an email address (e.g. a print vendor contact). */
export const phoneOrEmail: ValidatorFn = (c) =>
  blank(c.value) || phone(c) === null || email(c) === null
    ? null
    : fail('phoneOrEmail', 'Enter a valid phone number (7 to 15 digits) or an email address.');

// ---------- numbers ----------

const decimals = (v: number): number => (String(v).split('.')[1] ?? '').length;

/** 0 .. 99,999,999.99 with at most 2 decimals. */
export const money: ValidatorFn = (c) => {
  if (blank(c.value)) return null;
  const v = Number(c.value);
  if (Number.isNaN(v) || v < 0 || v > MAX_MONEY) return fail('money', 'Enter an amount between 0 and 99,999,999.99.');
  return decimals(v) > 2 ? fail('money', 'Use at most 2 decimal places.') : null;
};

export const positiveMoney: ValidatorFn = (c) => {
  if (blank(c.value)) return null;
  return Number(c.value) <= 0 ? fail('positive', 'Amount must be greater than 0.') : money(c);
};

/** 0 - 100 with at most 2 decimals. */
export const percent: ValidatorFn = (c) => {
  if (blank(c.value)) return null;
  const v = Number(c.value);
  if (Number.isNaN(v) || v < 0 || v > 100) return fail('percent', 'Enter a percentage between 0 and 100.');
  return decimals(v) > 2 ? fail('percent', 'Use at most 2 decimal places.') : null;
};

export const intRange = (min: number, max: number): ValidatorFn => (c) => {
  if (blank(c.value)) return null;
  const v = Number(c.value);
  return Number.isInteger(v) && v >= min && v <= max ? null : fail('intRange', `Enter a whole number from ${min} to ${max}.`);
};

/** Quantity: greater than 0, up to 10,000, at most 2 decimals. */
export const quantity: ValidatorFn = (c) => {
  if (blank(c.value)) return null;
  const v = Number(c.value);
  return v > 0 && v <= 10_000 && decimals(v) <= 2 ? null : fail('quantity', 'Enter a quantity above 0 (up to 10,000, 2 decimals at most).');
};

// ---------- dates (yyyy-MM-dd strings) ----------

const iso = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** 1 Jan 2000 .. 10 years ahead (event and due dates). */
export const sensibleDate: ValidatorFn = (c) => {
  const v = String(c.value ?? '');
  if (!v) return null;
  const max = new Date(); max.setFullYear(max.getFullYear() + 10);
  return v >= EARLIEST_DATE && v <= iso(max) ? null : fail('date', 'Enter a date between 2000 and 10 years from now.');
};

/** Something that already happened (payment, expense, delivery): not in the future. */
export const notFuture: ValidatorFn = (c) => {
  const v = String(c.value ?? '');
  if (!v) return null;
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  return v >= EARLIEST_DATE && v <= iso(tomorrow) ? null : fail('future', 'The date cannot be in the future.');
};

// ---------- text ----------

export const httpUrl: ValidatorFn = (c) => {
  const v = String(c.value ?? '').trim();
  if (!v) return null;
  try {
    const u = new URL(v);
    return u.protocol === 'http:' || u.protocol === 'https:' ? null : fail('url', 'Enter a link starting with http:// or https://.');
  } catch {
    return fail('url', 'Enter a link starting with http:// or https://.');
  }
};

/** GST / VAT number: 5-20 letters, digits, spaces or dashes (a 15-character GSTIN fits). */
export const taxRegistration: ValidatorFn = (c) =>
  blank(c.value) || /^[A-Za-z0-9 \-]{5,20}$/.test(String(c.value).trim()) ? null : fail('taxReg', 'Enter 5-20 letters or digits (a GSTIN has 15 characters).');

export const transactionRef: ValidatorFn = (c) =>
  blank(c.value) || /^[A-Za-z0-9 _\-/.#:]*$/.test(String(c.value)) ? null : fail('ref', 'Use letters, numbers and - _ / . # : only.');

export const username: ValidatorFn = (c) =>
  blank(c.value) || /^[A-Za-z0-9._-]{3,50}$/.test(String(c.value)) ? null : fail('username', 'Username: 3-50 letters, numbers, dot, dash or underscore (no spaces).');

export const strongPassword: ValidatorFn = (c) => {
  const v = String(c.value ?? '');
  if (!v) return null;
  if (v.length < 8) return fail('password', 'Password must be at least 8 characters.');
  if (v.length > 100) return fail('password', 'Password can be at most 100 characters.');
  return /\p{L}/u.test(v) && /\d/.test(v) ? null : fail('password', 'Password must contain at least one letter and one number.');
};

export const eventTypeName: ValidatorFn = (c) =>
  blank(c.value) || /^[\p{L}\p{N} &/\-]{2,30}$/u.test(String(c.value).trim()) ? null : fail('eventType', 'Use 2-30 letters, numbers, spaces, - & / only.');

/** Discount must not exceed the amount it is taken from. */
export const notMoreThan = (otherName: string, label: string): ValidatorFn => (c: AbstractControl) => {
  const other = c.parent?.get(otherName)?.value;
  if (blank(c.value) || blank(other)) return null;
  return Number(c.value) > Number(other) ? fail('notMore', `Cannot be more than the ${label}.`) : null;
};

// ---------- messages ----------

/** First problem of a control as a sentence. Custom rules carry their own message; Angular's built-ins are translated here. */
export function errorText(control: AbstractControl | null | undefined): string {
  const errors = control?.errors;
  if (!errors) return '';
  for (const [key, value] of Object.entries(errors)) {
    if (typeof value === 'string') return value;
    switch (key) {
      case 'required': return 'This field is required.';
      case 'email': return 'Enter a valid email address.';
      case 'min': return `The minimum is ${(value as { min: number }).min}.`;
      case 'max': return `The maximum is ${(value as { max: number }).max}.`;
      case 'minlength': return `Enter at least ${(value as { requiredLength: number }).requiredLength} characters.`;
      case 'maxlength': return `At most ${(value as { requiredLength: number }).requiredLength} characters.`;
      case 'pattern': return 'The format is not valid.';
      case 'mismatch': return 'The values do not match.';
    }
  }
  return 'Please check this field.';
}

/**
 * Put <mat-error auto></mat-error> inside a <mat-form-field>: it shows errorText() of that field's control,
 * and Angular Material only displays it once the field has been touched and is invalid.
 */
@Directive({ selector: 'mat-error[auto]', host: { '[textContent]': 'message()' } })
export class AutoError {
  private readonly field = inject(MatFormField, { optional: true });

  protected message(): string {
    return errorText(this.field?._control?.ngControl?.control);
  }
}

/** Default cap for a free-text field whose control has no Validators.maxLength (search boxes, login fields). */
export const DEFAULT_MAX_LENGTH = 100;

/**
 * Every text input / textarea stops accepting characters at the length its control allows:
 * the control's own Validators.maxLength when it has one, otherwise DEFAULT_MAX_LENGTH.
 * Works on matInput fields bound with formControlName / formControl; an explicit maxlength="" attribute wins.
 */
@Directive({ selector: 'input[matInput]:not([type=number]):not([type=time]):not([type=date]):not([type=checkbox]), textarea[matInput]' })
export class AutoMaxLength implements AfterViewInit {
  private readonly el = inject<ElementRef<HTMLInputElement | HTMLTextAreaElement>>(ElementRef).nativeElement;
  private readonly ngControl = inject(NgControl, { optional: true, self: true });

  ngAfterViewInit(): void {
    if (this.el.maxLength > 0) return;
    const probe = new FormControl('x'.repeat(100_001));
    const error = this.ngControl?.control?.validator?.(probe)?.['maxlength'] as { requiredLength: number } | undefined;
    this.el.maxLength = error?.requiredLength ?? DEFAULT_MAX_LENGTH;
  }
}
