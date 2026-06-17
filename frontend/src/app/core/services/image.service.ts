import { Injectable } from '@angular/core';

const BASE_CDN = 'https://ifd-spaces.sfo2.cdn.digitaloceanspaces.com/custom/';
const SPRITE_PREF_KEY = (headId: number, bodyId: number) => `sprite_pref_${headId}_${bodyId}`;
const VARIANTS = 'abcdefghijklmnopqrstuvwxyz';

@Injectable({ providedIn: 'root' })
export class ImageService {
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

  // ─── Existence checks ─────────────────────────────────────────────────────
  async getSpriteCount(headId: number, bodyId: number): Promise<number> {
    const base = `${BASE_CDN}${headId}.${bodyId}`;
    if (!(await this.exists(`${base}.png`))) return 0;

    let count = 1;
    for (const char of VARIANTS) {
      if (!(await this.exists(`${base}${char}.png`))) break;
      count++;
      if (count >= 10) break;
    }
    return count;
  }

  async getAllSpriteUrls(headId: number, bodyId: number): Promise<{ url: string; label: string; variant: string }[]> {
    const base = `${BASE_CDN}${headId}.${bodyId}`;
    const defaultUrl = `${base}.png`;
    if (!(await this.exists(defaultUrl))) return [];

    const results: { url: string; label: string; variant: string }[] = [
      { url: defaultUrl, label: 'Default', variant: '' },
    ];

    for (const char of VARIANTS) {
      const url = `${base}${char}.png`;
      if (!(await this.exists(url))) break;
      results.push({ url, label: char.toUpperCase(), variant: char });
    }

    return results;
  }

  /** HEAD request to get Last-Modified date (for Age sort). Returns epoch on failure. */
  async getLastModified(url: string): Promise<Date> {
    try {
      const res = await fetch(url, { method: 'HEAD' });
      const lm = res.headers.get('Last-Modified');
      return lm ? new Date(lm) : new Date(0);
    } catch {
      return new Date(0);
    }
  }

  private async exists(url: string): Promise<boolean> {
    try {
      const res = await fetch(url, { method: 'HEAD' });
      return res.ok;
    } catch {
      return false;
    }
  }
}
