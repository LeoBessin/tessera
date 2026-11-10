import { createPrng } from '@tessera/sim';
import * as THREE from 'three';

/**
 * Isometric rendering, done as real 3D under an orthographic camera.
 *
 * Faking isometry in 2D means sorting sprites by hand, which is where the
 * genre's classic occlusion bugs live. An orthographic camera gives true
 * isometric projection with the depth buffer doing the sorting for free, and —
 * since the art is geometric anyway — real lights and shadows cost nothing and
 * are what stop primitives from looking flat.
 *
 * The simulation's ground plane is `(x, y)`; the scene's is `(x, z)`. That
 * mapping lives here and nowhere else.
 *
 * Everything built below is a **placeholder**. ADR 8 requires generated forms
 * to be detailed, and boxes, a grid and an octahedron are not that — they are
 * what a walking skeleton draws before anyone has decided anything. The
 * pipeline is right and the forms are provisional; replacing them is phase 3
 * work. The one rule to keep while doing it: the renderer draws from its own
 * PRNG instance and never advances the simulation's, so generated detail can
 * never move a replay digest.
 */

/** Height of the visible area in world units. Sets the zoom. */
const VIEW_HEIGHT = 24;

/** atan(1/√2) ≈ 35.264°, the angle that makes a cube project to a true hexagon. */
const CAMERA_OFFSET = new THREE.Vector3(1, Math.SQRT2 / 2, 1).normalize().multiplyScalar(60);

const PALETTE = {
  background: 0x11131a,
  ground: 0x1e2230,
  grid: 0x2c3242,
  scatter: 0x39415a,
  player: 0x6fd3c7,
  playerDowned: 0x5a6076,
  key: 0xfff0d8,
  fill: 0x4a5a8a,
} as const;

export interface PlayerView {
  readonly x: number;
  readonly y: number;
  readonly downed: boolean;
  readonly isSelf: boolean;
}

export interface Renderer {
  /** Adds or updates a player's visual state. */
  upsertPlayer(id: string, view: PlayerView): void;
  removePlayer(id: string): void;
  /** Points the camera at a world position, keeping the isometric angle. */
  lookAt(x: number, y: number): void;
  render(): void;
  resize(width: number, height: number): void;
  dispose(): void;
}

function buildGround(scene: THREE.Scene): void {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: PALETTE.ground, roughness: 0.95, metalness: 0 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const grid = new THREE.GridHelper(200, 100, PALETTE.grid, PALETTE.grid);
  (grid.material as THREE.Material).opacity = 0.25;
  (grid.material as THREE.Material).transparent = true;
  scene.add(grid);
}

/**
 * Scatters geometric blocks around the arena. **Placeholder** (ADR 8): real
 * scenery is generated in detail, not scaled cubes.
 *
 * Drawn from the simulation's own seeded generator, so the same seed yields the
 * same landscape on every client — and so the content pipeline and the game
 * share one source of randomness rather than two that can disagree.
 */
function buildScatter(scene: THREE.Scene, seed: number): void {
  const prng = createPrng(seed);
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshStandardMaterial({ color: PALETTE.scatter, roughness: 0.8 });
  const count = 90;
  const blocks = new THREE.InstancedMesh(geometry, material, count);
  blocks.castShadow = true;
  blocks.receiveShadow = true;

  const transform = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const height = 0.5 + prng.nextFloat() * 3.5;
    const width = 0.8 + prng.nextFloat() * 1.6;
    transform.position.set(
      (prng.nextFloat() - 0.5) * 90,
      height / 2,
      (prng.nextFloat() - 0.5) * 90,
    );
    transform.scale.set(width, height, width);
    transform.rotation.y = prng.nextInt(4) * (Math.PI / 2);
    transform.updateMatrix();
    blocks.setMatrixAt(i, transform.matrix);
  }
  blocks.instanceMatrix.needsUpdate = true;
  scene.add(blocks);
}

function buildLights(scene: THREE.Scene): void {
  scene.add(new THREE.HemisphereLight(PALETTE.key, PALETTE.fill, 0.55));

  const key = new THREE.DirectionalLight(PALETTE.key, 2.1);
  key.position.set(30, 50, 20);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.normalBias = 0.03;

  // The shadow camera is orthographic too, and must be sized to the arena:
  // too wide and shadows turn to mush, too narrow and they stop at the edge.
  const extent = 60;
  key.shadow.camera.left = -extent;
  key.shadow.camera.right = extent;
  key.shadow.camera.top = extent;
  key.shadow.camera.bottom = -extent;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 160;
  scene.add(key);
  scene.add(key.target);
}

function buildPlayerMesh(isSelf: boolean): THREE.Mesh {
  // Placeholder (ADR 8). An octahedron is readable from the fixed camera angle
  // and reads as "facing nowhere in particular", which is honest while the
  // simulation has no facing — but a restorer is a craftsperson, and a
  // primitive is not a character. Replaced once facing exists.
  const mesh = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.6),
    new THREE.MeshStandardMaterial({
      color: PALETTE.player,
      roughness: 0.35,
      metalness: 0.1,
      emissive: isSelf ? PALETTE.player : 0x000000,
      emissiveIntensity: isSelf ? 0.35 : 0,
    }),
  );
  mesh.castShadow = true;
  return mesh;
}

export function createRenderer(canvas: HTMLCanvasElement, seed: number): Renderer {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.background);
  scene.fog = new THREE.Fog(PALETTE.background, 60, 130);

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
  const focus = new THREE.Vector3(0, 0, 0);

  buildGround(scene);
  buildScatter(scene, seed);
  buildLights(scene);

  const players = new Map<string, THREE.Mesh>();

  const placeCamera = (): void => {
    camera.position.copy(focus).add(CAMERA_OFFSET);
    camera.lookAt(focus);
  };

  const api: Renderer = {
    upsertPlayer(id, view) {
      let mesh = players.get(id);
      if (!mesh) {
        mesh = buildPlayerMesh(view.isSelf);
        players.set(id, mesh);
        scene.add(mesh);
      }
      // Simulation (x, y) is the ground plane; the scene's ground is (x, z).
      mesh.position.set(view.x, view.downed ? 0.25 : 0.75, view.y);
      mesh.rotation.y = view.downed ? Math.PI / 4 : 0;

      const material = mesh.material as THREE.MeshStandardMaterial;
      material.color.setHex(view.downed ? PALETTE.playerDowned : PALETTE.player);
    },

    removePlayer(id) {
      const mesh = players.get(id);
      if (!mesh) return;
      scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      players.delete(id);
    },

    lookAt(x, y) {
      focus.set(x, 0, y);
      placeCamera();
    },

    resize(width, height) {
      const aspect = width / height;
      camera.left = (-VIEW_HEIGHT * aspect) / 2;
      camera.right = (VIEW_HEIGHT * aspect) / 2;
      camera.top = VIEW_HEIGHT / 2;
      camera.bottom = -VIEW_HEIGHT / 2;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    },

    render() {
      renderer.render(scene, camera);
    },

    dispose() {
      for (const id of [...players.keys()]) api.removePlayer(id);
      renderer.dispose();
    },
  };

  placeCamera();
  return api;
}
