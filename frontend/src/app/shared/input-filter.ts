import { Directive, ElementRef, inject, input } from '@angular/core';

/** What a field accepts. Anything else is removed as the owner types or pastes. */
export type InputKind = 'digits' | 'decimal' | 'phone' | 'alpha' | 'alphanumeric' | 'username' | 'code';

/** Characters to REMOVE for each kind (the API and validators.ts still check the final value). */
const FORBIDDEN: Record<InputKind, RegExp> = {
  digits: /[^0-9]/g,
  decimal: /[^0-9.]/g,
  phone: /[^0-9+\-()\s]/g,
  alpha: /[^\p{L} .'-]/gu,
  alphanumeric: /[^\p{L}\p{N}]/gu,
  username: /[^A-Za-z0-9._-]/g,
  code: /[^A-Za-z0-9 \-]/g,   // GSTIN, invoice prefix
};

/**
 * Usage: <input matInput appInputType="digits" ... />
 * Keeps the field to the allowed characters, e.g. "digits" for a number, "alphanumeric" for letters and digits only.
 * Works with reactive forms: the cleaned value is pushed back as a fresh input event.
 */
@Directive({ selector: 'input[appInputType], textarea[appInputType]', host: { '(input)': 'clean()' } })
export class InputFilter {
  readonly appInputType = input.required<InputKind>();
  private readonly el = inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;

  protected clean(): void {
    const before = this.el.value;
    let after = before.replace(FORBIDDEN[this.appInputType()], '');
    if (this.appInputType() === 'decimal') after = after.replace(/^([^.]*\.[^.]*)\./, '$1');   // a single decimal point
    if (this.appInputType() === 'phone') after = after.replace(/(?!^)\+/g, '');                  // + only at the start
    if (after === before) return;

    const caret = (this.el.selectionStart ?? after.length) - (before.length - after.length);
    this.el.value = after;
    this.el.setSelectionRange?.(Math.max(caret, 0), Math.max(caret, 0));
    this.el.dispatchEvent(new Event('input', { bubbles: true }));   // tell the form control about the cleaned value
  }
}
