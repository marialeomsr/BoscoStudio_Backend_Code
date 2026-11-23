import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isLoggedIn() ? true : inject(Router).createUrlTree(['/login']);
};

/** Settings needs the "settings" or "owners" permission, or the SuperAdmin role (the tabs inside check each one). */
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isSuperAdmin() || auth.can('settings.manage') || auth.can('owners.manage') ? true : inject(Router).createUrlTree(['/dashboard']);
};

/** Pages only the SuperAdmin may open (the login report). The API enforces it too. */
export const superAdminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isSuperAdmin() ? true : inject(Router).createUrlTree(['/dashboard']);
};
