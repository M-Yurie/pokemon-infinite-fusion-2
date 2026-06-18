import {
  Component, OnInit, OnDestroy, inject, signal, computed,
} from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { Pokemon, EvolutionEntry } from '../../models/pokemon.model';
import { PokemonService } from '../../core/services/pokemon.service';
import { FusionService } from '../../core/services/fusion.service';
import { ImageService } from '../../core/services/image.service';
import { TypeChartService, TypeChart } from '../../core/services/type-chart.service';

const TYPE_COLORS: Record<string, string> = {
  Normal: '#9FA19F', Fire: '#E62829', Water: '#2980EF', Grass: '#3FA129',
  Electric: '#FAC000', Ice: '#3DCEF3', Fighting: '#FF8000', Poison: '#9141CB',
  Ground: '#915121', Flying: '#81B9EF', Psychic: '#EF4179', Bug: '#92A212',
  Rock: '#AFA981', Ghost: '#704170', Dragon: '#5060E1', Dark: '#624D4E',
  Steel: '#60A1B8', Fairy: '#EF70EF',
};

const ALL_TYPES = Object.keys(TYPE_COLORS);

interface StatRow {
  key: string; label: string;
  leftVal: number; rightVal: number; diff: number; isTotal: boolean;
}

interface WeaknessGroup { multiplier: number; label: string; types: string[]; }

interface EvoInfo { prev: EvolutionEntry | null; next: EvolutionEntry[]; }

interface EvoNode { entry: EvolutionEntry; children: EvoNode[]; }
interface EvoRenderItem { entry: EvolutionEntry; }
interface EvoRenderRow { items: EvoRenderItem[]; isIndented: boolean; parentLevel?: number; }

@Component({
  selector: 'app-pokemon',
  imports: [RouterLink],
  templateUrl: './pokemon.html',
  styleUrl: './pokemon.scss',
})
export class PokemonDetail implements OnInit, OnDestroy {
  private readonly route      = inject(ActivatedRoute);
  private readonly pokemonSvc = inject(PokemonService);
  private readonly fusionSvc  = inject(FusionService);
  readonly imageSvc            = inject(ImageService);
  private readonly chartSvc   = inject(TypeChartService);

  private sub = new Subscription();

  // ─── Core data ────────────────────────────────────────────────────────────
  readonly loading    = signal(true);
  readonly headId     = signal(0);
  readonly bodyId     = signal(0);
  readonly head       = signal<Pokemon | null>(null);
  readonly body       = signal<Pokemon | null>(null);
  readonly typeChart  = signal<TypeChart | null>(null);

  // Badge counts
  readonly leftBadge  = signal(0);
  readonly rightBadge = signal(0);

  // Generated sprite flags
  readonly leftGenerated  = signal(false);
  readonly rightGenerated = signal(false);

  // Gallery
  readonly galleryTarget   = signal<'left' | 'right' | null>(null);
  readonly galleryItems    = signal<{ url: string; label: string; variant: string; lastModified: number }[]>([]);
  readonly gallerySelected = signal<{ variant: string; url: string } | null>(null);

  // Mobile dropdowns
  readonly devolveOpen = signal(false);
  readonly evolveOpen  = signal(false);

  // Display sprite overrides (after setAsDefault)
  readonly leftDisplayUrl  = signal<string | null>(null);
  readonly rightDisplayUrl = signal<string | null>(null);

  // ─── Derived ──────────────────────────────────────────────────────────────
  readonly isSelfFusion = computed(() => this.headId() === this.bodyId());

  readonly leftLabel = computed(() => {
    const h = this.head();
    if (!h) return { id: '', name: '' };
    if (this.isSelfFusion()) return { id: `#${h.id}`, name: h.name };
    return { id: `#${h.id}.${this.bodyId()}`, name: `${h.name}/${this.body()?.name ?? ''}` };
  });

  readonly rightLabel = computed(() => {
    const h = this.head(), b = this.body();
    if (!h) return { id: '', name: '' };
    if (this.isSelfFusion()) return { id: `#${h.id}.${h.id}`, name: `${h.name}/${h.name}` };
    return { id: `#${b!.id}.${h.id}`, name: `${b!.name}/${h.name}` };
  });

  readonly leftTypes = computed(() => {
    const h = this.head(), b = this.body();
    if (!h) return [];
    if (this.isSelfFusion()) return h.types;
    return this.fusionSvc.getFusionTypes(h, b!);
  });

  readonly rightTypes = computed(() => {
    const h = this.head(), b = this.body();
    if (!h) return [];
    if (this.isSelfFusion()) return this.fusionSvc.getFusionTypes(h, h);
    return this.fusionSvc.getFusionTypes(b!, h);
  });

  readonly leftSpriteUrl = computed(() => {
    if (this.leftDisplayUrl()) return this.leftDisplayUrl()!;
    if (this.isSelfFusion()) return this.imageSvc.getBaseSprite(this.headId());
    const pref = this.imageSvc.getSpritePref(this.headId(), this.bodyId());
    return pref
      ? this.imageSvc.getFusionVariantSprite(this.headId(), this.bodyId(), pref)
      : this.imageSvc.getFusionSprite(this.headId(), this.bodyId());
  });

  readonly rightSpriteUrl = computed(() => {
    if (this.rightDisplayUrl()) return this.rightDisplayUrl()!;
    if (this.isSelfFusion()) return this.imageSvc.getFusionSprite(this.headId(), this.bodyId());
    const pref = this.imageSvc.getSpritePref(this.bodyId(), this.headId());
    return pref
      ? this.imageSvc.getFusionVariantSprite(this.bodyId(), this.headId(), pref)
      : this.imageSvc.getFusionSprite(this.bodyId(), this.headId());
  });

  readonly leftStats = computed(() => {
    const h = this.head(), b = this.body();
    if (!h) return null;
    if (this.isSelfFusion()) return h.stats;
    return this.fusionSvc.getFusionStats(h, b!);
  });

  readonly rightStats = computed(() => {
    const h = this.head(), b = this.body();
    if (!h) return null;
    if (this.isSelfFusion()) return this.fusionSvc.getFusionStats(h, h);
    return this.fusionSvc.getFusionStats(b!, h);
  });

  readonly statRows = computed((): StatRow[] => {
    const ls = this.leftStats(), rs = this.rightStats();
    if (!ls || !rs) return [];
    const make = (key: string, label: string, lv: number, rv: number, isTotal: boolean): StatRow =>
      ({ key, label, leftVal: lv, rightVal: rv, diff: rv - lv, isTotal });
    return [
      make('hp',    'HP',     ls.hp,    rs.hp,    false),
      make('atk',   'ATK',    ls.atk,   rs.atk,   false),
      make('def',   'DEF',    ls.def,   rs.def,   false),
      make('spa',   'SP.ATK', ls.spa,   rs.spa,   false),
      make('spd',   'SP.DEF', ls.spd,   rs.spd,   false),
      make('spe',   'SPEED',  ls.spe,   rs.spe,   false),
      make('total', 'TOTAL',  ls.total, rs.total, true),
    ];
  });

  readonly abilities = computed(() => {
    const h = this.head(), b = this.body();
    if (!h) return { regular: [], hidden: [] as { name: string; description: string }[] };
    if (this.isSelfFusion()) {
      return { regular: h.abilities, hidden: h.hiddenAbility ? [h.hiddenAbility] : [] };
    }
    const allReg = [...h.abilities, ...b!.abilities];
    const regular = allReg.filter((a, i, arr) => arr.findIndex(x => x.name === a.name) === i);
    const hiddenMap = new Map<string, { name: string; description: string }>();
    if (h.hiddenAbility)  hiddenMap.set(h.hiddenAbility.name,  h.hiddenAbility);
    if (b?.hiddenAbility) hiddenMap.set(b.hiddenAbility.name, b.hiddenAbility);
    return { regular, hidden: [...hiddenMap.values()] };
  });

  readonly leftWeaknesses = computed(() => this.computeWeaknesses(this.leftTypes()));
  readonly rightWeaknesses = computed(() => this.computeWeaknesses(this.rightTypes()));

  readonly sameWeaknesses = computed(() => {
    const lt = this.leftTypes(), rt = this.rightTypes();
    return lt.length === rt.length && lt.every((t, i) => t === rt[i]);
  });

  readonly headEvoInfo = computed((): EvoInfo => {
    const h = this.head();
    return h ? this.getEvoInfo(h.evolutionChain, this.headId()) : { prev: null, next: [] };
  });

  readonly bodyEvoInfo = computed((): EvoInfo => {
    if (this.isSelfFusion()) return this.headEvoInfo();
    const b = this.body();
    return b ? this.getEvoInfo(b.evolutionChain, this.bodyId()) : { prev: null, next: [] };
  });

  readonly sameFamily = computed(() => {
    if (this.isSelfFusion()) return true;
    const h = this.head(), b = this.body();
    if (!h || !b) return true;
    const hIds = new Set(h.evolutionChain.map(e => e.dexNumber));
    return b.evolutionChain.some(e => hIds.has(e.dexNumber));
  });

  readonly headEvoRows = computed((): EvoRenderRow[] => {
    const h = this.head();
    if (!h) return [];
    if (!h.evolutionChain.length) {
      return [{ isIndented: false, items: [{ entry: { dexNumber: h.id, name: h.name } }] }];
    }
    const tree = this.buildEvoTree(h.evolutionChain);
    return tree ? this.treeToRows(tree, false) : [];
  });

  readonly bodyEvoRows = computed((): EvoRenderRow[] => {
    if (this.isSelfFusion()) return [];
    const b = this.body();
    if (!b) return [];
    if (!b.evolutionChain.length) {
      return [{ isIndented: false, items: [{ entry: { dexNumber: b.id, name: b.name } }] }];
    }
    const tree = this.buildEvoTree(b.evolutionChain);
    return tree ? this.treeToRows(tree, false) : [];
  });

  readonly devolveOptions = computed(() => {
    const opts: { label: string; id: string }[] = [];
    const hPrev = this.headEvoInfo().prev;
    if (hPrev) {
      opts.push({ label: `Devolve Head → ${hPrev.name}`, id: `${hPrev.dexNumber}.${this.bodyId()}` });
      if (this.isSelfFusion()) {
        opts.push({ label: `Devolve Body → ${hPrev.name}`, id: `${this.headId()}.${hPrev.dexNumber}` });
      }
    }
    if (!this.isSelfFusion()) {
      const bPrev = this.bodyEvoInfo().prev;
      if (bPrev) opts.push({ label: `Devolve Body → ${bPrev.name}`, id: `${this.headId()}.${bPrev.dexNumber}` });
    }
    return opts;
  });

  readonly evolveOptions = computed(() => {
    const opts: { label: string; id: string }[] = [];
    for (const e of this.headEvoInfo().next) {
      opts.push({ label: `Evolve Head → ${e.name}`, id: `${e.dexNumber}.${this.bodyId()}` });
      if (this.isSelfFusion()) {
        opts.push({ label: `Evolve Body → ${e.name}`, id: `${this.headId()}.${e.dexNumber}` });
      }
    }
    if (!this.isSelfFusion()) {
      for (const e of this.bodyEvoInfo().next) {
        opts.push({ label: `Evolve Body → ${e.name}`, id: `${this.headId()}.${e.dexNumber}` });
      }
    }
    return opts;
  });

  // ─── Lifecycle ────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.sub.add(
      this.chartSvc.load().subscribe(chart => this.typeChart.set(chart)),
    );

    this.sub.add(
      this.route.paramMap.subscribe(params => {
        const raw = params.get('id') ?? '';
        const parts = raw.split('.');
        const hId = Number(parts[0]) || 1;
        const bId = Number(parts[1] ?? parts[0]) || hId;

        this.headId.set(hId);
        this.bodyId.set(bId);
        this.leftDisplayUrl.set(null);
        this.rightDisplayUrl.set(null);
        this.leftBadge.set(0);
        this.rightBadge.set(0);
        this.leftGenerated.set(false);
        this.rightGenerated.set(false);
        this.loading.set(true);

        this.pokemonSvc.loadAll().subscribe(all => {
          this.head.set(all.find(p => p.id === hId) ?? null);
          this.body.set(all.find(p => p.id === bId) ?? null);
          this.loading.set(false);
          void this.loadBadgeCounts(hId, bId);
        });
      }),
    );
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  private async loadBadgeCounts(hId: number, bId: number): Promise<void> {
    if (this.isSelfFusion()) {
      const [base, fusion] = await Promise.all([
        this.imageSvc.getSpriteCountForBase(hId),
        this.imageSvc.getSpriteCount(hId, bId),
      ]);
      this.leftBadge.set(base);
      this.rightBadge.set(fusion);
    } else {
      const [left, right] = await Promise.all([
        this.imageSvc.getSpriteCount(hId, bId),
        this.imageSvc.getSpriteCount(bId, hId),
      ]);
      this.leftBadge.set(left);
      this.rightBadge.set(right);
    }
  }

  // ─── Gallery ──────────────────────────────────────────────────────────────
  async openGallery(target: 'left' | 'right', event: MouseEvent): Promise<void> {
    event.stopPropagation();
    this.galleryTarget.set(target);
    this.galleryItems.set([]);
    this.gallerySelected.set(null);

    let items: { url: string; label: string; variant: string; lastModified: number }[];
    if (target === 'left') {
      items = this.isSelfFusion()
        ? await this.imageSvc.getAllSpriteUrlsForBase(this.headId())
        : await this.imageSvc.getAllSpriteUrls(this.headId(), this.bodyId());
    } else {
      items = await this.imageSvc.getAllSpriteUrls(
        this.isSelfFusion() ? this.headId() : this.bodyId(),
        this.isSelfFusion() ? this.bodyId() : this.headId(),
      );
    }
    this.galleryItems.set(items);

    const currentUrl = target === 'left' ? this.leftSpriteUrl() : this.rightSpriteUrl();
    const current = items.find(i => i.url === currentUrl);
    if (current) this.gallerySelected.set({ variant: current.variant, url: current.url });
  }

  closeGallery(): void {
    this.galleryTarget.set(null);
    this.galleryItems.set([]);
    this.gallerySelected.set(null);
  }

  selectGalleryItem(item: { variant: string; url: string }, event: MouseEvent): void {
    event.stopPropagation();
    this.gallerySelected.set({ variant: item.variant, url: item.url });
  }

  setAsDefault(): void {
    const target = this.galleryTarget(), sel = this.gallerySelected();
    if (!target || !sel) return;

    if (target === 'left') {
      if (this.isSelfFusion()) {
        this.imageSvc.saveBaseSpriteVariantPref(this.headId(), sel.variant);
      } else {
        this.imageSvc.saveSpritePref(this.headId(), this.bodyId(), sel.variant);
      }
      this.leftDisplayUrl.set(sel.url);
    } else {
      const hId = this.isSelfFusion() ? this.headId() : this.bodyId();
      const bId = this.isSelfFusion() ? this.bodyId() : this.headId();
      this.imageSvc.saveSpritePref(hId, bId, sel.variant);
      this.rightDisplayUrl.set(sel.url);
    }
    this.closeGallery();
  }

  stopEvent(e: MouseEvent): void { e.stopPropagation(); }

  // ─── Sprite errors ────────────────────────────────────────────────────────
  onSpriteError(side: 'left' | 'right', imgEl: HTMLImageElement): void {
    imgEl.style.display = 'none';
    const wrap = imgEl.parentElement;
    if (!wrap) return;
    const fallback = wrap.querySelector('.pd-sprite-fallback') as HTMLElement | null;
    if (!fallback) return;

    // For base sprite (left in self-fusion): show placeholder
    if (side === 'left' && this.isSelfFusion()) {
      const ph = wrap.querySelector('.pd-sprite-placeholder') as HTMLElement | null;
      if (ph) ph.style.display = 'flex';
      return;
    }

    // For fusion sprites: show generated sprite sheet
    const headId = side === 'left' ? this.headId() : (this.isSelfFusion() ? this.headId() : this.bodyId());
    const bodyId = side === 'left' ? this.bodyId() : (this.isSelfFusion() ? this.bodyId() : this.headId());
    const col = bodyId % 10 === 0 ? 10 : bodyId % 10;
    const row = Math.ceil(bodyId / 10);
    const src = `/assets/sprites/generated/${headId}.png`;
    const probe = new Image();
    probe.onload = () => {
      fallback.style.backgroundImage    = `url('${src}')`;
      if (side === 'left') this.leftGenerated.set(true);
    else this.rightGenerated.set(true);

    fallback.style.backgroundPosition = `-${col * 192}px -${(row - 1) * 192}px`;
      fallback.style.backgroundSize     = `${probe.naturalWidth * 2}px ${probe.naturalHeight * 2}px`;
      fallback.style.display            = 'block';
    };
    probe.src = src;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  typeColor(type: string): string { return TYPE_COLORS[type] ?? '#9FA19F'; }

  getStatPercent(value: number, isTotal: boolean): number {
    return isTotal
      ? Math.round(((value - 6) / (1524)) * 100)
      : Math.round((value / 255) * 100);
  }

  getStatColor(value: number, isTotal: boolean): string {
    if (!isTotal) {
      switch (true) {
        case value >= 1 && value <= 49: return '#ef4444';
        case value >= 50 && value <= 89: return '#eab308';
        case value >= 90 && value <= 129: return '#22c55e';
        case value >= 130 && value <= 255: return '#3b82f6';
        default: return '#9ca3af';
      }
    } else {
      switch (true) {
        case value >= 6 && value <= 299: return '#ef4444';
        case value >= 300 && value <= 499: return '#eab308';
        case value >= 500 && value <= 639: return '#22c55e';
        case value >= 640 && value <= 1524: return '#3b82f6';
        default: return '#9ca3af';
      }
    }
  }

  multLabel(m: number): string {
    const map: Record<number, string> = { 4: '×4', 2: '×2', 1: '×1', 0.5: '×½', 0.25: '×¼', 0: '×0' };
    return map[m] ?? `×${m}`;
  }

  toggleDevolve(): void { this.devolveOpen.update(v => !v); this.evolveOpen.set(false); }
  toggleEvolve(): void  { this.evolveOpen.update(v => !v); this.devolveOpen.set(false); }
  scrollToTop(): void   { window.scrollTo({ top: 0, behavior: 'smooth' }); }

  evoCardRoute(id: number): string[] { return ['/details', `${id}.${id}`]; }

  getEvoArrowLevel(row: EvoRenderRow, idx: number): number | undefined {
    return idx === 0 ? row.parentLevel : row.items[idx - 1].entry.evolvesAtLevel;
  }

  private buildEvoTree(chain: EvolutionEntry[]): EvoNode | null {
    if (!chain || chain.length === 0) return null;
    if (chain.length === 1) return { entry: chain[0], children: [] };
    const root = chain[0];
    const rest = chain.slice(1);
    const allDirect = rest.every(e => !e.evolvesAtLevel);
    if (allDirect) {
      return { entry: root, children: rest.map(e => ({ entry: e, children: [] })) };
    }
    const hasMultipleBranches = rest.filter(e => e.evolvesAtLevel).length > 1;
    if (hasMultipleBranches) {
      const branches: EvoNode[] = [];
      let i = 0;
      while (i < rest.length) {
        const node: EvoNode = { entry: rest[i], children: [] };
        if (i + 1 < rest.length && !rest[i + 1].evolvesAtLevel) {
          node.children = [{ entry: rest[i + 1], children: [] }];
          i += 2;
        } else {
          i += 1;
        }
        branches.push(node);
      }
      return { entry: root, children: branches };
    }
    const subtree = this.buildEvoTree(rest);
    return { entry: root, children: subtree ? [subtree] : [] };
  }

  private treeToRows(node: EvoNode, indent: boolean, parentLevel?: number): EvoRenderRow[] {
    if (node.children.length === 0) {
      return [{ isIndented: indent, parentLevel, items: [{ entry: node.entry }] }];
    }
    if (node.children.length === 1) {
      const childRows = this.treeToRows(node.children[0], indent, node.entry.evolvesAtLevel);
      return [
        { isIndented: indent, parentLevel, items: [{ entry: node.entry }, ...childRows[0].items] },
        ...childRows.slice(1),
      ];
    }
    const rows: EvoRenderRow[] = [{ isIndented: indent, parentLevel, items: [{ entry: node.entry }] }];
    for (const child of node.children) {
      rows.push(...this.treeToRows(child, true, node.entry.evolvesAtLevel));
    }
    return rows;
  }

  private computeWeaknesses(types: string[]): WeaknessGroup[] {
    const chart = this.typeChart();
    if (!chart || !types.length) return [];
    const groups = new Map<number, string[]>();
    for (const atkType of ALL_TYPES) {
      const m = (chart[atkType]?.[types[0]] ?? 1) * (chart[atkType]?.[types[1]] ?? 1);
      if (!groups.has(m)) groups.set(m, []);
      groups.get(m)!.push(atkType);
    }
    return [4, 2, 1, 0.5, 0.25, 0]
      .map(m => ({ multiplier: m, label: this.multLabel(m), types: groups.get(m)! }));
  }

  private getEvoInfo(chain: EvolutionEntry[], currentId: number): EvoInfo {
    const idx = chain.findIndex(e => e.dexNumber === currentId);
    if (idx === -1) return { prev: null, next: [] };
    return { prev: idx > 0 ? chain[idx - 1] : null, next: idx < chain.length - 1 ? [chain[idx + 1]] : [] };
  }
}
