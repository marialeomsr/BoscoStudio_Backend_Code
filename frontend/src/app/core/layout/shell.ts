import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { StudioApi } from '../api/studio-api';
import { Studio } from '../models/studio.models';
import { AppFooter } from '../../shared/components/app-footer';
import { AuthService } from '../auth/auth.service';

/** A menu entry. An entry with `children` is a module with sub-modules (e.g. Reports); add future reports to its list. */
interface NavItem { key: string; label: string; icon: string; path?: string; children?: NavItem[]; }

/** Desktop (>=960px): permanent sidebar. Mobile: top bar + fixed bottom navigation. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AppFooter, MatSidenavModule, MatToolbarModule, MatIconModule, MatMenuModule, MatSelectModule, MatButtonModule],
  template: `
    <mat-toolbar class="topbar">
      @if (!isMobile()) {
        <button mat-icon-button class="burger" (click)="toggleCollapsed()" [attr.aria-label]="collapsed() ? 'Expand menu' : 'Collapse menu'" [title]="collapsed() ? 'Expand menu' : 'Collapse menu'"><mat-icon>menu</mat-icon></button>
      }
      <span class="brand">{{ auth.isSuperAdmin() ? 'Photo Studio Manager' : auth.studioName() }}</span>
      @if (auth.isSuperAdmin() && studios().length) {
        <mat-select class="studio-pick" aria-label="Studio" [value]="auth.studioId()" (selectionChange)="switchStudio($event.value)" panelWidth="">
          @for (s of studios(); track s.studioId) { <mat-option [value]="s.studioId">{{ s.studioName }}{{ s.isActive ? '' : ' (inactive)' }}</mat-option> }
        </mat-select>
      }
      <span class="spacer"></span>
      <a class="owner" routerLink="/account" title="My account">{{ auth.ownerName() }} <small>{{ auth.role() }}</small></a>
      <a mat-icon-button routerLink="/account" aria-label="My account"><mat-icon>account_circle</mat-icon></a>
      <button mat-icon-button (click)="auth.logout()" aria-label="Sign out"><mat-icon>logout</mat-icon></button>
    </mat-toolbar>

    <mat-sidenav-container class="container" [class.has-side]="!isMobile()" [class.rail]="collapsed()">
      @if (!isMobile()) {
        <!-- Collapsed: icons only (hover shows the name). The Reports group then shows its sub-modules as plain icons. -->
        <mat-sidenav mode="side" opened class="sidebar" [class.collapsed]="collapsed()">
          @for (item of sideNav(); track item.key) {
            @if (item.children && !collapsed()) {
              <button type="button" class="side-link group" (click)="toggleGroup(item.key)" [attr.aria-expanded]="isOpen(item.key)">
                <mat-icon>{{ item.icon }}</mat-icon><span class="lbl">{{ item.label }}</span>
                <mat-icon class="chev">{{ isOpen(item.key) ? 'expand_less' : 'expand_more' }}</mat-icon>
              </button>
              @if (isOpen(item.key)) {
                @for (c of item.children; track c.key) {
                  <a class="side-link child" [routerLink]="c.path" routerLinkActive="active"><mat-icon>{{ c.icon }}</mat-icon><span class="lbl">{{ c.label }}</span></a>
                }
              }
            } @else if (item.children) {
              @for (c of item.children; track c.key) {
                <a class="side-link" [routerLink]="c.path" routerLinkActive="active" [title]="c.label"><mat-icon>{{ c.icon }}</mat-icon></a>
              }
            } @else {
              <a class="side-link" [routerLink]="item.path" routerLinkActive="active" [title]="item.label"><mat-icon>{{ item.icon }}</mat-icon><span class="lbl">{{ item.label }}</span></a>
            }
          }
        </mat-sidenav>
      }
      <mat-sidenav-content class="content" [class.has-bottom-nav]="isMobile()">
        @if (ready()) { <router-outlet /> }
        <!-- Phone: at the end of the page, above the bottom navigation. -->
        @if (isMobile()) { <app-footer /> }
      </mat-sidenav-content>
    </mat-sidenav-container>
    <!-- Desktop: always visible at the bottom of the screen. -->
    @if (!isMobile()) { <app-footer class="desktop-footer" /> }

    @if (isMobile()) {
      <nav class="bottom-nav">
        @for (item of primaryNav(); track item.key) {
          <a [routerLink]="item.path" routerLinkActive="active"><mat-icon>{{ item.icon }}</mat-icon><span>{{ item.label }}</span></a>
        }
        <button type="button" class="more" [matMenuTriggerFor]="moreMenu" aria-label="More"><mat-icon>more_horiz</mat-icon><span>More</span></button>
      </nav>
      <mat-menu #moreMenu="matMenu" xPosition="before">
        @for (item of moreNav(); track item.key) {
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
    .studio-pick { width: 200px; margin-left: 16px; font-size: 14px; }
    @media (max-width: 599px) { .studio-pick { width: 120px; margin-left: 8px; } }
    .owner { font-size: 14px; margin-right: 4px; color: inherit; text-decoration: none; }
    .owner small { opacity: .7; margin-left: 4px; }
    @media (max-width: 599px) { .owner { display: none; } }
    .container { flex: 1; min-height: 0; }
    .desktop-footer { flex: none; border-top: 1px solid var(--mat-sys-outline-variant); background: var(--mat-sys-surface-container-low); }
    .burger { margin-right: 8px; }
    .sidebar { width: 220px; padding-top: 8px; overflow-x: hidden; }
    .sidebar.collapsed { width: 64px; }
    /* The content always starts right after the menu, whether it is open (220px) or the icon rail (64px). */
    .container.has-side .content { margin-left: 220px !important; }
    .container.has-side.rail .content { margin-left: 64px !important; }
    /* Print / PDF: the page uses the full width, no space left for the menu. */
    @media print {
      :host { display: block; height: auto; }
      .container.has-side .content, .container.has-side.rail .content { margin-left: 0 !important; padding: 0 !important; }
    }
    .sidebar.collapsed .side-link { padding: 12px 0; justify-content: center; }
    .sidebar.collapsed .lbl { display: none; }
    .side-link { display: flex; align-items: center; gap: 12px; padding: 12px 20px; color: inherit; text-decoration: none; width: 100%; box-sizing: border-box; background: none; border: 0; font: inherit; cursor: pointer; text-align: left; }
    .side-link.active { background: color-mix(in srgb, var(--mat-sys-primary) 12%, transparent); font-weight: 500; }
    .side-link .chev { margin-left: auto; }
    .side-link.child { padding-left: 44px; font-size: 14px; }
    .content { padding: 16px; }
    .content.has-bottom-nav { padding-bottom: 16px; }
    .bottom-nav {
      flex: none; display: flex; background: var(--mat-sys-surface-container);   /* part of the page column, so it never covers content */
      border-top: 1px solid var(--mat-sys-outline-variant); padding-bottom: env(safe-area-inset-bottom);
    }
    .bottom-nav .more { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 8px 0; font: inherit; font-size: 11px; color: inherit; background: none; border: 0; cursor: pointer; }
    .bottom-nav a { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 8px 0; font-size: 11px; color: inherit; text-decoration: none; }
    .bottom-nav a.active { color: var(--mat-sys-primary); font-weight: 500; }
  `,
})
export class Shell {
  protected readonly auth = inject(AuthService);
  private readonly api = inject(StudioApi);
  protected readonly isMobile = toSignal(
    inject(BreakpointObserver).observe('(max-width: 959px)').pipe(map((s) => s.matches)),
    { initialValue: false },
  );

  /** SuperAdmin only: every studio, to pick the one to work in. */
  protected readonly studios = signal<Studio[]>([]);
  /** A studio login can load pages at once; the SuperAdmin first needs a studio chosen (its id goes out as X-Studio-Id). */
  protected readonly ready = signal(!this.auth.isSuperAdmin());

  /** Every module, in menu order. Reports is a group: add new reports to its `children`. */
  private readonly nav: NavItem[] = [
    { key: 'home', path: '/dashboard', label: 'Home', icon: 'dashboard' },
    { key: 'orders', path: '/orders', label: 'Orders', icon: 'receipt_long' },
    { key: 'calendar', path: '/calendar', label: 'Calendar', icon: 'calendar_month' },
    { key: 'albums', path: '/albums', label: 'Albums', icon: 'photo_album' },
    { key: 'clients', path: '/clients', label: 'Clients', icon: 'groups' },
    { key: 'payments', path: '/payments', label: 'Payments', icon: 'payments' },
    { key: 'invoices', path: '/invoices', label: 'Invoices', icon: 'description' },
    {
      key: 'reports', label: 'Reports', icon: 'assessment', children: [
        { key: 'report-business', path: '/reports', label: 'Business report', icon: 'assessment' },
        { key: 'report-logins', path: '/login-report', label: 'Login report', icon: 'history' },
      ],
    },
    { key: 'settings', path: '/settings', label: 'Settings', icon: 'settings' },
  ];

  // ----- what this login may see -----
  private canSettings(): boolean {
    return this.auth.isSuperAdmin() || this.auth.can('settings.manage') || this.auth.can('owners.manage');
  }
  private allowed(n: NavItem): boolean {
    if (n.key === 'settings') return this.canSettings();
    if (n.key === 'report-logins') return this.auth.isSuperAdmin();   // the login report is for the SuperAdmin only
    return true;
  }
  /** Allowed items, with sub-modules filtered too; a group with nothing left disappears. */
  private readonly permitted = computed<NavItem[]>(() =>
    this.nav
      .map((n) => (n.children ? { ...n, children: n.children.filter((c) => this.allowed(c)) } : n))
      .filter((n) => this.allowed(n) && (!n.children || n.children.length > 0)));

  protected readonly sideNav = this.permitted;

  // ----- collapse the sidebar to an icon rail with the hamburger button (remembered in this browser) -----
  protected readonly collapsed = signal(localStorage.getItem('bosco.menu.collapsed') === '1');
  protected toggleCollapsed(): void {
    this.collapsed.update((v) => !v);
    localStorage.setItem('bosco.menu.collapsed', this.collapsed() ? '1' : '0');
  }

  // ----- sub-module groups (sidebar) -----
  private readonly openGroups = signal<ReadonlySet<string>>(new Set(['reports']));
  protected isOpen = (key: string) => this.openGroups().has(key);
  protected toggleGroup(key: string): void {
    this.openGroups.update((s) => { const next = new Set(s); if (!next.delete(key)) next.add(key); return next; });
  }

  // ----- phone: first four plain modules in the bottom bar, everything else (sub-modules flattened) under "More" -----
  protected readonly primaryNav = computed(() => this.sideNav().filter((n) => !n.children).slice(0, 4));
  protected readonly moreNav = computed(() => {
    const primary = new Set(this.primaryNav().map((n) => n.key));
    return this.sideNav().filter((n) => !primary.has(n.key)).flatMap((n) => n.children ?? [n]);
  });

  constructor() {
    if (!this.auth.isSuperAdmin()) return;
    this.api.studios().pipe(catchError(() => of([] as Studio[]))).subscribe((list) => {
      this.studios.set(list);
      const current = this.auth.studioId();
      if (!list.some((s) => s.studioId === current) && list.length) this.auth.pickStudio((list.find((s) => s.isActive) ?? list[0]).studioId);
      this.ready.set(true);
    });
  }

  protected switchStudio(id: number): void {
    this.auth.pickStudio(id);
    location.reload();   // every screen starts fresh in the chosen studio
  }
}
