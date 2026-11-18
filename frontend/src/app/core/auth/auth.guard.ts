import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isLoggedIn() ? true : inject(Router).createUrlTree(['/login']);
};

/** Settings needs the "settings" or "owners" permission (the tabs inside check each one). */
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.can('settings.manage') || auth.can('owners.manage') ? true : inject(Router).createUrlTree(['/dashboard']);
};
