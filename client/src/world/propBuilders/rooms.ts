/** Room-specific props: gym fixtures, cafeteria tables, server racks. */
import * as THREE from "three";
import { Basic, M, offsetFromWall, type Builder } from "./_common";

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

// Renders FOUR server racks in a 2x2 arrangement (two rows of two).
// All racks face the same direction; front faces are at LOCAL +Z so they
// point INTO the room (opposite the wall-prop convention).
// Renders TWO server racks side by side in a single row (1x2 layout)
// — racks shouldn't stack back-to-back inside a server cluster, that's
// what aisles are for. Each rack ~0.95m wide x 0.85m deep, full-size.
// Front faces are at LOCAL +Z so they point INTO the room.
const buildServerRack: Builder = (prop) => {
  const g = new THREE.Group();
  const seed = ((prop.x * 47.3 + prop.z * 91.1) | 0) >>> 0;
  const RW = 0.95;  // rack width
  const RD = 0.85;  // rack depth
  const positions: Array<[number, number]> = [
    [-0.5, 0], [0.5, 0],
  ];
  positions.forEach(([dx, dz], rackIdx) => {
    const rack = new THREE.Group();
    rack.position.set(dx, 0, dz);
    const body = new THREE.Mesh(new THREE.BoxGeometry(RW, 1.8, RD), M(0x18181c));
    body.position.y = 0.9;
    rack.add(body);
    const vent = Basic(0x080809);
    for (let i = 0; i < 6; i++) {
      const slot = new THREE.Mesh(new THREE.BoxGeometry(RW - 0.15, 0.02, 0.01), vent);
      slot.position.set(0, 0.35 + i * 0.22, RD / 2 + 0.001);
      rack.add(slot);
    }
    for (let i = 0; i < 4; i++) {
      const on = ((seed >> (i + rackIdx * 4)) & 1) === 1;
      const led = new THREE.Mesh(
        new THREE.PlaneGeometry(0.04, 0.04),
        Basic(on ? 0x4adef0 : 0x2a4a30),
      );
      led.position.set(-0.3 + i * 0.2, 1.62, RD / 2 + 0.002);
      rack.add(led);
    }
    const drawer = new THREE.Mesh(new THREE.BoxGeometry(RW - 0.15, 0.18, 0.02), M(0x303034));
    drawer.position.set(0, 1.0, RD / 2 + 0.011);
    rack.add(drawer);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.02, 0.02), M(0xb8b8c0));
    handle.position.set(0, 1.0, RD / 2 + 0.025);
    rack.add(handle);
    g.add(rack);
  });
  return g;
};

// Basketball hoop is wall-mounted (board at z=+0.05) — shift so it
// doesn't poke into the wall. Server racks go through grid_fill (centre
// placement), so no offset; the rack builder itself draws a pair of racks.
export const ROOM_BUILDERS: Record<string, Builder> = {
  gym_mat: buildGymMat,
  basketball_hoop: offsetFromWall(buildBasketballHoop, 0.05),
  cafeteria_table: buildCafeteriaTable,
  server_rack: buildServerRack,
};
