import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../auth/auth.service';

interface NavItem { path: string; label: string; icon: string; }

/** Desktop (>=960px): permanent sidebar. Mobile: top bar + fixed bottom navigation. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatSidenavModule, MatToolbarModule, MatIconModule, MatMenuModule, MatButtonModule],
  template: `
    <mat-toolbar class="topbar">
      <span class="brand">Bosco Studio</span>
      <span class="spacer"></span>
      <span class="owner">{{ auth.ownerName() }}</span>
      <button mat-icon-button (click)="auth.logout()" aria-label="Sign out"><mat-icon>logout</mat-icon></button>
    </mat-toolbar>

    <mat-sidenav-container class="container">
      @if (!isMobile()) {
        <mat-sidenav mode="side" opened class="sidebar">
          @for (item of nav; track item.path) {
            <a class="side-link" [routerLink]="item.path" routerLinkActive="active">
              <mat-icon>{{ item.icon }}</mat-icon>{{ item.label }}
            </a>
          }
        </mat-sidenav>
      }
      <mat-sidenav-content class="content" [class.has-bottom-nav]="isMobile()">
        <router-outlet />
      </mat-sidenav-content>
    </mat-sidenav-container>

    @if (isMobile()) {
      <nav class="bottom-nav">
        @for (item of primaryNav; track item.path) {
          <a [routerLink]="item.path" routerLinkActive="active"><mat-icon>{{ item.icon }}</mat-icon><span>{{ item.label }}</span></a>
        }
        <button type="button" class="more" [matMenuTriggerFor]="moreMenu" aria-label="More"><mat-icon>more_horiz</mat-icon><span>More</span></button>
      </nav>
      <mat-menu #moreMenu="matMenu" xPosition="before">
        @for (item of moreNav; track item.path) {
          <a mat-menu-item [routerLink]="item.path"><mat-icon>{{ item.icon }}</mat-icon>{{ item.label }}</a>
        }
      </mat-menu>
    }
  `,
  styles: `
    :host { display: flex; flex-direction: column; height: 100dvh; }
    .topbar { flex: none; }
    .spacer { flex: 1; }
    .brand { font-weight: 500; }
    .owner { font-size: 14px; margin-right: 4px; }
    @media (max-width: 599px) { .owner { display: none; } }
    .container { flex: 1; }
    .sidebar { width: 220px; padding-top: 8px; }
    .side-link { display: flex; align-items: center; gap: 12px; padding: 12px 20px; color: inherit; text-decoration: none; }
    .side-link.active { background: color-mix(in srgb, var(--mat-sys-primary) 12%, transparent); font-weight: 500; }
    .content { padding: 16px; }
    .content.has-bottom-nav { padding-bottom: 80px; }
    .bottom-nav {
      position: fixed; inset: auto 0 0 0; display: flex; background: var(--mat-sys-surface-container);
      border-top: 1px solid var(--mat-sys-outline-variant); padding-bottom: env(safe-area-inset-bottom); z-index: 10;
    }
    .bottom-nav .more { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 8px 0; font: inherit; font-size: 11px; color: inherit; background: none; border: 0; cursor: pointer; }
    .bottom-nav a { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 8px 0; font-size: 11px; color: inherit; text-decoration: none; }
    .bottom-nav a.active { color: var(--mat-sys-primary); font-weight: 500; }
  `,
})
export class Shell {
  protected readonly auth = inject(AuthService);
  protected readonly isMobile = toSignal(
    inject(BreakpointObserver).observe('(max-width: 959px)').pipe(map((s) => s.matches)),
    { initialValue: false },
  );

  protected readonly nav: NavItem[] = [
    { path: '/dashboard', label: 'Home', icon: 'dashboard' },
    { path: '/orders', label: 'Orders', icon: 'receipt_long' },
    { path: '/calendar', label: 'Calendar', icon: 'calendar_month' },
    { path: '/albums', label: 'Albums', icon: 'photo_album' },
    { path: '/payments', label: 'Payments', icon: 'payments' },
    { path: '/invoices', label: 'Invoices', icon: 'description' },
    { path: '/settings', label: 'Settings', icon: 'settings' },
  ];
  /** Phone: first four in the bottom bar, the rest under "More". */
  protected readonly primaryNav = this.nav.slice(0, 4);
  protected readonly moreNav = this.nav.slice(4);
}
