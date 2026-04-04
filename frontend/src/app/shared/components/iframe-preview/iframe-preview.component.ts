import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-iframe-preview',
  standalone: false,
  templateUrl: './iframe-preview.component.html',
  styleUrls: ['./iframe-preview.component.scss'],
})
export class IframePreviewComponent implements OnChanges {
  @Input() htmlUrl: string = '';
  @Input() title: string = 'Screen Preview';

  safeUrl: SafeResourceUrl | null = null;

  constructor(private sanitizer: DomSanitizer) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['htmlUrl'] && this.htmlUrl) {
      this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.htmlUrl);
    } else if (!this.htmlUrl) {
      this.safeUrl = null;
    }
  }
}
