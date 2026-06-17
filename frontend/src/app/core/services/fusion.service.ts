import { Injectable } from '@angular/core';
import { Pokemon } from '../../models/pokemon.model';
import { DisplayCard, DexFilters, SortOption } from '../../models/fusion.model';

export type PoolItem =
  | { kind: 'base'; p: Pokemon }
  | { kind: 'fusion'; h: Pokemon; b: Pokemon };

@Injectable({ providedIn: 'root' })
export class FusionService {

  makeDisplayCard(item: PoolItem): DisplayCard {
    if (item.kind === 'base') {
      return {
        id: String(item.p.id),
        name: item.p.name,
        isFusion: false,
        types: item.p.types,
        head: item.p,
        body: null,
        isLegendary: item.p.isLegendary,
      };
    }
    const { h, b } = item;
    return {
      id: `${h.id}.${b.id}`,
      name: `${h.name}/${b.name}`,
      isFusion: true,
      types: this.fusionTypes(h, b),
      head: h,
      body: b,
      isLegendary: h.isLegendary || b.isLegendary,
    };
  }

  buildPool(allPokemon: Pokemon[], filters: DexFilters): PoolItem[] {
    const {
      selectedPokemon, position, types, mono, ability,
      showLegendaries, showFavorites, showOriginal, showFusion,
      favoriteIds, disabledIds,
    } = filters;

    const enabled = allPokemon.filter(p => !disabledIds.has(p.id));
    const items: PoolItem[] = [];

    // ─── 1. Base Pokémon ─────────────────────────────────────────────────
    if (showOriginal) {
      for (const p of enabled) {
        // selectedPokemon filter: if any selected, only show those bases
        if (selectedPokemon.length > 0 && !selectedPokemon.some(s => s.id === p.id)) continue;
        if (!this.passesBaseFilters(p, { showLegendaries, types, mono, ability, showFavorites, favoriteIds })) continue;
        items.push({ kind: 'base', p });
      }
    }

    // ─── 2. Fusion Pokémon ───────────────────────────────────────────────
    if (showFusion) {
      const fusionPairs = this.buildFusionPairs(enabled, selectedPokemon, position);
      for (const { h, b } of fusionPairs) {
        if (!this.passesFusionFilters(h, b, { showLegendaries, types, mono, ability, showFavorites, favoriteIds })) continue;
        items.push({ kind: 'fusion', h, b });
      }
    }

    // ─── Sort ────────────────────────────────────────────────────────────
    // Age sort: pool stays in dex order; per-page async sort is done in dex.ts
    if (filters.sortBy !== 'dex' && filters.sortBy !== 'age') {
      items.sort((x, y) => this.compareItems(x, y, filters.sortBy));
    }

    return items;
  }

  getPage(pool: PoolItem[], offset: number, limit = 36): DisplayCard[] {
    return pool.slice(offset, offset + limit).map(item => this.makeDisplayCard(item));
  }

  // ─── Private helpers ────────────────────────────────────────────────────
  private buildFusionPairs(
    enabled: Pokemon[],
    selectedPokemon: Pokemon[],
    position: DexFilters['position'],
  ): { h: Pokemon; b: Pokemon }[] {
    if (selectedPokemon.length === 2) {
      const [a, b] = selectedPokemon;
      if (position === 'either') return [{ h: a, b }, { h: b, b: a }];
      if (position === 'head')   return [{ h: a, b }];
      return [{ h: b, b: a }];
    }

    if (selectedPokemon.length === 1) {
      const sel = selectedPokemon[0];
      const others = enabled.filter(p => p.id !== sel.id);
      if (position === 'either') {
        return [
          ...others.map(p => ({ h: sel, b: p })),
          ...others.map(p => ({ h: p,   b: sel })),
        ];
      }
      if (position === 'head') return others.map(p => ({ h: sel, b: p }));
      return others.map(p => ({ h: p, b: sel }));
    }

    // No selection: full grid including self-fusions
    const pairs: { h: Pokemon; b: Pokemon }[] = [];
    for (const h of enabled) {
      for (const b of enabled) {
        pairs.push({ h, b });
      }
    }
    return pairs;
  }

  private passesBaseFilters(
    p: Pokemon,
    f: { showLegendaries: boolean; types: string[]; mono: boolean; ability: string | null; showFavorites: boolean; favoriteIds: Set<string> },
  ): boolean {
    if (!f.showLegendaries && p.isLegendary) return false;
    if (f.showFavorites && !f.favoriteIds.has(String(p.id))) return false;

    if (f.mono || f.types.length > 0) {
      if (f.mono && p.types.length !== 1) return false;
      if (f.types.length > 0 && !f.types.every(t => p.types.includes(t))) return false;
    }

    if (f.ability) {
      const q = f.ability.toLowerCase();
      const all = [...p.abilities, ...(p.hiddenAbility ? [p.hiddenAbility] : [])];
      if (!all.some(a => a.name.toLowerCase().includes(q))) return false;
    }

    return true;
  }

  private passesFusionFilters(
    h: Pokemon,
    b: Pokemon,
    f: { showLegendaries: boolean; types: string[]; mono: boolean; ability: string | null; showFavorites: boolean; favoriteIds: Set<string> },
  ): boolean {
    if (!f.showLegendaries && (h.isLegendary || b.isLegendary)) return false;
    if (f.showFavorites && !f.favoriteIds.has(`${h.id}.${b.id}`)) return false;

    if (f.mono || f.types.length > 0) {
      const ft = this.fusionTypes(h, b);
      if (f.mono && ft.length !== 1) return false;
      if (f.types.length > 0 && !f.types.every(t => ft.includes(t))) return false;
    }

    if (f.ability) {
      const q = f.ability.toLowerCase();
      const all = [
        ...h.abilities, ...b.abilities,
        ...(h.hiddenAbility ? [h.hiddenAbility] : []),
        ...(b.hiddenAbility ? [b.hiddenAbility] : []),
      ];
      if (!all.some(a => a.name.toLowerCase().includes(q))) return false;
    }

    return true;
  }

  private fusionTypes(h: Pokemon, b: Pokemon): string[] {
    const type1 = h.types[0];
    let type2 = b.types[1] ?? b.types[0];
    if (type2 === type1) type2 = b.types[0];
    return type1 !== type2 ? [type1, type2] : [type1];
  }

  private compareItems(x: PoolItem, y: PoolItem, sortBy: SortOption): number {
    const av = this.itemStatValue(x, sortBy);
    const bv = this.itemStatValue(y, sortBy);
    return bv - av; // descending
  }

  private itemStatValue(item: PoolItem, stat: SortOption): number {
    if (item.kind === 'base') {
      const s = item.p.stats;
      switch (stat) {
        case 'hp':    return s.hp;
        case 'atk':   return s.atk;
        case 'def':   return s.def;
        case 'spa':   return s.spa;
        case 'spd':   return s.spd;
        case 'spe':   return s.spe;
        case 'total': return s.total;
        default:      return 0;
      }
    }
    return this.fusionStatValue(item.h, item.b, stat);
  }

  private fusionStatValue(h: Pokemon, b: Pokemon, stat: SortOption): number {
    switch (stat) {
      case 'hp':    return Math.round((2/3)*h.stats.hp  + (1/3)*b.stats.hp);
      case 'atk':   return Math.round((1/3)*h.stats.atk + (2/3)*b.stats.atk);
      case 'def':   return Math.round((1/3)*h.stats.def + (2/3)*b.stats.def);
      case 'spa':   return Math.round((2/3)*h.stats.spa + (1/3)*b.stats.spa);
      case 'spd':   return Math.round((2/3)*h.stats.spd + (1/3)*b.stats.spd);
      case 'spe':   return Math.round((1/3)*h.stats.spe + (2/3)*b.stats.spe);
      case 'total': {
        const hp  = Math.round((2/3)*h.stats.hp  + (1/3)*b.stats.hp);
        const atk = Math.round((1/3)*h.stats.atk + (2/3)*b.stats.atk);
        const def = Math.round((1/3)*h.stats.def + (2/3)*b.stats.def);
        const spa = Math.round((2/3)*h.stats.spa + (1/3)*b.stats.spa);
        const spd = Math.round((2/3)*h.stats.spd + (1/3)*b.stats.spd);
        const spe = Math.round((1/3)*h.stats.spe + (2/3)*b.stats.spe);
        return hp + atk + def + spa + spd + spe;
      }
      default: return 0;
    }
  }
}
