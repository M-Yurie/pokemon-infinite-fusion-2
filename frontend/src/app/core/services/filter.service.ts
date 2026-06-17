import { Injectable, signal } from '@angular/core';
import { Pokemon } from '../../models/pokemon.model';
import { DexFilters, FusionPosition, SortOption } from '../../models/fusion.model';

const DEFAULT_FILTERS: DexFilters = {
  selectedPokemon: [],
  position: 'either',
  types: [],
  mono: false,
  ability: null,
  showLegendaries: true,
  showFavorites: false,
  showOriginal: true,
  showFusion: true,
  sortBy: 'dex',
  favoriteIds: new Set<string>(),
  disabledIds: new Set<number>(),
};

@Injectable({ providedIn: 'root' })
export class FilterService {
  readonly filters = signal<DexFilters>({ ...DEFAULT_FILTERS });

  setPosition(position: FusionPosition): void {
    this.filters.update(f => ({ ...f, position }));
  }

  addPokemon(pokemon: Pokemon): void {
    this.filters.update(f => {
      if (f.selectedPokemon.length >= 2) return f;
      if (f.selectedPokemon.some(p => p.id === pokemon.id)) return f;
      return { ...f, selectedPokemon: [...f.selectedPokemon, pokemon] };
    });
  }

  removePokemon(id: number): void {
    this.filters.update(f => ({
      ...f,
      selectedPokemon: f.selectedPokemon.filter(p => p.id !== id),
    }));
  }

  toggleType(type: string): void {
    this.filters.update(f => {
      const types = f.types.includes(type)
        ? f.types.filter(t => t !== type)
        : [...f.types, type];
      return { ...f, types };
    });
  }

  clearTypes(): void {
    this.filters.update(f => ({ ...f, types: [], mono: false }));
  }

  toggleMono(): void {
    this.filters.update(f => ({ ...f, mono: !f.mono }));
  }

  setAbility(ability: string | null): void {
    this.filters.update(f => ({ ...f, ability }));
  }

  toggleLegendaries(): void {
    this.filters.update(f => ({ ...f, showLegendaries: !f.showLegendaries }));
  }

  toggleFavorites(): void {
    this.filters.update(f => ({ ...f, showFavorites: !f.showFavorites }));
  }

  toggleOriginal(): void {
    this.filters.update(f => ({ ...f, showOriginal: !f.showOriginal }));
  }

  toggleFusion(): void {
    this.filters.update(f => ({ ...f, showFusion: !f.showFusion }));
  }

  setSortBy(sortBy: SortOption): void {
    this.filters.update(f => ({ ...f, sortBy }));
  }

  setFavoriteIds(ids: Set<string>): void {
    this.filters.update(f => ({ ...f, favoriteIds: ids }));
  }

  clearFilters(): void {
    this.filters.set({ ...DEFAULT_FILTERS });
  }
}
