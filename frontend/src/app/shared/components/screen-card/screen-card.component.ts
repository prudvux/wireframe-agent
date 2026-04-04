import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Screen } from '../../models/screen.model';

@Component({
  selector: 'app-screen-card',
  standalone: false,
  templateUrl: './screen-card.component.html',
  styleUrls: ['./screen-card.component.scss'],
})
export class ScreenCardComponent {
  @Input() screen!: Screen;
  @Input() selected: boolean = false;
  @Output() cardClick = new EventEmitter<Screen>();
  @Output() expandClick = new EventEmitter<Screen>();

  onCardClick(): void {
    this.cardClick.emit(this.screen);
  }

  onExpandClick(event: MouseEvent): void {
    event.stopPropagation();
    this.expandClick.emit(this.screen);
  }

  get formattedDate(): string {
    if (!this.screen?.created_at) return '';
    const date = new Date(this.screen.created_at);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  get truncatedPrompt(): string {
    const maxLen = 80;
    if (!this.screen?.prompt) return '';
    return this.screen.prompt.length > maxLen
      ? this.screen.prompt.substring(0, maxLen) + '...'
      : this.screen.prompt;
  }
}
