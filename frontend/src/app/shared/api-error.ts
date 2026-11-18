import { HttpErrorResponse } from '@angular/common/http';
import { ApiProblem } from '../core/models/studio.models';

/** Turns any HTTP failure into one human-readable line for a snackbar. */
export function describeError(err: unknown): string {
  if (!(err instanceof HttpErrorResponse)) return 'Unexpected error.';
  if (err.status === 0) return 'Cannot reach the server. Is the API running?';
  const problem = err.error as ApiProblem | null;
  if (problem?.errors) return Object.values(problem.errors).flat().join(' ');
  return problem?.detail ?? problem?.title ?? `Request failed (${err.status}).`;
}
