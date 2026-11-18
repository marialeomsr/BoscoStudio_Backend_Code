import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { Shell } from './core/layout/shell';

/** Every feature is lazy-loaded; only /login is reachable without a token. */
export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/login/login').then((m) => m.Login) },
  {
    path: '',
    component: Shell,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard) },
      { path: 'orders', loadComponent: () => import('./features/orders/order-list/order-list').then((m) => m.OrderList) },
      // 'new' must come before ':id'
      { path: 'orders/new', loadComponent: () => import('./features/orders/order-form/order-form').then((m) => m.OrderForm) },
      { path: 'orders/:id/edit', loadComponent: () => import('./features/orders/order-form/order-form').then((m) => m.OrderForm) },
      { path: 'orders/:id', loadComponent: () => import('./features/orders/order-detail/order-detail').then((m) => m.OrderDetailPage) },
      { path: 'calendar', loadComponent: () => import('./features/calendar/calendar').then((m) => m.Calendar) },
      { path: 'albums', loadComponent: () => import('./features/albums/albums').then((m) => m.Albums) },
      { path: 'payments', loadComponent: () => import('./features/payments/payments').then((m) => m.Payments) },
      { path: 'invoices', loadComponent: () => import('./features/invoices/invoice-list').then((m) => m.InvoiceList) },
      { path: 'settings', loadComponent: () => import('./features/settings/settings').then((m) => m.Settings) },
      { path: 'invoices/:id', loadComponent: () => import('./features/invoices/invoice-view').then((m) => m.InvoiceView) },
    ],
  },
  { path: '**', redirectTo: '' },
];
