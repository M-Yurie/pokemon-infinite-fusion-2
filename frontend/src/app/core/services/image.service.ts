import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ImageService {
  getSpritePosition(headId: number, bodyId: number): { x: number; y: number } {
    const col = bodyId % 10 === 0 ? 10 : bodyId % 10;
    const row = Math.ceil(bodyId / 10);
    return { x: (col - 1) * 192, y: (row - 1) * 192 };
  }

  getSpriteSheetStyle(headId: number, bodyId: number): Record<string, string> {
    const { x, y } = this.getSpritePosition(headId, bodyId);
    return {
      'background-image':    `url('/assets/sprites/generated/${headId}.png')`,
      'background-repeat':   'no-repeat',
      'background-size':     '1920px auto',
      'background-position': `-${x}px -${y}px`,
      'image-rendering':     'pixelated',
    };
  }

  // Count existing custom sprites (default + variants a–z). Stops at first 404.
  async getSpriteCount(headId: number, bodyId: number): Promise<number> {
    const base = `/assets/sprites/custom/${headId}.${bodyId}`;
    if (!(await this.exists(`${base}.png`))) return 0;

    let count = 1;
    for (const char of 'abcdefghijklmnopqrstuvwxyz') {
      if (!(await this.exists(`${base}${char}.png`))) break;
      count++;
      if (count >= 10) break; // display cap: "+"
    }
    return count;
  }

  // Returns all custom sprite URLs for a fusion.
  async getCustomSpriteUrls(headId: number, bodyId: number): Promise<string[]> {
    const base = `/assets/sprites/custom/${headId}.${bodyId}`;
    const baseUrl = `${base}.png`;
    if (!(await this.exists(baseUrl))) return [];

    const urls: string[] = [baseUrl];
    for (const char of 'abcdefghijklmnopqrstuvwxyz') {
      const url = `${base}${char}.png`;
      if (!(await this.exists(url))) break;
      urls.push(url);
    }
    return urls;
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
