import { Component, AfterViewInit, OnDestroy, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';

export interface GalleryItem {
  title: string;
  subtitle: string;
  imageUrl: string;
}

export interface FeatureItem {
  title: string;
  description: string;
  colorRgb: string;
}

export interface NewsItem {
  tag: string;
  tagClass: string;
  date: string;
  title: string;
  summary: string;
}

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements AfterViewInit, OnDestroy {
  private readonly sanitizer = inject(DomSanitizer);

  readonly trailerUrl: SafeResourceUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
    'https://www.youtube.com/embed/EAoklAoVwAw?rel=0&modestbranding=1&color=white',
  );

  readonly galleryItems: GalleryItem[] = [
    {
      title: 'The Fusion Index',
      subtitle: 'Discover thousands of unique fusion combinations',
      imageUrl: 'assets/images/gallery-1.jpg',
    },
    {
      title: 'Hoenn Overworld',
      subtitle: 'Explore the vibrant Hoenn region like never before',
      imageUrl: 'assets/images/gallery-2.jpg',
    },
    {
      title: 'Starter Fusions',
      subtitle: 'Meet the new Hoenn starters and their fusions',
      imageUrl: 'assets/images/gallery-3.jpg',
    },
    {
      title: 'Dynamic Weather',
      subtitle: 'A living world that changes around you',
      imageUrl: 'assets/images/gallery-4.jpg',
    },
  ];

  readonly features: FeatureItem[] = [
    {
      title: 'Fusion Mechanics',
      description: 'Combine any two Pokémon to create unique fusions, with over 327,000 possible combinations.',
      colorRgb: '124, 108, 255',
    },
    {
      title: 'Overworld Encounters',
      description: 'Wild Pokémon appear directly in the overworld, reacting to the player instead of random hidden encounters.',
      colorRgb: '110, 231, 183',
    },
    {
      title: 'Dynamic Weather',
      description: 'Weather changes dynamically across Hoenn, affecting which Pokémon appear in the wild.',
      colorRgb: '121, 223, 255',
    },
    {
      title: 'Save File Integration',
      description: 'Transfer your team to and from the original Pokémon Infinite Fusion using a special PC box feature.',
      colorRgb: '255, 212, 107',
    },
    {
      title: 'Modern Battle System',
      description: 'A completely rebuilt battle engine with animated moves, smart AI, and a revamped competitive meta.',
      colorRgb: '255, 139, 207',
    },
    {
      title: 'Beautiful Pixel Art',
      description: 'Over 230,000 community-made fusion sprites, every pixel placed with intention.',
      colorRgb: '255, 139, 207',
    },
  ];

  readonly news: NewsItem[] = [
    {
      tag: 'Development Update',
      tagClass: 'tag--dev',
      date: 'June 10, 2026',
      title: 'Fusion Sprite Database Reaches 10,000 Entries',
      summary:
        'The sprite team has crossed a major milestone — over 10,000 unique fusion sprites are now complete, covering every possible combination in the Hoenn Pokédex.',
    },
    {
      tag: 'Community',
      tagClass: 'tag--community',
      date: 'May 24, 2026',
      title: 'Open Beta Feedback Summary & What Comes Next',
      summary:
        "We gathered thousands of pieces of feedback from our open beta. Here's a breakdown of what we heard and how it's shaping the final release.",
    },
    {
      tag: 'Release',
      tagClass: 'tag--release',
      date: 'May 2, 2026',
      title: 'Demo v0.7 Released — New Rival Route & Story Content',
      summary:
        'The latest demo drops two brand-new routes, a fully voiced rival encounter, and an improved fusion UI based on community feedback.',
    },
  ];

  private intersectionObserver?: IntersectionObserver;

  ngAfterViewInit(): void {
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' },
    );

    document.querySelectorAll('.anim').forEach((el) => {
      this.intersectionObserver!.observe(el);
    });
  }

  ngOnDestroy(): void {
    this.intersectionObserver?.disconnect();
  }
}
