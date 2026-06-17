import { Routes } from '@angular/router';
import { MainLayout } from './layout/main-layout/main-layout';

export const routes: Routes = [
  {
    path: '',
    component: MainLayout,
    children: [
      {
        path: '',
        loadChildren: () =>
          import('./features/home/home.routes').then((m) => m.HOME_ROUTES),
      },
      {
        path: 'download',
        loadChildren: () =>
          import('./features/download/download.routes').then(
            (m) => m.DOWNLOAD_ROUTES,
          ),
      },
      {
        path: 'dex',
        loadChildren: () =>
          import('./features/dex/dex.routes').then((m) => m.DEX_ROUTES),
      },
      {
        path: 'details/:id',
        loadChildren: () =>
          import('./features/pokemon/pokemon.routes').then(
            (m) => m.POKEMON_ROUTES,
          ),
      },
      {
        path: 'faq',
        loadChildren: () =>
          import('./features/faq/faq.routes').then((m) => m.FAQ_ROUTES),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
