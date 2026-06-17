import { Routes } from '@angular/router';

export const DEX_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./dex').then((m) => m.Dex),
  },
];
