import { ChangeDetectionStrategy, Component, effect, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { injectStore } from 'angular-three';
import { NgtrPhysics } from 'angular-three-rapier';
import { NgtsPointerLockControls } from 'angular-three-soba/controls';
import { filter, fromEvent, merge, scan } from 'rxjs';
import { Euler } from 'three';
import { FloorComponent } from './entities/floor.component';
import { PlayerComponent } from './entities/player.component';
import { RoofComponent } from './entities/roof.component';
import { WallComponent } from './entities/wall.component';
import { generateDungeonLayout } from './utils/generate-dungeon';

@Component({
  selector: 'dungeon-scene',
  template: `
    <ngtr-physics [options]="{ gravity: [0, -9.81, 0], colliders: false }">
      <ng-template>
        <dungeon-floor [layout]="layout" />
        <dungeon-roof [layout]="layout" />
        <dungeon-player [layout]="layout" [wasd]="wasd()" />

        @for (row of layout; track $index; let y = $index) {
          @for (wall of row; track $index; let x = $index) {
            @if (wall === '1') {
              <dungeon-wall [position]="[x - (layout[0].length - 1) / 2, 0.5, y - (layout.length - 1) / 2]" />
            }
          }
        }
      </ng-template>
    </ngtr-physics>

    <ngts-pointer-lock-controls />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgtrPhysics, FloorComponent, RoofComponent, PlayerComponent, WallComponent, NgtsPointerLockControls],
})
export class Dungeon {
  store = injectStore();

  start = output<boolean>();
  layout = generateDungeonLayout(30, 30);

  keydown$ = fromEvent<KeyboardEvent>(document, 'keydown');
  keyup$ = fromEvent<KeyboardEvent>(document, 'keyup');
  wasd$ = merge(this.keydown$, this.keyup$).pipe(
    filter((e) => ['w', 'a', 's', 'd'].includes(e.key.toLowerCase())),
    scan((acc, curr) => {
      if (curr.type === 'keyup') acc.delete(curr.key.toLowerCase());
      if (curr.type === 'keydown') acc.add(curr.key.toLowerCase());
      return acc;
    }, new Set<string>()),
  );
  wasd = toSignal(this.wasd$, { initialValue: new Set<string>() });

  constructor() {
    // set default camera angle
    effect(() => {
      const euler = new Euler(0, -(Math.PI / 2), 0, 'YXZ');
      this.store.camera().quaternion.setFromEuler(euler);
    });
  }
}
