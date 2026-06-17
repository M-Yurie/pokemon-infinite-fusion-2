import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-modal',
  imports: [],
  templateUrl: './modal.html',
  styleUrl: './modal.scss',
})
export class Modal {
  isOpen = input(false);
  closed = output<void>();

  close(): void {
    this.closed.emit();
  }
}
