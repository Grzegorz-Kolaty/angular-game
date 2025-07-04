import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, input, viewChild } from '@angular/core';
import { beforeRender, extend, NgtArgs } from 'angular-three';
import { NgtrCollisionEnterPayload, NgtrCuboidCollider, NgtrRigidBody } from 'angular-three-rapier';
import { Object3D, Vector3 } from 'three';

@Component({
  selector: 'dungeon-enemy',
  template: `
    <ngt-object3D
      #enemy
      rigidBody
      [position]="[-(layout().length / 2) - 1, 0.5, 3.5]"
      [options]="{ mass: 1, enabledRotations: [false, false, false] }"
    >
      <ngt-mesh>
        <ngt-box-geometry *args="[0.1, 0.1, 0.1]" />
        <ngt-mesh-basic-material color="purple" />
      </ngt-mesh>

      <ngt-object3D [cuboidCollider]="[0.05, 0.05, 0.05]" (collisionEnter)="onCollision($event)" />
    </ngt-object3D>
  `,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [NgtrCuboidCollider, NgtrRigidBody, NgtArgs],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnemyComponent {
  layout = input.required<string[][]>();
  enemy = viewChild.required<NgtrRigidBody>('enemy');

  constructor() {
    extend({ Object3D });

    beforeRender(({ delta, camera }) => {
      const body = this.enemy().rigidBody();
      if (!body) return;

      // movement input relative to camera orientation
      const dir = new Vector3();
      // TODO: create random walking movement
      // const wasd = this.wasd();
      // if (wasd.has('w')) dir.z -= 1;
      // if (wasd.has('s')) dir.z += 1;
      // if (wasd.has('a')) dir.x -= 1;
      // if (wasd.has('d')) dir.x += 1;

      if (dir.lengthSq()) {
        dir
          .normalize()
          .multiplyScalar(100 * delta)
          .applyQuaternion(camera.quaternion);
        body.setLinvel({ x: dir.x, y: 0, z: dir.z }, true);
      } else {
        body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      }
    });
  }

  onCollision(ev: NgtrCollisionEnterPayload) {
    console.log(ev.other);
    console.log('trigger game over');
  }
}
