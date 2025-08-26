declare module 'three/examples/jsm/loaders/GLTFLoader' {
    import { Loader, LoadingManager, Object3D } from 'three';
    export class GLTFLoader extends Loader {
        constructor(manager?: LoadingManager);
        load(
            url: string,
            onLoad: (gltf: { scene: Object3D }) => void,
            onProgress?: (event: ProgressEvent<EventTarget>) => void,
            onError?: (event: ErrorEvent) => void
        ): void;
    }
}