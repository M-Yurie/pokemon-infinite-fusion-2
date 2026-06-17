import { Routes } from '@angular/router';

export const DOWNLOAD_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./download').then((m) => m.Download),
  },
];
