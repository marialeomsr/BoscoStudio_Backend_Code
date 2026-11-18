import { Component, inject } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { RouterOutlet } from '@angular/router';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {
  constructor() {
    // index.html loads the Material Symbols font; make it the default for every <mat-icon>.
    inject(MatIconRegistry).setDefaultFontSetClass('material-symbols-outlined');
  }
}
