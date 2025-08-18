import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  input,
  output,
  viewChild,
} from '@angular/core';
import { beforeRender, NgtArgs } from 'angular-three';
import { NgtrCollisionEnterPayload, NgtrCuboidCollider, NgtrRigidBody } from 'angular-three-rapier';
import { Camera, DataTexture, LinearFilter, RGBAFormat, Scene, Vector2, Vector3, WebGLRenderTarget } from 'three';
import { computeDistanceMap } from '../utils/generate-dungeon';

@Component({
  selector: 'dungeon-enemy',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [NgtrCuboidCollider, NgtrRigidBody, NgtArgs],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ngt-object3D
      rigidBody
      [position]="[enemyStartPosition().x, enemyStartPosition().y, enemyStartPosition().z]"
      [options]="{ mass: 1, enabledRotations: [false, false, false], canSleep: false }"
    >
      <ngt-mesh>
        <ngt-box-geometry *args="[1, 2, 1, 8, 8, 8]" />
        <ngt-shader-material
          [parameters]="{
            transparent: true,
            depthWrite: false,
            uniforms: cloakUniforms,
            vertexShader: cloakVert,
            fragmentShader: cloakFrag,
          }"
        />
      </ngt-mesh>

      <!-- Slightly larger so a contact actually fires -->
      <ngt-object3D [cuboidCollider]="[0.06, 0.06, 0.06]" (collisionEnter)="onCollision($event)" />
    </ngt-object3D>
  `,
})
export class EnemyComponent implements AfterViewInit {
  // Inputs/Outputs
  layout = input.required<string[][]>();
  caught = output<NgtrCollisionEnterPayload>();

  // Grab the rigid body by type (no exportAs needed)
  enemyRb = viewChild.required(NgtrRigidBody);

  // Spawn position
  enemyStartPosition = computed(() => this.getEnemyStartPosition(this.layout()));

  // Predator cloak uniforms/shaders
  cloakUniforms = {
    tScene: { value: null as any },
    uTime: { value: 0 },
    uRes: { value: new Vector2(1, 1) },

    // refraction/tint from before
    uDistort: { value: 0.022 },
    uEdge: { value: 3.5 },
    uAlpha: { value: 0.33 },
    uCapture: { value: 0 },
    uTint: { value: new Vector3(0.6, 0.45, 0.9) },
    uTintStrength: { value: 0.015 },

    // geometric/glitch warps
    uWarpPx: { value: 90 }, // max screen-space warp in pixels
    uModelWarp: { value: 1.1 }, // push along view dir in world units (meters)
    uNoiseScale: { value: 8.0 }, // controls world wobble frequency
    uGlitch: { value: 1.0 }, // 0..1 master intensity
  };

  cloakVert = `
  precision highp float;
  precision highp int;

  uniform float uTime;
  uniform float uWarpPx;
  uniform float uModelWarp;
  uniform float uNoiseScale;
  uniform float uGlitch;
  uniform vec2  uRes;
  // DO NOT redeclare cameraPosition here; ShaderMaterial injects:
  // uniform vec3 cameraPosition;

  varying vec3 vNormalV;

  float wob(vec3 p, float s, float t){
    return (
      sin(p.x*s*0.21 + t*0.9) +
      sin(p.y*s*0.27 - t*1.2) +
      sin(p.z*s*0.19 + t*1.1)
    ) * (1.0/3.0);
  }

  void main(){
    float t = uTime;

    // world space position
    vec4 wp = modelMatrix * vec4(position, 1.0);

    // push toward camera (world tear)
    float w = wob(wp.xyz, uNoiseScale, t);
    vec3 toCam = normalize(cameraPosition - wp.xyz);
    float burst = smoothstep(0.75, 0.98, sin(t*0.7) * sin(t*1.21));
    wp.xyz += toCam * (uModelWarp * w * (0.6 + 1.4 * burst) * uGlitch);

    // project to clip
    vec4 clip = projectionMatrix * viewMatrix * wp;

    // screen-space (NDC) warp — huge/glitchy
    vec2 ndc = clip.xy / clip.w;

    vec2 ripple = vec2(
      sin((ndc.y + w)*40.0 + t*12.0),
      cos((ndc.x - w)*37.0 - t*11.0)
    );
    vec2 sweep = vec2(
      sin(wp.x*0.03 + t*0.8),
      cos(wp.z*0.025 - t*1.1)
    );
    vec2 ndcOffset = (0.5*ripple + sweep) * (0.4 + 1.6*burst) * uGlitch;

    // pixels → NDC
    vec2 px2ndc = (2.0 * vec2(uWarpPx)) / uRes;
    ndc += ndcOffset * px2ndc;

    clip.xy = ndc * clip.w;

    vNormalV = normalize(normalMatrix * normal);
    gl_Position = clip;
  }
`;

  // replace your cloakFrag with this whole string
  cloakFrag = `
  precision highp float;
  precision highp int;

  uniform sampler2D tScene;
  uniform float uTime, uDistort, uEdge, uAlpha, uCapture;
  uniform float uTintStrength;
  uniform vec2 uRes;
  uniform vec3 uTint;
  varying vec3 vNormalV;

  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
  float noise(vec2 p){
    vec2 i=floor(p), f=fract(p);
    float a=hash(i), b=hash(i+vec2(1.,0.)), c=hash(i+vec2(0.,1.)), d=hash(i+vec2(1.,1.));
    vec2 u=f*f*(3.-2.*f);
    return mix(a,b,u.x)+(c-a)*u.y*(1.-u.x)+(d-b)*u.x*u.y;
  }
  float fbm(vec2 p){
    float s=0., a=0.5;
    for(int i=0;i<4;i++){ s+=a*noise(p); p*=2.02; a*=0.5; }
    return s;
  }

  void main(){
    if (uCapture > 0.5) discard;

    vec2 uv = gl_FragCoord.xy / uRes;

    // animated flow field
    vec2 flow = vec2(
      fbm(uv*12.0 + uTime*0.35) - 0.5,
      fbm(uv*13.0 - uTime*0.32) - 0.5
    );
    vec2 offset = flow * uDistort;

    // subtle chromatic refraction (breaks the "flat blue" look)
    float r = texture2D(tScene, uv + offset * 1.02).r;
    float g = texture2D(tScene, uv + offset * 1.00).g;
    float b = texture2D(tScene, uv + offset * 1.05).b;
    vec3 col = vec3(r, g, b);

    // very faint tint, edge-weighted (set uTintStrength=0.0 to remove entirely)
    float fres = pow(1.0 - clamp(abs(vNormalV.z), 0.0, 1.0), uEdge);
    col = mix(col, uTint, uTintStrength * fres);

    // edge-only visibility; base alpha lower + tiny blue-noise dither to hide the cube shape
    float alpha = clamp(uAlpha + 0.35 * fres, 0.0, 1.0);
    alpha += (hash(gl_FragCoord.xy * 0.75 + uTime) - 0.5) * 0.02; // ±1% alpha dither
    if (alpha < 0.01) discard;

    gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
  }
`;

  // Offscreen capture (scene without enemy)
  private rt?: WebGLRenderTarget;
  private rtW = 0;
  private rtH = 0;

  private dummyTex = (() => {
    const tex = new DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
    tex.needsUpdate = true;
    tex.magFilter = LinearFilter;
    tex.minFilter = LinearFilter;
    return tex;
  })();

  constructor() {
    // ---- Movement AI (BFS field + close-range pursuit) ----
    beforeRender(({ camera }) => {
      const rbDir = this.enemyRb();
      const body = rbDir?.rigidBody();
      if (!body) return;

      const grid = this.layout();
      const H = grid.length;
      const W = grid[0].length;

      // Player cell (pause if outside/invalid)
      const { gx: px, gy: py } = this.toGrid(camera.position.x, camera.position.z, W, H);
      if (!grid[py]?.[px] || grid[py][px] === '1') {
        body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        body.wakeUp();
        return;
      }

      const distToP = computeDistanceMap(grid, px, py);

      // Enemy cell
      const t = body.translation();
      const { gx: ex, gy: ey } = this.toGrid(t.x, t.z, W, H);
      const here = distToP[ey]?.[ex];
      if (here === undefined || here === Infinity) {
        body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        body.wakeUp();
        return;
      }

      // Close-range: drive straight to player's world pos to ensure collision
      if (here <= 1) {
        const toPlayer = new Vector3(camera.position.x - t.x, 0, camera.position.z - t.z);
        const d = toPlayer.length();
        if (d > 1e-3) {
          toPlayer.normalize();
          const speed = Math.min(0.5, 0.8 + d * 2.0);
          // const speed = 20.0;
          body.setLinvel({ x: toPlayer.x * speed, y: 0, z: toPlayer.z * speed }, true);
          body.wakeUp();
        }
        return;
      }

      // Follow downhill neighbor toward tile centers
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
          const speed = Math.min(1.5, 0.6 + d * 1.0);
          // const speed = 4.0;
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

    // ---- Predator cloak capture & uniforms (no layers; use uCapture to discard) ----
    beforeRender(({ gl, scene, camera, size, clock }) => {
      // Lazy create/resize half-res RT
      const w = Math.max(2, (size?.width ?? gl.domElement.width) >> 1);
      const h = Math.max(2, (size?.height ?? gl.domElement.height) >> 1);
      if (!this.rt || this.rtW !== w || this.rtH !== h) {
        this.rt?.dispose();
        this.rt = new WebGLRenderTarget(w, h, {
          format: RGBAFormat,
          magFilter: LinearFilter,
          minFilter: LinearFilter,
          depthBuffer: false,
          stencilBuffer: false,
        });
        this.rtW = w;
        this.rtH = h;
      }

      // --- CAPTURE PASS (no feedback loop) ---
      const prevTarget = gl.getRenderTarget();

      // Temporarily bind dummy texture so no program samples the RT texture while rendering into it
      const prevTex = this.cloakUniforms.tScene.value;
      this.cloakUniforms.tScene.value = this.dummyTex;
      this.cloakUniforms.uCapture.value = 1; // enemy discards

      gl.setRenderTarget(this.rt);
      gl.clear();
      gl.render(scene as Scene, camera as Camera);

      // --- MAIN PASS restore ---
      gl.setRenderTarget(prevTarget);
      this.cloakUniforms.uCapture.value = 0;
      this.cloakUniforms.tScene.value = this.rt.texture; // now safe to sample captured scene

      // Feed uniforms
      this.cloakUniforms.uTime.value = clock?.elapsedTime ?? performance.now() * 0.001;
      const cw = size?.width ?? gl.domElement.width;
      const ch = size?.height ?? gl.domElement.height;
      this.cloakUniforms.uRes.value.set(cw, ch);
    });
  }

  ngAfterViewInit(): void {
    // nothing needed now (we're not using layers)
  }

  // Grid/world helpers
  private toGrid(x: number, z: number, W: number, H: number) {
    return { gx: Math.floor(x + W / 2), gy: Math.floor(z + H / 2) };
  }
  private toWorld(gx: number, gy: number, W: number, H: number) {
    return { x: gx - W / 2 + 0.5, z: gy - H / 2 + 0.5 };
  }

  // Enemy spawn: farthest reachable from entrance (x=1, middle row)
  private getEnemyStartPosition(grid: string[][]) {
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
    const worldX = sx - W / 2 + 0.5;
    const worldZ = sy - H / 2 + 0.5;
    return { x: worldX, y: 0.5, z: worldZ };
  }

  // Collision callback
  onCollision(ev: NgtrCollisionEnterPayload) {
    if (ev.other.rigidBody) {
      this.caught.emit(ev);
    }
  }
}
