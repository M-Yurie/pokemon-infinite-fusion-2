import { Injectable } from '@angular/core';

const BASE_CDN = 'https://ifd-spaces.sfo2.cdn.digitaloceanspaces.com/custom/';
const SPRITE_PREF_KEY = (headId: number, bodyId: number) => `sprite_pref_${headId}_${bodyId}`;
const VARIANTS = 'abcdefghijklmnopqrstuvwxyz';

interface UrlCheck { ok: boolean; lastModified: number; }

@Injectable({ providedIn: 'root' })
export class ImageService {
  // Unified HEAD-request cache — keyed by full URL
  private readonly urlCache = new Map<string, UrlCheck>();

  // ─── URL builders ─────────────────────────────────────────────────────────
  getBaseSprite(id: number): string {
    return `${BASE_CDN}${id}.png`;
  }

  getFusionSprite(headId: number, bodyId: number): string {
    return `${BASE_CDN}${headId}.${bodyId}.png`;
  }

  getFusionVariantSprite(headId: number, bodyId: number, variant: string): string {
    return `${BASE_CDN}${headId}.${bodyId}${variant}.png`;
  }

  /** Returns the user-preferred sprite URL (reads localStorage). Falls back to default. */
  getDisplaySprite(headId: number, bodyId: number): string {
    const pref = localStorage.getItem(SPRITE_PREF_KEY(headId, bodyId)) ?? '';
    return pref
      ? this.getFusionVariantSprite(headId, bodyId, pref)
      : this.getFusionSprite(headId, bodyId);
  }

  saveSpritePref(headId: number, bodyId: number, variant: string): void {
    localStorage.setItem(SPRITE_PREF_KEY(headId, bodyId), variant);
  }

  getSpritePref(headId: number, bodyId: number): string {
    return localStorage.getItem(SPRITE_PREF_KEY(headId, bodyId)) ?? '';
  }

  getBaseSpriteVariant(id: number, variant: string): string {
    return `${BASE_CDN}${id}${variant}.png`;
  }

  saveBaseSpriteVariantPref(id: number, variant: string): void {
    localStorage.setItem(`sprite_pref_base_${id}`, variant);
  }

  // ─── Sprite count & gallery URLs ──────────────────────────────────────────
  async getSpriteCount(headId: number, bodyId: number): Promise<number> {
    const base = `${BASE_CDN}${headId}.${bodyId}`;
    const def = await this.checkUrl(`${base}.png`);
    if (!def.ok) return 0;

    let count = 1;
    for (const char of VARIANTS) {
      const r = await this.checkUrl(`${base}${char}.png`);
      if (!r.ok) break;
      count++;
      if (count >= 10) break;
    }
    return count;
  }

  async getSpriteCountForBase(id: number): Promise<number> {
    const base = await this.checkUrl(this.getBaseSprite(id));
    if (!base.ok) return 0;
    let count = 1;
    for (const char of VARIANTS) {
      const r = await this.checkUrl(this.getBaseSpriteVariant(id, char));
      if (!r.ok) break;
      count++;
      if (count >= 10) break;
    }
    return count;
  }

  async getAllSpriteUrlsForBase(
    id: number,
  ): Promise<{ url: string; label: string; variant: string; lastModified: number }[]> {
    const base = await this.checkUrl(this.getBaseSprite(id));
    if (!base.ok) return [];
    const results: { url: string; label: string; variant: string; lastModified: number }[] = [
      { url: this.getBaseSprite(id), label: 'Default', variant: '', lastModified: 0 },
    ];
    for (const char of VARIANTS) {
      const url = this.getBaseSpriteVariant(id, char);
      const r = await this.checkUrl(url);
      if (!r.ok) break;
      results.push({ url, label: char.toUpperCase(), variant: char, lastModified: 0 });
      if (results.length >= 10) break;
    }
    return results;
  }

  async getLastSpriteUrl(headId: number, bodyId: number): Promise<string> {
    const base = `${BASE_CDN}${headId}.${bodyId}`;
    let lastUrl = `${base}.png`;
    for (const char of VARIANTS) {
      const url = `${base}${char}.png`;
      const r = await this.checkUrl(url);
      if (!r.ok) break;
      lastUrl = url;
      if (char === 'j') break; // safety cap at 10 variants
    }
    return lastUrl;
  }

  async getAllSpriteUrls(
    headId: number,
    bodyId: number,
  ): Promise<{ url: string; label: string; variant: string; lastModified: number }[]> {
    const base = `${BASE_CDN}${headId}.${bodyId}`;
    const defaultCheck = await this.checkUrl(`${base}.png`);
    if (!defaultCheck.ok) return [];

    const results: { url: string; label: string; variant: string; lastModified: number }[] = [
      { url: `${base}.png`, label: 'Default', variant: '', lastModified: defaultCheck.lastModified },
    ];

    for (const char of VARIANTS) {
      const url = `${base}${char}.png`;
      const r = await this.checkUrl(url);
      if (!r.ok) break;
      results.push({ url, label: char.toUpperCase(), variant: char, lastModified: r.lastModified });
    }

    return results;
  }

  /** Always returns 0 — Last-Modified is unavailable without fetch/HEAD (CORS-blocked). */
  async getLastModified(_url: string): Promise<number> {
    return 0;
  }

  // ─── Internal ─────────────────────────────────────────────────────────────
  // Uses Image loading instead of fetch/HEAD to avoid CORS restrictions.
  // DigitalOcean Spaces blocks cross-origin HEAD requests but allows image loads.
  private checkUrl(url: string): Promise<UrlCheck> {
    const cached = this.urlCache.get(url);
    if (cached !== undefined) return Promise.resolve(cached);

    return new Promise(resolve => {
      const img = new Image();

      img.onload = () => {
        const result: UrlCheck = { ok: true, lastModified: 0 };
        this.urlCache.set(url, result);
        resolve(result);
      };

      img.onerror = () => {
        const result: UrlCheck = { ok: false, lastModified: 0 };
        this.urlCache.set(url, result);
        resolve(result);
      };

      img.src = url;
    });
  }
}
