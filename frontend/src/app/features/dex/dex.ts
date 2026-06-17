import {
  AfterViewInit, Component, ElementRef, NgZone, OnDestroy,
  ViewChild, computed, effect, inject, signal,
} from '@angular/core';
import { Pokemon } from '../../models/pokemon.model';
import { DisplayCard, DexFilters, FusionPosition, SortOption } from '../../models/fusion.model';
import { PokemonService }  from '../../core/services/pokemon.service';
import { FusionService, PoolItem }   from '../../core/services/fusion.service';
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
  readonly imageSvc   = inject(ImageService);
  private readonly zone       = inject(NgZone);
  readonly favSvc    = inject(FavoriteService);
  readonly filterSvc = inject(FilterService);

  @ViewChild('sentinel') private sentinelRef!: ElementRef<HTMLElement>;

  // ─── State ────────────────────────────────────────────────────────────────
  readonly allPokemon     = signal<Pokemon[]>([]);
  readonly loading        = signal(true);
  readonly loadingMore    = signal(false);
  readonly displayedCards = signal<DisplayCard[]>([]);
  readonly spriteCounts   = signal<Map<string, number>>(new Map());
  readonly spritePrefs    = signal<Map<string, string>>(new Map());
  readonly galleryFusion  = signal<DisplayCard | null>(null);
  readonly galleryItems   = signal<{ url: string; label: string; variant: string; lastModified: number }[]>([]);
  readonly searchOpen     = signal(false);
  readonly searchQuery    = signal('');
  readonly searchResults  = signal<Pokemon[]>([]);
  readonly sortOpen       = signal(false);
  readonly showFilters    = signal(false);
  readonly abilityQuery   = signal('');
  readonly abilityOpen    = signal(false);
  readonly abilityOptions = signal<string[]>([]);
  readonly hasMore        = signal(false);

  // ─── Pool internals ───────────────────────────────────────────────────────
  private pool: PoolItem[] = [];
  private poolOffset = 0;
  private poolKey    = '';
  private observer: IntersectionObserver | null = null;
  private rebuildTimer: ReturnType<typeof setTimeout> | null = null;
  private isLoadingPage = false;
  private lastModifiedCache = new Map<string, number>(); // card.id → ms timestamp
  private allAbilityNames: string[] = [];

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
    return (
      f.types.length +
      (f.mono ? 1 : 0) +
      (f.ability ? 1 : 0) +
      (!f.showLegendaries ? 1 : 0) +
      (!f.showOriginal ? 1 : 0) +
      (!f.showFusion ? 1 : 0)
    );
  });

  // ─── Template aliases ─────────────────────────────────────────────────────
  get filters()        { return this.filterSvc.filters; }
  get favoritesCount() { return this.favSvc.favorites().length; }

  // ─── Constructor ──────────────────────────────────────────────────────────
  constructor() {
    this.pokemonSvc.loadAll().subscribe(pokemon => {
      this.allPokemon.set(pokemon);
      this.loading.set(false);
      this.buildAbilityList(pokemon);
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
        mono:      filters.mono,
        ability:   filters.ability,
        legendary: filters.showLegendaries,
        original:  filters.showOriginal,
        fusion:    filters.showFusion,
        favorites: filters.showFavorites,
        favIds:    filters.showFavorites ? [...favIds].sort() : [],
        sortBy:    filters.sortBy,
        sortDir:   filters.sortDir,
      });

      if (key !== this.poolKey) {
        this.poolKey = key;
        this.scheduleRebuild(pokemon, { ...filters, favoriteIds: favIds });
      }
    });
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────
  ngAfterViewInit(): void {
    this.setupObserver();
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    if (this.rebuildTimer !== null) clearTimeout(this.rebuildTimer);
  }

  private setupObserver(): void {
    if (this.observer) this.observer.disconnect();

    this.zone.runOutsideAngular(() => {
      this.observer = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && !this.loading() && !this.isLoadingPage && this.hasMore()) {
          this.zone.run(() => this.loadNextPage());
        }
      }, { rootMargin: '0px 0px 576px 0px' });

      if (this.sentinelRef?.nativeElement) {
        this.observer.observe(this.sentinelRef.nativeElement);
      }
    });
  }

  // ─── Pool management ──────────────────────────────────────────────────────
  private scheduleRebuild(pokemon: Pokemon[], filters: DexFilters): void {
    if (this.rebuildTimer !== null) clearTimeout(this.rebuildTimer);
    this.loadingMore.set(true);
    this.isLoadingPage = true;

    this.rebuildTimer = setTimeout(() => {
      this.pool = this.fusionSvc.buildPool(pokemon, filters);
      this.poolOffset = 0;
      const first = this.fusionSvc.getPage(this.pool, 0, 36);

      if (filters.sortBy === 'age') {
        void this.sortByAgeAndSet(first, true, filters.sortDir).then(() => {
          this.poolOffset = 36;
          this.hasMore.set(this.pool.length > 36);
          this.loadingMore.set(false);
          this.isLoadingPage = false;
          this.spriteCounts.set(new Map());
        });
      } else {
        this.displayedCards.set(first);
        this.poolOffset = first.length;
        this.hasMore.set(this.pool.length > first.length);
        this.loadingMore.set(false);
        this.isLoadingPage = false;
        this.spriteCounts.set(new Map());
      }
    }, 0);
  }

  private loadNextPage(): void {
    if (this.isLoadingPage || this.poolOffset >= this.pool.length || !this.hasMore()) return;

    const sortDir = this.filterSvc.filters().sortDir;
    const sortBy  = this.filterSvc.filters().sortBy;
    const slice   = this.fusionSvc.getPage(this.pool, this.poolOffset, 36);
    const taken   = Math.min(36, this.pool.length - this.poolOffset);
    this.poolOffset += taken;
    if (this.poolOffset >= this.pool.length) this.hasMore.set(false);

    if (sortBy === 'age') {
      this.isLoadingPage = true;
      void this.sortByAgeAndSet(slice, false, sortDir).then(() => { this.isLoadingPage = false; });
    } else {
      this.displayedCards.update(prev => [...prev, ...slice]);
    }
  }

  private async sortByAgeAndSet(cards: DisplayCard[], reset: boolean, sortDir: 'asc' | 'desc'): Promise<void> {
    const withTs = await Promise.all(cards.map(async card => {
      if (this.lastModifiedCache.has(card.id)) {
        return { card, ts: this.lastModifiedCache.get(card.id)! };
      }
      const url = card.isFusion && card.body
        ? this.imageSvc.getFusionSprite(card.head.id, card.body.id)
        : this.imageSvc.getBaseSprite(card.head.id);
      const ts = await this.imageSvc.getLastModified(url);
      this.lastModifiedCache.set(card.id, ts);
      return { card, ts };
    }));

    if (sortDir === 'asc') {
      withTs.sort((a, b) => a.ts - b.ts); // oldest first
    } else {
      withTs.sort((a, b) => b.ts - a.ts); // newest first
    }
    const sorted = withTs.map(x => x.card);

    if (reset) {
      this.displayedCards.set(sorted);
    } else {
      this.displayedCards.update(prev => [...prev, ...sorted]);
    }
  }

  private buildAbilityList(pokemon: Pokemon[]): void {
    const names = new Set<string>();
    for (const p of pokemon) {
      p.abilities.forEach(a => names.add(a.name));
      if (p.hiddenAbility) names.add(p.hiddenAbility.name);
    }
    this.allAbilityNames = [...names].sort();
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
  closeSearch(): void               { this.searchOpen.set(false); }

  // ─── Controls ─────────────────────────────────────────────────────────────
  setPosition(p: FusionPosition): void { this.filterSvc.setPosition(p); }

  setSortBy(s: SortOption): void {
    this.filterSvc.setSortBy(s);
    this.sortOpen.set(false);
  }

  toggleSortDir(): void {
    const curr = this.filterSvc.filters().sortDir;
    this.filterSvc.setSortDir(curr === 'asc' ? 'desc' : 'asc');
  }

  toggleType(type: string): void { this.filterSvc.toggleType(type); }
  toggleMono(): void              { this.filterSvc.toggleMono(); }
  clearTypes(): void              { this.filterSvc.clearTypes(); }

  clearFilters(): void {
    this.filterSvc.clearFilters();
    this.abilityQuery.set('');
    this.abilityOptions.set([]);
  }

  toggleSortOpen(): void    { this.sortOpen.update(v => !v); }
  toggleShowFilters(): void { this.showFilters.update(v => !v); }
  toggleLegendaries(): void { this.filterSvc.toggleLegendaries(); }
  toggleOriginal(): void    { this.filterSvc.toggleOriginal(); }
  toggleFusionType(): void  { this.filterSvc.toggleFusion(); }

  toggleFavoritesOnly(): void {
    this.filterSvc.setFavoriteIds(new Set(this.favSvc.getAll()));
    this.filterSvc.toggleFavorites();
  }

  onAbilityInput(value: string): void {
    this.abilityQuery.set(value);
    this.filterSvc.setAbility(value || null);
    if (value.trim()) {
      const q = value.toLowerCase();
      this.abilityOptions.set(
        this.allAbilityNames.filter(n => n.toLowerCase().includes(q)).slice(0, 8),
      );
      this.abilityOpen.set(this.abilityOptions().length > 0);
    } else {
      this.abilityOptions.set([]);
      this.abilityOpen.set(false);
    }
  }

  selectAbility(name: string): void {
    this.abilityQuery.set(name);
    this.filterSvc.setAbility(name);
    this.abilityOptions.set([]);
    this.abilityOpen.set(false);
  }

  clearAbility(): void {
    this.abilityQuery.set('');
    this.filterSvc.setAbility(null);
    this.abilityOptions.set([]);
    this.abilityOpen.set(false);
  }

  toggleAbilityOpen(): void  { this.abilityOpen.update(v => !v); }
  closeSortOpen(): void      { this.sortOpen.set(false); }
  closeAbilityOpen(): void   { this.abilityOpen.set(false); }

  // ─── Favorites ────────────────────────────────────────────────────────────
  toggleFavorite(cardId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.favSvc.toggle(cardId);
    if (this.filterSvc.filters().showFavorites) {
      this.filterSvc.setFavoriteIds(new Set(this.favSvc.getAll()));
    }
  }

  isFavorite(cardId: string): boolean { return this.favSvc.isFavorite(cardId); }

  // ─── Gallery ──────────────────────────────────────────────────────────────
  openGallery(card: DisplayCard, event: MouseEvent): void {
    if (!card.isFusion || !card.body) return;
    event.stopPropagation();
    this.galleryFusion.set(card);
    this.galleryItems.set([]);

    const pref = this.imageSvc.getSpritePref(card.head.id, card.body!.id);
    this.spritePrefs.update(m => {
      const next = new Map(m);
      next.set(card.id, pref);
      return next;
    });

    this.imageSvc.getAllSpriteUrls(card.head.id, card.body.id).then(items => {
      this.galleryItems.set(items);
    });
  }

  closeGallery(): void { this.galleryFusion.set(null); this.galleryItems.set([]); }

  selectSpriteVariant(variant: string, event: MouseEvent): void {
    event.stopPropagation();
    const card = this.galleryFusion();
    if (!card || !card.body) return;
    this.imageSvc.saveSpritePref(card.head.id, card.body.id, variant);
    this.spritePrefs.update(m => {
      const next = new Map(m);
      next.set(card.id, variant);
      return next;
    });
  }

  stopEvent(event: MouseEvent): void { event.stopPropagation(); }

  // ─── Sprite / display helpers ─────────────────────────────────────────────
  getCardSpriteUrl(card: DisplayCard): string {
    if (!card.isFusion || !card.body) return this.imageSvc.getBaseSprite(card.head.id);
    const pref = this.spritePrefs().get(card.id) ?? this.imageSvc.getSpritePref(card.head.id, card.body.id);
    return pref
      ? this.imageSvc.getFusionVariantSprite(card.head.id, card.body.id, pref)
      : this.imageSvc.getFusionSprite(card.head.id, card.body.id);
  }

  onCardImageLoaded(card: DisplayCard): void {
    if (!card.isFusion || !card.body) return;
    this.imageSvc.getSpriteCount(card.head.id, card.body.id).then(count => {
      if (count > 1) {
        this.spriteCounts.update(m => {
          const next = new Map(m);
          next.set(card.id, count);
          return next;
        });
      }
    });
  }

  onSpriteError(card: DisplayCard, imgEl: HTMLImageElement): void {
    imgEl.style.display = 'none';
    const parent = imgEl.parentElement;
    if (!parent) return;

    if (card.isFusion && card.body) {
      const bodyId = card.body.id;
      const col = bodyId % 10 === 0 ? 10 : bodyId % 10;
      const row = Math.ceil(bodyId / 10);
      const x = (col - 1) * 192;
      const y = (row - 1) * 192;
      const sheetEl = parent.querySelector('.dex-card__sprite-sheet') as HTMLElement | null;
      if (sheetEl) {
        sheetEl.style.display = 'block';
        sheetEl.style.backgroundImage = `url('/assets/sprites/generated/${card.head.id}.png')`;
        sheetEl.style.backgroundPosition = `-${x}px -${y}px`;
        sheetEl.style.backgroundSize = '1920px 1920px';
      }
      this.imageSvc.getSpriteCount(card.head.id, card.body.id).then(count => {
        if (count > 1) {
          this.spriteCounts.update(m => {
            const next = new Map(m);
            next.set(card.id, count);
            return next;
          });
        }
      });
    } else {
      const placeholder = parent.querySelector('.dex-card__sprite-placeholder') as HTMLElement | null;
      if (placeholder) placeholder.style.display = 'flex';
    }
  }

  spriteCount(cardId: string): number    { return this.spriteCounts().get(cardId) ?? 0; }
  spriteCountLabel(count: number): string { return count >= 10 ? '+' : String(count); }

  isSelectedVariant(cardId: string, variant: string): boolean {
    return (this.spritePrefs().get(cardId) ?? '') === variant;
  }

  formatDate(ts: number): string {
    if (!ts) return '';
    return new Date(ts).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  typeColor(type: string): string    { return TYPE_COLORS[type] ?? '#9FA19F'; }
  typeIsActive(type: string): boolean { return this.filterSvc.filters().types.includes(type); }
}
