import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { EventTypesSettings } from './event-types-settings';
import { OwnersSettings } from './owners-settings';
import { PackagesSettings } from './packages-settings';
import { StudioSettingsForm } from './studio-settings';

/** Everything the owner configures: studio details (printed on documents), event types, and packages per event type. */
@Component({
  selector: 'app-settings',
  imports: [MatIconModule, MatTabsModule, StudioSettingsForm, EventTypesSettings, PackagesSettings, OwnersSettings],
  template: `
    <header class="page-head slate">
      <span class="ico"><mat-icon>settings</mat-icon></span>
      <h1>Settings <span class="sub">studio details, event types, packages, owners</span></h1>
    </header>
    <section class="panel slate">
    <mat-tab-group animationDuration="0" mat-stretch-tabs="false" mat-align-tabs="start">
      @if (auth.can('settings.manage')) {
        <mat-tab label="Studio details"><div class="pane"><app-studio-settings-form /></div></mat-tab>
        <mat-tab label="Event types"><div class="pane"><app-event-types-settings /></div></mat-tab>
        <mat-tab label="Packages"><div class="pane"><app-packages-settings /></div></mat-tab>
      }
      @if (auth.can('owners.manage')) { <mat-tab label="Owners"><div class="pane"><app-owners-settings /></div></mat-tab> }
    </mat-tab-group>
    </section>
  `,
  styles: `
    :host { display: block; max-width: 900px; margin: 0 auto; }
    .pane { padding-top: 16px; }
  `,
})
export class Settings {
  protected readonly auth = inject(AuthService);
}
