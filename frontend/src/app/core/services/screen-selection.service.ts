import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Screen } from '../../shared/models/screen.model';

@Injectable({ providedIn: 'root' })
export class ScreenSelectionService {
  private selectedScreen$ = new BehaviorSubject<Screen | null>(null);

  get selection$(): Observable<Screen | null> {
    return this.selectedScreen$.asObservable();
  }

  get selectedScreen(): Screen | null {
    return this.selectedScreen$.value;
  }

  selectScreen(screen: Screen): void {
    this.selectedScreen$.next(screen);
  }

  clearSelection(): void {
    this.selectedScreen$.next(null);
  }
}
