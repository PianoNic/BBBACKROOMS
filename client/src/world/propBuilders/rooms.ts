/** Room-specific props: gym fixtures, cafeteria tables, server racks. */
import * as THREE from "three";
import { Basic, M, type Builder } from "./_common";

const buildGymMat: Builder = () => {
  const g = new THREE.Group();
  const mat = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.9), M(0x1a4ea8));
  mat.position.y = 0.04;
  g.add(mat);
  return g;
};

// Basketball hoop: backboard against the wall (+Z), ring extends out
// into the room (-Z) so wall_yaw makes the ring face the court.
const buildBasketballHoop: Builder = () => {
  const g = new THREE.Group();
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.7, 0.05), M(0xf8f8ee));
  board.position.set(0, 2.5, 0.05);
  g.add(board);
  const square = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.28), Basic(0xc83030));
  square.position.set(0, 2.42, 0.024);
  g.add(square);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.22, 0.025, 6, 16), M(0xe04020),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.set(0, 2.30, -0.20);
  g.add(ring);
  return g;
};

const buildCafeteriaTable: Builder = () => {
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.05, 0.7), M(0xc4b88a));
  top.position.y = 0.74;
  g.add(top);
  const pedestal = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.7, 0.18), M(0x404048));
  pedestal.position.y = 0.36;
  g.add(pedestal);
  for (const dz of [-0.55, 0.55]) {
    const bench = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.04, 0.28), M(0xa89870));
    bench.position.set(0, 0.45, dz);
    g.add(bench);
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.42, 0.10), M(0x404048));
    post.position.set(0, 0.22, dz);
    g.add(post);
  }
  return g;
};

const buildServerRack: Builder = (prop) => {
  const g = new THREE.Group();
  // Tall narrow steel cabinet. Front face (local -z) shows LED strip + vents,
  // matching the project's wall-prop convention.
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.8, 0.4), M(0x18181c));
  body.position.y = 0.9;
  g.add(body);
  const vent = Basic(0x080809);
  for (let i = 0; i < 6; i++) {
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.02, 0.01), vent);
    slot.position.set(0, 0.35 + i * 0.22, -0.201);
    g.add(slot);
  }
  const seed = ((prop.x * 47.3 + prop.z * 91.1) | 0) >>> 0;
  for (let i = 0; i < 4; i++) {
    const on = ((seed >> i) & 1) === 1;
    const led = new THREE.Mesh(
      new THREE.PlaneGeometry(0.04, 0.04),
      Basic(on ? 0x4adef0 : 0x2a4a30),
    );
    led.position.set(-0.18 + i * 0.12, 1.62, -0.202);
    g.add(led);
  }
  const drawer = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.18, 0.02), M(0x303034));
  drawer.position.set(0, 1.0, -0.211);
  g.add(drawer);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.02, 0.02), M(0xb8b8c0));
  handle.position.set(0, 1.0, -0.225);
  g.add(handle);
  return g;
};

export const ROOM_BUILDERS: Record<string, Builder> = {
  gym_mat: buildGymMat,
  basketball_hoop: buildBasketballHoop,
  cafeteria_table: buildCafeteriaTable,
  server_rack: buildServerRack,
};
