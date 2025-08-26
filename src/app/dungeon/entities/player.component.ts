import {NgtrCuboidCollider, NgtrRigidBody} from "angular-three-rapier";
import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  EventEmitter, input,
  Output,
  viewChild
} from "@angular/core";
import {beforeRender, extend} from "angular-three";
import {Object3D, Vector3} from "three";

@Component({
  selector: 'dungeon-player',
  template: `
    <ngt-object3D
      #player
      rigidBody
      [position]="[-(layout().length / 2) - 1, 0.5, 0.5]"
      [options]="{ mass: 1, enabledRotations: [false, false, false] }"
    >
      <ngt-object3D [cuboidCollider]="[0.2, 0.2, 0.2]" />
    </ngt-object3D>
  `,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [NgtrCuboidCollider, NgtrRigidBody],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerComponent {
  @Output() positionChange = new EventEmitter<[number, number, number]>();

  layout = input.required<string[][]>();
  wasd = input.required<Set<string>>();

  player = viewChild<NgtrRigidBody>('player');

  // <-- Deklaracja lastPos
  private lastPos: [number, number, number] = [-9999, -9999, -9999];

  constructor() {
    extend({ Object3D });

    beforeRender(({ delta, camera }) => {
      const body = this.player()?.rigidBody();
      if (!body) return;

      const pos = body.translation();
      const currentPos: [number, number, number] = [pos.x, pos.y, pos.z];

      // Emituj tylko, jeśli pozycja faktycznie się zmieniła
      if (
          currentPos[0] !== this.lastPos[0] ||
          currentPos[1] !== this.lastPos[1] ||
          currentPos[2] !== this.lastPos[2]
      ) {
        this.lastPos = currentPos;
        this.positionChange.emit(currentPos);
      }

      // Ruch gracza
      const dir = new Vector3();
      const wasd = this.wasd();
      if (wasd.has('KeyW') || wasd.has('ArrowUp')) dir.z -= 1;
      if (wasd.has('KeyS') || wasd.has('ArrowDown')) dir.z += 1;
      if (wasd.has('KeyA') || wasd.has('ArrowLeft')) dir.x -= 1;
      if (wasd.has('KeyD') || wasd.has('ArrowRight')) dir.x += 1;

      if (dir.lengthSq()) {
        dir.normalize().multiplyScalar(100 * delta).applyQuaternion(camera.quaternion);
        body.setLinvel({ x: dir.x, y: 0, z: dir.z }, true);
      } else {
        body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      }

      // Synchronizacja kamery
      camera.position.set(pos.x, pos.y, pos.z);
    });
  }
}
