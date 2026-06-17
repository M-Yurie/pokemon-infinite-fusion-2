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

  /** Returns cached Last-Modified timestamp (ms) for a URL. Runs a HEAD if not cached. */
  async getLastModified(url: string): Promise<number> {
    const r = await this.checkUrl(url);
    return r.lastModified;
  }

  // ─── Internal ─────────────────────────────────────────────────────────────
  private async checkUrl(url: string): Promise<UrlCheck> {
    const cached = this.urlCache.get(url);
    if (cached !== undefined) return cached;

    try {
      const res = await fetch(url, { method: 'HEAD' });
      const lm  = res.headers.get('Last-Modified');
      const result: UrlCheck = {
        ok: res.ok,
        lastModified: lm ? new Date(lm).getTime() : 0,
      };
      this.urlCache.set(url, result);
      return result;
    } catch {
      const result: UrlCheck = { ok: false, lastModified: 0 };
      this.urlCache.set(url, result);
      return result;
    }
  }
}
