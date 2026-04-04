import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable, map, catchError, of } from 'rxjs';
import { ApiService } from '../services/api.service';
import { SessionService } from '../services/session.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(
    private api: ApiService,
    private session: SessionService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean | UrlTree> {
    return this.api.getSessionStatus().pipe(
      map(status => {
        if (status.authenticated) {
          this.session.setAuthenticated(status.default_project_id ?? null);
          return true;
        }
        return this.router.createUrlTree(['/onboarding']);
      }),
      catchError(() => {
        return of(this.router.createUrlTree(['/onboarding']));
      })
    );
  }
}
