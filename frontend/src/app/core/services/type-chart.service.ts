import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';

export type TypeChart = Record<string, Record<string, number>>;

@Injectable({ providedIn: 'root' })
export class TypeChartService {
  private readonly http = inject(HttpClient);

  private readonly chart$ = this.http
    .get<TypeChart>('/assets/data/type-chart.json')
    .pipe(shareReplay(1));

  load(): Observable<TypeChart> {
    return this.chart$;
  }
}
