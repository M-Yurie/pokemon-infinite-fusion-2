import { Routes } from '@angular/router';

export const POKEMON_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pokemon').then((m) => m.Pokemon),
  },
];
