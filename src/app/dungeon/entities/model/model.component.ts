import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";


@Component({
    selector: 'dungeon-model',
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <ngt-mesh>
            <ngt-box-geometry/>
        </ngt-mesh>
    `
})
export class DungeonModelComponent {
    // position: [number, number, number] = [-16, 0.299, 0.5];
    // model = gltfResource(() => 'assets/models/can.glb');
}
