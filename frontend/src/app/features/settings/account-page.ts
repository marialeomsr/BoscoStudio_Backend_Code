import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/auth/auth.service';
import { AccountSettings } from './account-settings';

/** "My account": every role can change their own username, name, email and password (Settings itself is Admin only). */
@Component({
  selector: 'app-account-page',
  imports: [MatIconModule, AccountSettings],
  template: `
    <header class="page-head slate">
      <span class="ico"><mat-icon>account_circle</mat-icon></span>
      <h1>My account <span class="sub">{{ auth.ownerName() }} · {{ auth.role() }}</span></h1>
    </header>
    <section class="panel slate"><div class="pane"><app-account-settings /></div></section>
  `,
  styles: `
    :host { display: block; max-width: 900px; margin: 0 auto; }
    .pane { padding-top: 12px; }
  `,
})
export class AccountPage {
  protected readonly auth = inject(AuthService);
}
