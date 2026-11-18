import { Component } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { EventTypesSettings } from './event-types-settings';
import { PackagesSettings } from './packages-settings';
import { StudioSettingsForm } from './studio-settings';

/** Everything the owner configures: studio details (printed on documents), event types, and packages per event type. */
@Component({
  selector: 'app-settings',
  imports: [MatTabsModule, StudioSettingsForm, EventTypesSettings, PackagesSettings],
  template: `
    <h1>Settings</h1>
    <mat-tab-group animationDuration="0" mat-stretch-tabs="false" mat-align-tabs="start">
      <mat-tab label="Studio details"><div class="pane"><app-studio-settings-form /></div></mat-tab>
      <mat-tab label="Event types"><div class="pane"><app-event-types-settings /></div></mat-tab>
      <mat-tab label="Packages"><div class="pane"><app-packages-settings /></div></mat-tab>
    </mat-tab-group>
  `,
  styles: `
    :host { display: block; max-width: 900px; margin: 0 auto; }
    h1 { font-size: 22px; margin: 0 0 8px; }
    .pane { padding-top: 16px; }
  `,
})
export class Settings {}
