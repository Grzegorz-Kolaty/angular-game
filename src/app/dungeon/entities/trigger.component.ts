import { ChangeDetectionStrategy, Component, computed, CUSTOM_ELEMENTS_SCHEMA, input, output } from '@angular/core';
import { extend, NgtArgs } from 'angular-three';
import {
  NgtrCuboidCollider,
  NgtrIntersectionEnterPayload,
  NgtrIntersectionExitPayload,
  NgtrRigidBody,
} from 'angular-three-rapier';
import { BoxGeometry, Mesh, MeshBasicMaterial, Object3D, Vector3 } from 'three';

@Component({
  selector: 'dungeon-trigger',
  template: `
    <ngt-object3D rigidBody="fixed" [position]="positionVector()">
      <ngt-mesh>
        <ngt-box-geometry *args="[1, 1]" />
        <ngt-mesh-basic-material color="red" [transparent]="true" [opacity]="0.3" />
      </ngt-mesh>

      <ngt-object3D
        [cuboidCollider]="[0.5, 0.5, 0.5]"
        [options]="{ sensor: true }"
        (intersectionEnter)="intersectionEnter.emit($event)"
        (intersectionExit)="intersectionExit.emit($event)"
      />
    </ngt-object3D>
  `,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [NgtrCuboidCollider, NgtrRigidBody, NgtArgs],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TriggerComponent {
  position = input.required<[number, number, number]>();
  intersectionEnter = output<NgtrIntersectionEnterPayload>();
  intersectionExit = output<NgtrIntersectionExitPayload>();
  positionVector = computed(() => new Vector3(this.position()[0], this.position()[1], this.position()[2]));

  constructor() {
    extend({ Mesh, BoxGeometry, MeshBasicMaterial, Object3D });
  }
}
