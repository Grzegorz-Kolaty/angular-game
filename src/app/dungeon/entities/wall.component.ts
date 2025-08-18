import { ChangeDetectionStrategy, Component, computed, CUSTOM_ELEMENTS_SCHEMA, effect, input } from '@angular/core';
import { extend } from 'angular-three';
import { NgtrCuboidCollider, NgtrRigidBody } from 'angular-three-rapier';
import { textureResource } from 'angular-three-soba/loaders';
import { BoxGeometry, Mesh, MeshBasicMaterial, NearestFilter, Object3D, RepeatWrapping, Vector3 } from 'three';

@Component({
  selector: 'dungeon-wall',
  template: `
    <ngt-object3D rigidBody="fixed" [position]="positionVector()">
      <ngt-mesh>
        <ngt-box-geometry />
        <ngt-mesh-basic-material [map]="wallMap()" [transparent]="true" [opacity]="0.3" />
      </ngt-mesh>

      <ngt-object3D [cuboidCollider]="[0.5, 0.5, 0.5]" />
    </ngt-object3D>
  `,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [NgtrCuboidCollider, NgtrRigidBody],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WallComponent {
  position = input.required<[number, number, number]>();
  positionVector = computed(() => new Vector3(this.position()[0], this.position()[1], this.position()[2]));

  textures = textureResource(() => ({ wall: './textures/wall.png' }));

  wallMap = computed(() => this.textures.value()?.wall || null);

  Math = Math;

  constructor() {
    extend({ Mesh, BoxGeometry, MeshBasicMaterial, Object3D });

    effect(() => {
      const wall = this.wallMap();
      if (!wall) return;
      wall.magFilter = NearestFilter;
      wall.minFilter = NearestFilter;
      wall.generateMipmaps = false;
      wall.wrapS = RepeatWrapping;
      wall.wrapT = RepeatWrapping;
      wall.repeat.set(1, 1);
      wall.needsUpdate = true;
    });
  }
}
