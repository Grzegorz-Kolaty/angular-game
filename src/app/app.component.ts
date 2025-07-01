import { Component, inject } from '@angular/core';
import { NgtCanvas } from 'angular-three/dom';
import { Dungeon } from './dungeon/dungeon.component';
import { GameService } from './shared/data-access/game.service';
import { FancyTextComponent } from './shared/ui/fancy-text.component';

@Component({
  selector: 'app-root',
  template: `
    <ngt-canvas>
      <dungeon-scene (start)="onCreate()" *canvasContent />
    </ngt-canvas>
    <app-fancy-text [text]="gameService.flashText()" />
  `,
  host: { class: 'block h-dvh w-full' },
  imports: [NgtCanvas, Dungeon, FancyTextComponent],
})
export class AppComponent {
  gameService = inject(GameService);

  onCreate() {
    console.log('create');
  }
}
