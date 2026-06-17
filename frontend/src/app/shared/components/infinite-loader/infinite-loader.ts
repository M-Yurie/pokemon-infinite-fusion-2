import { Component, output, OnInit, OnDestroy, ElementRef, viewChild } from '@angular/core';
import { LoadingSpinner } from '../loading-spinner/loading-spinner';

@Component({
  selector: 'app-infinite-loader',
  imports: [LoadingSpinner],
  templateUrl: './infinite-loader.html',
  styleUrl: './infinite-loader.scss',
})
export class InfiniteLoader implements OnInit, OnDestroy {
  loadMore = output<void>();

  private sentinel = viewChild<ElementRef>('sentinel');
  private observer?: IntersectionObserver;

  ngOnInit(): void {
    this.observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        this.loadMore.emit();
      }
    });

    const el = this.sentinel();
    if (el) {
      this.observer.observe(el.nativeElement);
    }
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
