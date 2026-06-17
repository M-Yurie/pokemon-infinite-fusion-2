import {
  AfterViewInit, Component, ElementRef, NgZone, OnDestroy,
  ViewChild, computed, effect, inject, signal,
} from '@angular/core';
import { Pokemon } from '../../models/pokemon.model';
import { DexFilters, Fusion, FusionPosition, SortOption } from '../../models/fusion.model';
import { PokemonService }  from '../../core/services/pokemon.service';
import { FusionService }   from '../../core/services/fusion.service';
import { ImageService }    from '../../core/services/image.service';
import { FavoriteService } from '../../core/services/favorite.service';
import { FilterService }   from '../../core/services/filter.service';

const TYPE_COLORS: Record<string, string> = {
  Normal: '#9FA19F', Fire: '#E62829', Water: '#2980EF', Grass: '#3FA129',
  Electric: '#FAC000', Ice: '#3DCEF3', Fighting: '#FF8000', Poison: '#9141CB',
  Ground: '#915121', Flying: '#81B9EF', Psychic: '#EF4179', Bug: '#92A212',
  Rock: '#AFA981', Ghost: '#704170', Dragon: '#5060E1', Dark: '#624D4E',
  Steel: '#60A1B8', Fairy: '#EF70EF',
};

@Component({
  selector: 'app-dex',
  imports: [],
  templateUrl: './dex.html',
  styleUrl: './dex.scss',
})
export class Dex implements AfterViewInit, OnDestroy {
  private readonly pokemonSvc = inject(PokemonService);
  private readonly fusionSvc  = inject(FusionService);
  private readonly imageSvc   = inject(ImageService);
  private readonly zone       = inject(NgZone);
  readonly favSvc    = inject(FavoriteService);
  readonly filterSvc = inject(FilterService);

  @ViewChild('sentinel') private sentinelRef!: ElementRef<HTMLElement>;

  // ─── State ────────────────────────────────────────────────────────────────
  readonly allPokemon     = signal<Pokemon[]>([]);
  readonly loading        = signal(true);
  readonly loadingMore    = signal(false);
  readonly displayedCards = signal<Fusion[]>([]);
  readonly spriteCounts   = signal<Map<string, number>>(new Map());
  readonly galleryFusion  = signal<Fusion | null>(null);
  readonly galleryUrls    = signal<string[]>([]);
  readonly searchOpen     = signal(false);
  readonly searchQuery    = signal('');
  readonly searchResults  = signal<Pokemon[]>([]);
  readonly sortOpen       = signal(false);
  readonly showFilters    = signal(false);
  readonly abilityQuery   = signal('');
  readonly abilityOpen    = signal(false);

  // ─── Pool internals (not signals) ─────────────────────────────────────────
  private pool: { h: Pokemon; b: Pokemon }[] = [];
  private poolOffset = 0;
  private poolKey    = '';
  private observer: IntersectionObserver | null = null;
  private rebuildTimer: ReturnType<typeof setTimeout> | null = null;

  // ─── Static data ──────────────────────────────────────────────────────────
  readonly allTypes   = Object.keys(TYPE_COLORS);
  readonly typeColors = TYPE_COLORS;
  readonly sortOptions: { value: SortOption; label: string }[] = [
    { value: 'dex',   label: 'Dex#'    },
    { value: 'age',   label: 'Age'     },
    { value: 'hp',    label: 'HP'      },
    { value: 'atk',   label: 'Attack'  },
    { value: 'def',   label: 'Defense' },
    { value: 'spa',   label: 'SP.Att'  },
    { value: 'spd',   label: 'SP.Def'  },
    { value: 'spe',   label: 'Speed'   },
    { value: 'total', label: 'Total'   },
  ];
  readonly positions: { v: FusionPosition; label: string }[] = [
    { v: 'either', label: 'Either' },
    { v: 'head',   label: 'Head'   },
    { v: 'body',   label: 'Body'   },
  ];
  readonly dots = ['#7C6CFF', '#79DFFF', '#FF8BCF'];

  // ─── Computed ─────────────────────────────────────────────────────────────
  readonly sortLabel = computed(() => {
    const s = this.filterSvc.filters().sortBy;
    return this.sortOptions.find(o => o.value === s)?.label ?? 'Dex#';
  });

  readonly activeFilterCount = computed(() => {
    const f = this.filterSvc.filters();
    return f.types.length + (f.ability ? 1 : 0) + (!f.showLegendaries ? 1 : 0);
  });

  // ─── Template aliases ─────────────────────────────────────────────────────
  get filters()       { return this.filterSvc.filters; }
  get favoritesCount(){ return this.favSvc.favorites().length; }

  // ─── Constructor ──────────────────────────────────────────────────────────
  constructor() {
    this.pokemonSvc.loadAll().subscribe(pokemon => {
      this.allPokemon.set(pokemon);
      this.loading.set(false);
    });

    effect(() => {
      const filters = this.filterSvc.filters();
      const favIds  = new Set(this.favSvc.favorites());
      const pokemon = this.allPokemon();
      if (!pokemon.length) return;

      const key = JSON.stringify({
        sel:       filters.selectedPokemon.map(p => p.id),
        pos:       filters.position,
        types:     [...filters.types].sort(),
        ability:   filters.ability,
        legendary: filters.showLegendaries,
        favorites: filters.showFavorites,
        favIds:    filters.showFavorites ? [...favIds].sort() : [],
        sortBy:    filters.sortBy,
      });

      if (key !== this.poolKey) {
        this.poolKey = key;
        this.scheduleRebuild(pokemon, { ...filters, favoriteIds: favIds });
      }
    });
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────
  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      this.observer = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && !this.loadingMore()) {
          this.zone.run(() => this.loadNextPage());
        }
      }, { rootMargin: '0px 0px 576px 0px' });

      if (this.sentinelRef?.nativeElement) {
        this.observer.observe(this.sentinelRef.nativeElement);
      }
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    if (this.rebuildTimer !== null) clearTimeout(this.rebuildTimer);
  }

  // ─── Pool management ──────────────────────────────────────────────────────
  private scheduleRebuild(pokemon: Pokemon[], filters: DexFilters): void {
    if (this.rebuildTimer !== null) clearTimeout(this.rebuildTimer);
    this.loadingMore.set(true);

    this.rebuildTimer = setTimeout(() => {
      this.pool = this.fusionSvc.buildPool(pokemon, filters);
      this.poolOffset = 0;
      const first = this.fusionSvc.getPage(this.pool, 0, 36);
      this.displayedCards.set(first);
      this.poolOffset = first.length;
      this.loadingMore.set(false);
      this.spriteCounts.set(new Map());
      this.loadSpriteCounts(first);
    }, 0);
  }

  private loadNextPage(): void {
    if (this.poolOffset >= this.pool.length) return;
    const next = this.fusionSvc.getPage(this.pool, this.poolOffset, 36);
    this.displayedCards.update(prev => [...prev, ...next]);
    this.poolOffset += next.length;
    this.loadSpriteCounts(next);
  }

  private loadSpriteCounts(fusions: Fusion[]): void {
    fusions.forEach(fusion => {
      this.imageSvc.getSpriteCount(fusion.head.id, fusion.body.id).then(count => {
        if (count > 1) {
          this.spriteCounts.update(m => {
            const next = new Map(m);
            next.set(fusion.id, count);
            return next;
          });
        }
      });
    });
  }

  // ─── Search ───────────────────────────────────────────────────────────────
  onSearchInput(value: string): void {
    this.searchQuery.set(value);
    if (!value.trim()) {
      this.searchResults.set([]);
      this.searchOpen.set(false);
      return;
    }
    const selected = this.filterSvc.filters().selectedPokemon;
    const results = this.pokemonSvc.search(value)
      .filter(p => !selected.some(s => s.id === p.id))
      .slice(0, 12);
    this.searchResults.set(results);
    this.searchOpen.set(results.length > 0);
  }

  selectPokemon(p: Pokemon): void {
    this.filterSvc.addPokemon(p);
    this.searchQuery.set('');
    this.searchResults.set([]);
    this.searchOpen.set(false);
  }

  deselectPokemon(id: number): void { this.filterSvc.removePokemon(id); }

  closeSearch(): void { this.searchOpen.set(false); }

  // ─── Controls ─────────────────────────────────────────────────────────────
  setPosition(p: FusionPosition): void { this.filterSvc.setPosition(p); }

  setSortBy(s: SortOption): void {
    this.filterSvc.setSortBy(s);
    this.sortOpen.set(false);
  }

  toggleType(type: string): void { this.filterSvc.toggleType(type); }
  clearTypes(): void              { this.filterSvc.clearTypes(); }

  clearFilters(): void {
    this.filterSvc.clearFilters();
    this.abilityQuery.set('');
  }

  toggleSortOpen(): void    { this.sortOpen.update(v => !v); }
  toggleShowFilters(): void { this.showFilters.update(v => !v); }
  toggleLegendaries(): void { this.filterSvc.toggleLegendaries(); }

  toggleFavoritesOnly(): void {
    this.filterSvc.setFavoriteIds(new Set(this.favSvc.getAll()));
    this.filterSvc.toggleFavorites();
  }

  onAbilityInput(value: string): void {
    this.abilityQuery.set(value);
    this.filterSvc.setAbility(value || null);
    this.abilityOpen.set(true);
  }

  clearAbility(): void {
    this.abilityQuery.set('');
    this.filterSvc.setAbility(null);
    this.abilityOpen.set(false);
  }

  toggleAbilityOpen(): void { this.abilityOpen.update(v => !v); }
  closeSortOpen(): void     { this.sortOpen.set(false); }
  closeAbilityOpen(): void  { this.abilityOpen.set(false); }

  // ─── Favorites ────────────────────────────────────────────────────────────
  toggleFavorite(fusionId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.favSvc.toggle(fusionId);
    if (this.filterSvc.filters().showFavorites) {
      this.filterSvc.setFavoriteIds(new Set(this.favSvc.getAll()));
    }
  }

  isFavorite(fusionId: string): boolean { return this.favSvc.isFavorite(fusionId); }

  // ─── Gallery ──────────────────────────────────────────────────────────────
  openGallery(fusion: Fusion, event: MouseEvent): void {
    event.stopPropagation();
    this.galleryFusion.set(fusion);
    this.galleryUrls.set([]);
    this.imageSvc.getCustomSpriteUrls(fusion.head.id, fusion.body.id).then(urls => {
      this.galleryUrls.set(urls);
    });
  }

  closeGallery(): void { this.galleryFusion.set(null); this.galleryUrls.set([]); }

  variantLabel(i: number): string {
    return i === 0 ? 'Default' : String.fromCharCode(64 + i);
  }

  stopEvent(event: MouseEvent): void { event.stopPropagation(); }

  // ─── Sprite / display helpers ─────────────────────────────────────────────
  spriteStyle(headId: number, bodyId: number): Record<string, string> {
    return this.imageSvc.getSpriteSheetStyle(headId, bodyId);
  }

  spriteCount(fusionId: string): number {
    return this.spriteCounts().get(fusionId) ?? 0;
  }

  spriteCountLabel(count: number): string { return count >= 10 ? '+' : String(count); }

  typeColor(type: string): string    { return TYPE_COLORS[type] ?? '#9FA19F'; }
  typeIsActive(type: string): boolean { return this.filterSvc.filters().types.includes(type); }
}
