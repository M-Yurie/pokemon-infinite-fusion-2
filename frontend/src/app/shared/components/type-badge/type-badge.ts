import { Component, input } from '@angular/core';

@Component({
  selector: 'app-type-badge',
  imports: [],
  templateUrl: './type-badge.html',
  styleUrl: './type-badge.scss',
})
export class TypeBadge {
  type = input('');
}
