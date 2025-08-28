import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, effect } from '@angular/core';
import { gltfResource } from 'angular-three-soba/loaders';
import { NgtrRigidBody } from 'angular-three-rapier';

import canGLB from './can.glb' with { loader: 'file' };

gltfResource.preload(canGLB);

@Component({
  selector: 'app-can',
  template: `
    @if (gltf.value(); as gltf) {
      <ngt-mesh [geometry]="gltf.meshes['Model'].geometry"
                [material]="gltf.meshes['Model'].material"
      />
    }
  `,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CanComponent {
  protected gltf = gltfResource(() => canGLB);

  constructor() {
    effect(() => {
      console.log(this.gltf.value())
    });
  }
}


@Component({
  selector: 'dungeon-model',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgtrRigidBody, CanComponent],
  template: `
    <ngt-group [scale]="0.1" [position]="[-17.67909049987793, 0.29893118143081665, 0.9908236861228943]">
      <ngt-object3D rigidBody [options]="{ colliders: 'ball' }">
          <ngt-ambient-light [intensity]="0.5" />
          <app-can />
      </ngt-object3D>
    </ngt-group>
  `,
})
export class DungeonModelComponent {
}