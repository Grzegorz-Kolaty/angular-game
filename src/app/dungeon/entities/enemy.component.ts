import {
  ChangeDetectionStrategy,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  input,
  output,
  viewChild,
} from '@angular/core';
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
      [options]="{ mass: 1, enabledRotations: [false, false, false], canSleep: false }"
    >
      <ngt-mesh>
        <ngt-box-geometry *args="[0.1, 0.1, 0.1]" />
        <ngt-mesh-basic-material color="purple" />
      </ngt-mesh>

      <ngt-object3D [cuboidCollider]="[0.06, 0.06, 0.06]" (collisionEnter)="onCollision($event)" />
    </ngt-object3D>
  `,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [NgtrCuboidCollider, NgtrRigidBody, NgtArgs],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnemyComponent {
  layout = input.required<string[][]>();
  caught = output<NgtrCollisionEnterPayload>();
  enemy = viewChild.required<NgtrRigidBody>('enemy');
  enemyStartPosition = computed(() => this.getEnemyStartPosition(this.layout()));

  constructor() {
    extend({ Object3D });

    beforeRender(({ camera }) => {
      const body = this.enemy().rigidBody();
      if (!body) return;

      const grid = this.layout();
      const H = grid.length;
      const W = grid[0].length;

      // player grid cell (clamped + walkable check)
      const { gx: px, gy: py } = this.toGrid(camera.position.x, camera.position.z, W, H);
      if (!grid[py]?.[px] || grid[py][px] === '1') {
        // player outside maze or in a wall -> pause chase
        body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        body.wakeUp();
        return;
      }

      const distToP = computeDistanceMap(grid, px, py);

      // enemy grid cell
      const t = body.translation();
      const { gx: ex, gy: ey } = this.toGrid(t.x, t.z, W, H);
      const here = distToP[ey]?.[ex];
      if (here === undefined || here === Infinity) {
        body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        body.wakeUp();
        return;
      }

      // If very close (same tile or adjacent), chase the player's actual world position
      if (here <= 1) {
        const toPlayer = new Vector3(camera.position.x - t.x, 0, camera.position.z - t.z);
        const d = toPlayer.length();
        if (d > 1e-3) {
          toPlayer.normalize();
          // small "arrive" so we don't stall just before touching
          const speed = Math.min(2.0, 0.8 + d * 2.0);
          body.setLinvel({ x: toPlayer.x * speed, y: 0, z: toPlayer.z * speed }, true);
          body.wakeUp();
        }
        return;
      }

      // Otherwise follow the downhill neighbor in the distance field (toward cell centers)
      const dirs: [number, number][] = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ];
      let bestX = ex,
        bestY = ey,
        bestD = here;
      for (const [dx, dy] of dirs) {
        const nx = ex + dx,
          ny = ey + dy;
        const d = distToP[ny]?.[nx];
        if (d !== undefined && d < bestD) {
          bestD = d;
          bestX = nx;
          bestY = ny;
        }
      }

      if (bestD < here) {
        const target = this.toWorld(bestX, bestY, W, H);
        const toCell = new Vector3(target.x - t.x, 0, target.z - t.z);
        const d = toCell.length();
        if (d > 1e-3) {
          toCell.normalize();
          const speed = Math.min(1.5, 0.6 + d * 1.0); // a touch faster when farther
          body.setLinvel({ x: toCell.x * speed, y: 0, z: toCell.z * speed }, true);
        } else {
          body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        }
        body.wakeUp();
      } else {
        body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        body.wakeUp();
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
    return { x: worldX, y: 0.5, z: worldZ };
  }

  onCollision(ev: NgtrCollisionEnterPayload) {
    if (ev.other.rigidBody) {
      this.caught.emit(ev);
    }
  }

  private toGrid(x: number, z: number, W: number, H: number) {
    // floor maps every point in a cell to that cell; centers are at .5 in world space
    return { gx: Math.floor(x + W / 2), gy: Math.floor(z + H / 2) };
  }
  private toWorld(gx: number, gy: number, W: number, H: number) {
    // center of a grid cell
    return { x: gx - W / 2 + 0.5, z: gy - H / 2 + 0.5 };
  }
}
