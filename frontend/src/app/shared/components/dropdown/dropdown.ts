import { Component, input, output, signal } from '@angular/core';

export interface DropdownOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-dropdown',
  imports: [],
  templateUrl: './dropdown.html',
  styleUrl: './dropdown.scss',
})
export class Dropdown {
  options = input<DropdownOption[]>([]);
  selected = input<string | null>(null);
  placeholder = input('Select...');
  selectedChange = output<string>();

  isOpen = signal(false);

  toggle(): void {
    this.isOpen.update((v) => !v);
  }

  select(value: string): void {
    this.selectedChange.emit(value);
    this.isOpen.set(false);
  }

  get selectedLabel(): string {
    return (
      this.options().find((o) => o.value === this.selected())?.label ??
      this.placeholder()
    );
  }
}
