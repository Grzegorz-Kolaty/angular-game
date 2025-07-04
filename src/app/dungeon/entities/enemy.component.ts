import { ChangeDetectionStrategy, Component, computed, CUSTOM_ELEMENTS_SCHEMA, input, viewChild } from '@angular/core';
import { beforeRender, extend, NgtArgs } from 'angular-three';
import { NgtrCollisionEnterPayload, NgtrCuboidCollider, NgtrRigidBody } from 'angular-three-rapier';
import { Object3D, Vector3 } from 'three';
import { computeDistanceMap } from '../utils/generate-dungeon';

@Component({
  selector: 'dungeon-enemy',
  template: `
    <ngt-object3D
      #enemy
      rigidBody
      [position]="[enemyStartPosition().x, enemyStartPosition().y, enemyStartPosition().z]"
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
  enemyStartPosition = computed(() => this.getEnemyStartPosition(this.layout()));

  constructor() {
    extend({ Object3D });

    // each frame, if the player is inside, chase them via a simple BFS path-follow
    beforeRender(({ delta, camera }) => {
      const body = this.enemy().rigidBody();
      if (!body) return;

      const grid = this.layout();
      const H = grid.length;
      const W = grid[0].length;
      // do not move until the player has entered (x<=0 means inside maze)
      if (camera.position.x > 0) {
        body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        return;
      }

      // BFS distance from player
      const px = Math.round(camera.position.x + (W - 1) / 2);
      const py = Math.round(camera.position.z + (H - 1) / 2);
      const distToP = computeDistanceMap(grid, px, py);

      // enemy's grid cell
      const t = body.translation();
      const ex = Math.round(t.x + (W - 1) / 2);
      const ey = Math.round(t.z + (H - 1) / 2);

      // find neighbor with smallest distance
      const dirs: [number, number][] = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ];
      let bestX = ex;
      let bestY = ey;
      let bestD = distToP[ey]?.[ex] ?? Infinity;
      for (const [dx, dy] of dirs) {
        const nx = ex + dx;
        const ny = ey + dy;
        const d = distToP[ny]?.[nx];
        if (d !== undefined && d < bestD) {
          bestD = d;
          bestX = nx;
          bestY = ny;
        }
      }
      // step toward that neighbor
      if (bestD < (distToP[ey]?.[ex] ?? Infinity)) {
        const targetX = bestX - (W - 1) / 2;
        const targetZ = bestY - (H - 1) / 2;
        const dir = new Vector3(targetX - t.x, 0, targetZ - t.z).normalize();
        body.setLinvel({ x: dir.x * 1.5, y: 0, z: dir.z * 1.5 }, true);
      } else {
        body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      }
    });
  }

  getEnemyStartPosition(grid: string[][]) {
    const H = grid.length;
    const W = grid[0].length;
    const entranceY = Math.floor(H / 2);
    const distMap = computeDistanceMap(grid, 1, entranceY);
    let maxD = -1;
    let sx = 1;
    let sy = entranceY;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const d = distMap[y][x];
        if (d !== Infinity && d > maxD) {
          maxD = d;
          sx = x;
          sy = y;
        }
      }
    }
    const worldX = sx - (W - 1) / 2;
    const worldZ = sy - (H - 1) / 2;
    console.log(worldX, 0.5, worldZ);
    return { x: worldX, y: 0.5, z: worldZ };
  }

  onCollision(ev: NgtrCollisionEnterPayload) {
    // TODO: handle player collision (e.g. game over)
    console.log('Enemy collided with', ev.other);
  }
}
