import { Component } from '@angular/core';
import { NgtCanvas } from 'angular-three/dom';
import { Dungeon } from './dungeon/dungeon.component';
import { FancyTextComponent } from './shared/ui/fancy-text.component';

@Component({
  selector: 'app-root',
  template: `
    <ngt-canvas>
      <dungeon-scene (start)="onCreate()" *canvasContent />
    </ngt-canvas>
    <app-fancy-text text="Enter. Find the artifacts. Escape." />
  `,
  host: { class: 'block h-dvh w-full' },
  imports: [NgtCanvas, Dungeon, FancyTextComponent],
})
export class AppComponent {
  onCreate() {
    console.log('!!!!!!');
  }
}
