import { ChangeDetectionStrategy, Component, effect, output } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { extend, injectStore } from 'angular-three';
import { NgtrPhysics } from 'angular-three-rapier';
import { filter, fromEvent, merge, scan, startWith } from 'rxjs';
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
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgtrPhysics, FloorComponent, RoofComponent, PlayerComponent, WallComponent],
})
export class Dungeon {
  start = output<boolean>();
  layout = generateDungeonLayout(30, 30);
  store = injectStore();

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
    extend({});

    // pointer lock
    effect(() => {
      const renderer = this.store.gl();
      if (!renderer) return;

      const onClick = () => {
        renderer.domElement.requestPointerLock();
      };
      renderer.domElement.addEventListener('click', onClick);

      return () => {
        renderer.domElement.removeEventListener('click', onClick);
      };
    });

    // mouse look
    fromEvent<PointerEvent>(document, 'pointermove')
      .pipe(startWith(null), takeUntilDestroyed())
      .subscribe((event) => {
        const camera = this.store.camera();
        const renderer = this.store.gl();
        const PI_2 = Math.PI / 2;
        if (event === null) {
          const euler = new Euler(0, -PI_2, 0, 'YXZ');
          camera.quaternion.setFromEuler(euler);
          return;
        }

        if (!camera || !renderer || document.pointerLockElement !== renderer.domElement) return;

        const euler = new Euler(0, 0, 0, 'YXZ');
        euler.setFromQuaternion(camera.quaternion);
        euler.y -= event.movementX * 0.002;
        euler.x -= event.movementY * 0.002;
        euler.x = Math.max(-PI_2, Math.min(PI_2, euler.x));
        camera.quaternion.setFromEuler(euler);
      });
  }
}
