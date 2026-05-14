/** Shared types + material factories used by the per-theme prop builders. */
import * as THREE from "three";
import type { Prop } from "../../net/protocol";

export type Builder = (prop: Prop) => THREE.Object3D;

export const M = (color: number): THREE.MeshLambertMaterial =>
  new THREE.MeshLambertMaterial({ color });

export const Basic = (color: number): THREE.MeshBasicMaterial =>
  new THREE.MeshBasicMaterial({ color });
