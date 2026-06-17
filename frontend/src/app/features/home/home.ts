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
      title: 'Open World Exploration',
      subtitle: 'Roam the living Hoenn region',
      imageUrl: 'https://images.unsplash.com/photo-1646364437169-4bef277201c6?w=800',
    },
    {
      title: 'Lush Environments',
      subtitle: 'Every route breathes with life',
      imageUrl: 'https://images.unsplash.com/photo-1633097833600-b1cf6e3a831a?w=800',
    },
    {
      title: 'Crystal Fusion System',
      subtitle: 'Prismatic power at your command',
      imageUrl: 'https://images.unsplash.com/photo-1521133573892-e44906baee46?w=800',
    },
    {
      title: 'A World Beyond Limits',
      subtitle: 'Journey under the aurora skies',
      imageUrl: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=800',
    },
  ];

  readonly features: FeatureItem[] = [
    {
      title: 'Open World Exploration',
      description:
        'Roam a fully reimagined Hoenn region with seamless areas, hidden secrets, and dynamic weather systems.',
      colorRgb: '121, 223, 255',
    },
    {
      title: 'Walking Pokémon',
      description:
        'Every Pokémon in your party follows you through the world, reacting to the environment around them.',
      colorRgb: '110, 231, 183',
    },
    {
      title: 'Modern Battle System',
      description:
        'A completely rebuilt battle engine with animated moves, smart AI, and a revamped competitive meta.',
      colorRgb: '255, 139, 207',
    },
    {
      title: 'Fusion Mechanics',
      description:
        'Combine any two Pokémon into a never-before-seen fusion with unique sprites, stats, and movesets.',
      colorRgb: '124, 108, 255',
    },
    {
      title: 'Quality of Life',
      description:
        'Box anywhere, auto-battle, summary search, and dozens of modern improvements for the best experience.',
      colorRgb: '255, 212, 107',
    },
    {
      title: 'Beautiful Pixel Art',
      description:
        'Thousands of hand-crafted fusion sprites and overworld tiles. Every pixel placed with intention.',
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
