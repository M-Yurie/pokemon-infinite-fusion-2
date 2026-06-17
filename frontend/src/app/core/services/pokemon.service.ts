import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap, shareReplay } from 'rxjs';
import { Pokemon } from '../../models/pokemon.model';

@Injectable({ providedIn: 'root' })
export class PokemonService {
  private readonly http = inject(HttpClient);
  private cache: Pokemon[] | null = null;

  private readonly data$ = this.http
    .get<Pokemon[]>('/assets/data/pokemon.json')
    .pipe(
      tap(data => { this.cache = data; }),
      shareReplay(1),
    );

  loadAll(): Observable<Pokemon[]> {
    return this.cache ? of(this.cache) : this.data$;
  }

  getById(id: number): Pokemon | undefined {
    return this.cache?.find(p => p.id === id);
  }

  getByIds(ids: number[]): Pokemon[] {
    return ids.map(id => this.getById(id)).filter((p): p is Pokemon => p != null);
  }

  search(query: string): Pokemon[] {
    if (!this.cache) return [];
    const q = query.toLowerCase().trim();
    if (!q) return this.cache;
    return this.cache.filter(p =>
      p.name.toLowerCase().includes(q) || String(p.id).includes(q),
    );
  }
}
