import { Injectable } from '@angular/core';
import { Pokemon } from '../../models/pokemon.model';
import { DexFilters, Fusion, SortOption } from '../../models/fusion.model';

type Pair = { h: Pokemon; b: Pokemon };

@Injectable({ providedIn: 'root' })
export class FusionService {
  makeFusion(head: Pokemon, body: Pokemon): Fusion {
    // ─── Types ──────────────────────────────────────────────────────────────
    const type1 = head.types[0];
    let type2 = body.types[1] ?? body.types[0];
    if (type2 === type1) type2 = body.types[0];
    const types = type1 !== type2 ? [type1, type2] : [type1];

    // ─── Stats (weighted average) ────────────────────────────────────────────
    const hp    = Math.round((2 / 3) * head.stats.hp  + (1 / 3) * body.stats.hp);
    const spa   = Math.round((2 / 3) * head.stats.spa + (1 / 3) * body.stats.spa);
    const spd   = Math.round((2 / 3) * head.stats.spd + (1 / 3) * body.stats.spd);
    const atk   = Math.round((1 / 3) * head.stats.atk + (2 / 3) * body.stats.atk);
    const def   = Math.round((1 / 3) * head.stats.def + (2 / 3) * body.stats.def);
    const spe   = Math.round((1 / 3) * head.stats.spe + (2 / 3) * body.stats.spe);
    const total = hp + spa + spd + atk + def + spe;

    // ─── Abilities (deduplicated by name) ────────────────────────────────────
    const seen = new Set<string>();
    const abilities = [...head.abilities, ...body.abilities].filter(a => {
      if (seen.has(a.name)) return false;
      seen.add(a.name);
      return true;
    });

    return {
      id: `${head.id}.${body.id}`,
      name: `${head.name}/${body.name}`,
      head,
      body,
      types,
      stats: { hp, atk, def, spa, spd, spe, total },
      abilities,
      hiddenAbility: head.hiddenAbility ?? body.hiddenAbility,
      isLegendary: head.isLegendary || body.isLegendary,
      spriteCount: 0,
    };
  }

  // Builds a sorted, filtered array of (head, body) pairs.
  // Pair objects are cheap; Fusion objects are created on demand in getPage().
  buildPool(allPokemon: Pokemon[], filters: DexFilters): Pair[] {
    const { selectedPokemon, position, types, ability, showLegendaries,
            showFavorites, showFusion, sortBy, favoriteIds, disabledIds } = filters;

    if (!showFusion) return [];

    const enabled = allPokemon.filter(p => !disabledIds.has(p.id));

    // ─── Candidate pairs ───────────────────────────────────────────────────
    let pairs: Pair[];

    if (selectedPokemon.length === 2) {
      const [a, b] = selectedPokemon;
      if (position === 'either')     pairs = [{ h: a, b }, { h: b, b: a }];
      else if (position === 'head')  pairs = [{ h: a, b }];
      else                           pairs = [{ h: b, b: a }];
    } else if (selectedPokemon.length === 1) {
      const sel = selectedPokemon[0];
      const others = enabled.filter(p => p.id !== sel.id);
      if (position === 'either') {
        pairs = [
          ...others.map(p => ({ h: sel, b: p })),
          ...others.map(p => ({ h: p,   b: sel })),
        ];
      } else if (position === 'head') {
        pairs = others.map(p => ({ h: sel, b: p }));
      } else {
        pairs = others.map(p => ({ h: p, b: sel }));
      }
    } else {
      // All non-self pairs
      pairs = [];
      for (let i = 0; i < enabled.length; i++) {
        for (let j = 0; j < enabled.length; j++) {
          if (i !== j) pairs.push({ h: enabled[i], b: enabled[j] });
        }
      }
    }

    // ─── Filters (computed inline to avoid creating full Fusion objects) ────
    const filtered: Pair[] = [];
    for (const pair of pairs) {
      const { h, b } = pair;

      // Legendary
      if (!showLegendaries && (h.isLegendary || b.isLegendary)) continue;

      // Type (compute fusion types inline)
      if (types.length > 0) {
        const ft1 = h.types[0];
        let ft2 = b.types[1] ?? b.types[0];
        if (ft2 === ft1) ft2 = b.types[0];
        const fusionTypes = ft1 !== ft2 ? [ft1, ft2] : [ft1];
        if (!types.some(t => fusionTypes.includes(t))) continue;
      }

      // Ability
      if (ability) {
        const q = ability.toLowerCase();
        const all = [...h.abilities, ...b.abilities,
                     ...(h.hiddenAbility ? [h.hiddenAbility] : []),
                     ...(b.hiddenAbility ? [b.hiddenAbility] : [])];
        if (!all.some(a => a.name.toLowerCase().includes(q))) continue;
      }

      // Favorites
      if (showFavorites && !favoriteIds.has(`${h.id}.${b.id}`)) continue;

      filtered.push(pair);
    }

    // ─── Sort ──────────────────────────────────────────────────────────────
    filtered.sort((x, y) => this.comparePairs(x, y, sortBy));

    return filtered;
  }

  // Create Fusion objects only for the requested page slice.
  getPage(pool: Pair[], offset: number, limit = 36): Fusion[] {
    return pool.slice(offset, offset + limit).map(({ h, b }) => this.makeFusion(h, b));
  }

  private comparePairs(x: Pair, y: Pair, sortBy: SortOption): number {
    switch (sortBy) {
      case 'dex':
        return x.h.id !== y.h.id ? x.h.id - y.h.id : x.b.id - y.b.id;
      case 'age':
        return x.b.id !== y.b.id ? x.b.id - y.b.id : x.h.id - y.h.id;
      default: {
        const av = this.statValue(x.h, x.b, sortBy);
        const bv = this.statValue(y.h, y.b, sortBy);
        return bv - av; // descending
      }
    }
  }

  private statValue(h: Pokemon, b: Pokemon, stat: SortOption): number {
    switch (stat) {
      case 'hp':    return Math.round((2/3)*h.stats.hp    + (1/3)*b.stats.hp);
      case 'atk':   return Math.round((1/3)*h.stats.atk   + (2/3)*b.stats.atk);
      case 'def':   return Math.round((1/3)*h.stats.def   + (2/3)*b.stats.def);
      case 'spa':   return Math.round((2/3)*h.stats.spa   + (1/3)*b.stats.spa);
      case 'spd':   return Math.round((2/3)*h.stats.spd   + (1/3)*b.stats.spd);
      case 'spe':   return Math.round((1/3)*h.stats.spe   + (2/3)*b.stats.spe);
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
