import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { Screen } from '../../../shared/models/screen.model';
import { ScreenSelectionService } from '../../../core/services/screen-selection.service';

@Component({
  selector: 'app-canvas-viewer',
  standalone: false,
  templateUrl: './canvas-viewer.component.html',
  styleUrls: ['./canvas-viewer.component.scss'],
})
export class CanvasViewerComponent implements OnInit {
  @Input() screens: Screen[] = [];
  @Output() expandScreen = new EventEmitter<Screen>();

  selectedScreen: Screen | null = null;

  constructor(private screenSelection: ScreenSelectionService) {}

  ngOnInit(): void {
    this.screenSelection.selection$.subscribe(screen => {
      this.selectedScreen = screen;
    });
  }

  selectScreen(screen: Screen): void {
    this.screenSelection.selectScreen(screen);
  }

  onExpand(screen: Screen): void {
    this.expandScreen.emit(screen);
  }

  isSelected(screen: Screen): boolean {
    return this.selectedScreen?.id === screen.id;
  }

  trackById(_index: number, screen: Screen): string {
    return screen.id;
  }
}
