import { ChangeDetectionStrategy, Component, effect, inject, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { injectStore } from 'angular-three';
import { NgtrPhysics } from 'angular-three-rapier';
import { NgtsPointerLockControls } from 'angular-three-soba/controls';
import { filter, fromEvent, merge, scan } from 'rxjs';
import { Euler } from 'three';
import { GameService } from '../shared/data-access/game.service';
import { FloorComponent } from './entities/floor.component';
import { PlayerComponent } from './entities/player.component';
import { RoofComponent } from './entities/roof.component';
import { TriggerComponent } from './entities/trigger.component';
import { WallComponent } from './entities/wall.component';
import { generateDungeonLayout, getDeadEnds } from './utils/generate-dungeon';

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
            @if (deadEnds[x]; as deadEndRow) {
              @if (deadEndRow[y]) {
                <dungeon-trigger [position]="[x - (layout[0].length - 1) / 2, 0.5, y - (layout.length - 1) / 2]" />
              }
            }
          }
        }

        <!-- entrance -->
        <dungeon-trigger [position]="[-this.entrance + 1.5, 0.5, 0.5]" (intersectionExit)="onEntranceExit()" />
        @if (entranceClosed()) {
          <dungeon-wall [position]="[-this.entrance - 0.5, 0.5, 0.5]" />
        }

        <!-- dead end cubes -->
      </ng-template>
    </ngtr-physics>

    <ngts-pointer-lock-controls />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgtrPhysics,
    FloorComponent,
    RoofComponent,
    PlayerComponent,
    WallComponent,
    TriggerComponent,
    NgtsPointerLockControls,
  ],
})
export class Dungeon {
  start = output<boolean>();

  store = injectStore();
  gameService = inject(GameService);
  entranceClosed = signal(false);

  layout = generateDungeonLayout(30, 30);
  entrance = Math.floor(this.layout.length / 2);
  deadEnds = getDeadEnds(this.layout).map((x) => (!x[this.entrance] ? x : false));

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

  onEntranceExit() {
    this.entranceClosed.set(true);
    this.gameService.flashText.set('Find the artifacts... do not get caught.');
  }
}
