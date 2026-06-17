import { Injectable } from '@angular/core';
import { Pokemon } from '../../models/pokemon.model';
import { DisplayCard, DexFilters, FusionPosition, SortOption } from '../../models/fusion.model';

export type PoolItem =
  | { kind: 'base'; p: Pokemon }
  | { kind: 'fusion'; h: Pokemon; b: Pokemon };

// Pokémon treated as pure Flying when contributing to a fusion type
const NORMAL_FLYING_IDS = new Set([
  16, 17, 18,           // Pidgey, Pidgeotto, Pidgeot
  21, 22,               // Spearow, Fearow
  41, 42,               // Zubat, Golbat
  83,                   // Farfetch'd
  84, 85,               // Doduo, Dodrio
  163, 164,             // Hoothoot, Noctowl
  198,                  // Murkrow
  276, 277,             // Taillow, Swellow
  278, 279,             // Wingull, Pelipper
  333, 334,             // Swablu, Altaria
]);

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

  /**
   * Builds the pool in two phases:
   *   Phase 1: all base Pokémon in id order
   *   Phase 2: all fusions, outer=body, inner=head
   *     body=1: fusion(1.1), fusion(2.1) ... fusion(524.1)
   *     body=2: fusion(1.2), fusion(2.2) ... fusion(524.2)
   *     ...
   */
  buildPool(allPokemon: Pokemon[], filters: DexFilters): PoolItem[] {
    const {
      selectedPokemon, position, types, mono, ability,
      showLegendaries, showFavorites, showOriginal, showFusion,
      favoriteIds, disabledIds, sortBy, sortDir,
    } = filters;

    const enabled = allPokemon
      .filter(p => !disabledIds.has(p.id))
      .sort((a, b) => a.id - b.id);

    const baseFilters = { showLegendaries, types, mono, ability, showFavorites, favoriteIds };
    const items: PoolItem[] = [];

    // Phase 1: base Pokémon
    if (showOriginal) {
      for (const p of enabled) {
        const passesSelection =
          selectedPokemon.length === 0 ||
          selectedPokemon.some(s => s.id === p.id);
        if (passesSelection && this.passesBaseFilters(p, baseFilters)) {
          items.push({ kind: 'base', p });
        }
      }
    }

    // Phase 2: fusions (outer = body, inner = head)
    if (showFusion) {
      for (const bodyPok of enabled) {
        for (const headPok of enabled) {
          if (!this.passesFusionSelection(headPok, bodyPok, selectedPokemon, position)) continue;
          if (!this.passesFusionFilters(headPok, bodyPok, baseFilters)) continue;
          items.push({ kind: 'fusion', h: headPok, b: bodyPok });
        }
      }
    }

    // Stat sorts apply on top of the natural order; dex = natural order
    if (sortBy !== 'dex') {
      items.sort((x, y) => {
        const av = this.itemStatValue(x, sortBy);
        const bv = this.itemStatValue(y, sortBy);
        return sortDir === 'asc' ? av - bv : bv - av;
      });
    } else if (sortDir === 'desc') {
      items.reverse();
    }

    return items;
  }

  getPage(pool: PoolItem[], offset: number, limit = 36): DisplayCard[] {
    return pool.slice(offset, offset + limit).map(item => this.makeDisplayCard(item));
  }

  // ─── Private helpers ──────────────────────────────────────────────────────
  private passesFusionSelection(
    head: Pokemon,
    body: Pokemon,
    selectedPokemon: Pokemon[],
    position: FusionPosition,
  ): boolean {
    if (selectedPokemon.length === 0) return true;

    if (selectedPokemon.length === 1) {
      const sel = selectedPokemon[0];
      if (position === 'head') return head.id === sel.id;
      if (position === 'body') return body.id === sel.id;
      return head.id === sel.id || body.id === sel.id;
    }

    const selA = selectedPokemon[0];
    const selB = selectedPokemon[1];
    if (position === 'head')  return head.id === selA.id && body.id === selB.id;
    if (position === 'body')  return head.id === selB.id && body.id === selA.id;
    // either
    return (
      (head.id === selA.id && body.id === selB.id) ||
      (head.id === selB.id && body.id === selA.id)
    );
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

  private getEffectiveTypes(pokemon: Pokemon): string[] {
    return NORMAL_FLYING_IDS.has(pokemon.id) ? ['Flying'] : pokemon.types;
  }

  private fusionTypes(h: Pokemon, b: Pokemon): string[] {
    const hTypes = this.getEffectiveTypes(h);
    const bTypes = this.getEffectiveTypes(b);
    const type1 = hTypes[0];
    let type2   = bTypes[1] ?? bTypes[0];
    if (type2 === type1) type2 = bTypes[0];
    return type1 !== type2 ? [type1, type2] : [type1];
  }

  private itemStatValue(item: PoolItem, stat: SortOption): number {
    if (item.kind === 'base') {
      const s = item.p.stats;
      switch (stat) {
        case 'hp': return s.hp; case 'atk': return s.atk; case 'def': return s.def;
        case 'spa': return s.spa; case 'spd': return s.spd; case 'spe': return s.spe;
        case 'total': return s.total; default: return 0;
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
