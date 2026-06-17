import { Component, OnInit, OnDestroy, signal, inject, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { filter, map, startWith } from 'rxjs';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar implements OnInit, OnDestroy {
  private readonly router = inject(Router);

  readonly isScrolled = signal(false);
  readonly isMenuOpen = signal(false);

  private readonly url$ = this.router.events.pipe(
    filter((e): e is NavigationEnd => e instanceof NavigationEnd),
    map((e) => e.urlAfterRedirects),
    startWith(this.router.url),
  );

  private readonly currentUrl = toSignal(this.url$, { initialValue: this.router.url });

  // true only on the homepage — all other routes get a permanent solid navbar
  readonly isHomePage = computed(() => this.currentUrl() === '/');

  private readonly onScroll = () => this.isScrolled.set(window.scrollY > 60);

  ngOnInit(): void {
    window.addEventListener('scroll', this.onScroll, { passive: true });
  }

  ngOnDestroy(): void {
    window.removeEventListener('scroll', this.onScroll);
  }

  toggleMenu(): void {
    this.isMenuOpen.update((v) => !v);
  }

  closeMenu(): void {
    this.isMenuOpen.set(false);
  }
}
