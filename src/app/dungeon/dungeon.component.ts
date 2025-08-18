import { ChangeDetectionStrategy, Component, computed, effect, inject, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { injectStore } from 'angular-three';
import { NgtrPhysics } from 'angular-three-rapier';
import { NgtsPointerLockControls } from 'angular-three-soba/controls';
import { filter, fromEvent, merge, scan } from 'rxjs';
import { Euler } from 'three';
import { GameService } from '../shared/data-access/game.service';
import { EnemyComponent } from './entities/enemy.component';
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
        <dungeon-enemy [layout]="layout" (caught)="gameOver.set(true)" />

        @for (row of layout; track $index; let y = $index) {
          @for (wall of row; track $index; let x = $index) {
            @if (wall === '1') {
              <dungeon-wall [position]="[x - (layout[0].length - 1) / 2, 0.5, y - (layout.length - 1) / 2]" />
            }
            @if (remainingDeadEnds()[x]; as deadEndRow) {
              @if (deadEndRow[y]) {
                <dungeon-trigger
                  (intersectionEnter)="collectArtifact(x, y)"
                  [transparency]="0.3"
                  [position]="[x - (layout[0].length - 1) / 2, 0.5, y - (layout.length - 1) / 2]"
                />
              }
            }
          }
        }

        <!-- entrance -->
        <dungeon-trigger
          [transparency]="0"
          [position]="[-this.entrance + 1.5, 0.5, 0.5]"
          (intersectionExit)="onEntranceExit()"
        />
        @if (entranceClosed()) {
          <dungeon-wall [position]="[-this.entrance - 0.5, 0.5, 0.5]" />
        }
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
    EnemyComponent,
    WallComponent,
    TriggerComponent,
    NgtsPointerLockControls,
  ],
})
export class Dungeon {
  start = output<boolean>();

  store = injectStore();
  gameService = inject(GameService);
  entranceClosed = signal<null | boolean>(null);
  gameOver = signal(false);

  layout = generateDungeonLayout(30, 30);
  entrance = Math.floor(this.layout.length / 2);
  requiredArtifacts = 2;

  initialDeadEnds = (() => {
    const grid = getDeadEnds(this.layout);
    const coords = grid.flatMap((col, x) => col.flatMap((v, y) => (v && y !== this.entrance ? [[x, y]] : [])));
    const picks = coords.sort(() => Math.random() - 0.5).slice(0, 3);
    return grid.map((col, x) => col.map((_, y) => picks.some(([px, py]) => px === x && py === y)));
  })();

  remainingDeadEnds = computed(() => {
    const collected = this.gameService.collectedArtifacts();
    return this.initialDeadEnds.map((col, x) =>
      col.map((isEnd, y) => isEnd && !collected.some(([cx, cy]) => cx === x && cy === y)),
    );
  });

  keyCodes = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight']);

  keydown$ = fromEvent<KeyboardEvent>(document, 'keydown');
  keyup$ = fromEvent<KeyboardEvent>(document, 'keyup');
  wasd$ = merge(this.keydown$, this.keyup$).pipe(
    filter((e) => this.keyCodes.has(e.code)),
    scan((prev, curr) => {
      const next = new Set(prev);
      if (curr.type === 'keydown') next.add(curr.code);
      else next.delete(curr.code);
      return next;
    }, new Set<string>()),
  );
  wasd = toSignal(this.wasd$, { initialValue: new Set<string>() });

  constructor() {
    // set default camera angle
    effect(() => {
      const euler = new Euler(0, -(Math.PI / 2), 0, 'YXZ');
      this.store.camera().quaternion.setFromEuler(euler);
    });

    effect(() => {
      const gameOver = this.gameOver();
      if (!gameOver) return;

      this.gameService.flashText.set('The exit has been sealed');
      // hack to make it unwinnable
      this.requiredArtifacts = 50;
      this.entranceClosed.set(true);
    });
  }

  onEntranceExit() {
    if (this.entranceClosed() === null) {
      this.entranceClosed.set(true);
      this.gameService.flashText.set('Find the artifacts... do not get caught.');
    }
  }

  collectArtifact(x: number, y: number) {
    this.gameService.collectedArtifacts.update((artifacts) => [...artifacts, [x, y]]);
    const remaining = this.requiredArtifacts - this.gameService.artifactsCollected();
    if (remaining > 0) {
      this.gameService.flashText.set(
        `${remaining} artifact${remaining > 1 ? 's' : ''} remain${remaining > 1 ? '' : 's'}`,
      );
    } else {
      this.entranceClosed.set(false);
      this.gameService.flashText.set('The passage is open. Escape.');
    }
  }
}
