import { Pipe, PipeTransform } from '@angular/core';

/** 82600 -> "₹82,600" (Indian digit grouping). Change the currency here once for the whole app. */
@Pipe({ name: 'inr' })
export class InrPipe implements PipeTransform {
  private readonly fmt = new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 2, minimumFractionDigits: 0,
  });

  transform(value: number | null | undefined): string {
    return this.fmt.format(value ?? 0);
  }
}
