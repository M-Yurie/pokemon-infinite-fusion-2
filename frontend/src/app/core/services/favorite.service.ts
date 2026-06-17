import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'dex_favorites';

@Injectable({ providedIn: 'root' })
export class FavoriteService {
  readonly favorites = signal<string[]>(this.fromStorage());

  toggle(fusionId: string): void {
    this.favorites.update(prev => {
      const next = prev.includes(fusionId)
        ? prev.filter(id => id !== fusionId)
        : [...prev, fusionId];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  isFavorite(fusionId: string): boolean {
    return this.favorites().includes(fusionId);
  }

  getAll(): string[] { return this.favorites(); }

  private fromStorage(): string[] {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as string[];
    } catch {
      return [];
    }
  }
}
