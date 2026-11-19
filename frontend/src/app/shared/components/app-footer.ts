import { Component } from '@angular/core';

/** Developer / copyright line shown on every page (sign-in page and the signed-in app). Hidden when printing. */
@Component({
  selector: 'app-footer',
  template: `<footer class="no-print">© Copyright SPM Tech. Pvt Ltd. {{ year }}</footer>`,
  styles: `
    footer { padding: 10px 16px; text-align: center; font-size: 12px; color: var(--mat-sys-on-surface-variant); }
  `,
})
export class AppFooter {
  /** The current year, so the line stays correct without anyone editing it. */
  protected readonly year = new Date().getFullYear();
}
