import React, { useRef, forwardRef, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { RigidBody, useSphericalJoint } from '@react-three/rapier';
import * as THREE from 'three';
import { MeshLineGeometry, MeshLineMaterial } from 'meshline';
import { extend } from '@react-three/fiber';

extend({ MeshLineGeometry, MeshLineMaterial });

// ─── CARD DIMENSIONS (standard ID card ratio 54mm × 86mm) ────────────────────
const CARD_W = 3.2;
const CARD_H = 5.0;

// ─── CHAIN: Anchor → J0 → J1 → J2 → Card ─────────────────────────────────────
//   Anchor Y = 4.5
//   J0     Y = 3.0   (1.5 below anchor)
//   J1     Y = 1.5   (1.5 below J0)
//   J2     Y = 0.0   (1.5 below J1)
//   Card   Y = -3.0  (CARD_H/2 = 2.5 below J2 attachment, starts near final pos)
//
//   Total rope length = 3 * 1.5 + CARD_H/2 ≈ 7.0 units → card center at ~-2.5
//
//   Camera Z=18, FOV=38 → visible height ≈ ±6.4 units → card fully visible

const ANCHOR_Y   =  4.5;
const J0_Y       =  3.0;
const J1_Y       =  1.5;
const J2_Y       =  0.0;
const CARD_START_Y = CARD_H / 2 - 1; // slightly HIGH so it drops naturally

// ─── JOINT COMPONENT ─────────────────────────────────────────────────────────
// prevRef  - parent body
// selfRef  - this body
// parentAnchor / selfAnchor - local-space attachment points in parent / self
const ChainLink = forwardRef(function ChainLink(
  { position, parentRef, parentAnchorLocal, selfAnchorLocal, children },
  ref
) {
  useSphericalJoint(parentRef, ref, [parentAnchorLocal, selfAnchorLocal]);

  return (
    <RigidBody
      ref={ref}
      position={position}
      type="dynamic"
      colliders={false}
      linearDamping={4}
      angularDamping={4}
      mass={0.2}
    >
      {/* Tiny invisible sphere just to give the body shape */}
      <mesh visible={false}>
        <sphereGeometry args={[0.05]} />
        <meshBasicMaterial />
      </mesh>
      {children}
    </RigidBody>
  );
});

// ─── LANYARD LINE RENDERER ────────────────────────────────────────────────────
function LanyardLine({ refs, cardHalfH, size }) {
  const lineRef = useRef();
  const matRef  = useRef();

  useFrame(() => {
    const bodies = refs.map(r => r?.current);
    if (!lineRef.current || bodies.some(b => !b)) return;

    const pts = [];

    // Anchor position (fixed body)
    const anchorT = bodies[0].translation();
    pts.push(new THREE.Vector3(anchorT.x, anchorT.y, anchorT.z));

    // Joint positions
    for (let i = 1; i < bodies.length - 1; i++) {
      const t = bodies[i].translation();
      pts.push(new THREE.Vector3(t.x, t.y, t.z));
    }

    // Top-clip of the card  (local +Y = card half-height)
    const card  = bodies[bodies.length - 1];
    const cardT = card.translation();
    const cardQ = card.rotation();
    const clip  = new THREE.Vector3(0, cardHalfH, 0)
      .applyQuaternion(new THREE.Quaternion(cardQ.x, cardQ.y, cardQ.z, cardQ.w))
      .add(new THREE.Vector3(cardT.x, cardT.y, cardT.z));
    pts.push(clip);

    if (pts.length < 2) return;
    const curve  = new THREE.CatmullRomCurve3(pts);
    const dense  = curve.getPoints(40);
    lineRef.current.setPoints(dense);
  });

  return (
    <mesh renderOrder={1}>
      <meshLineGeometry ref={lineRef} />
      <meshLineMaterial
        ref={matRef}
        color="#e0c8a0"
        lineWidth={0.12}
        depthTest={false}
        resolution={new THREE.Vector2(size.width, size.height)}
        transparent={false}
        opacity={1}
      />
    </mesh>
  );
}

// ─── MAIN LANYARD COMPONENT ───────────────────────────────────────────────────
export default function Lanyard({ frontImage }) {
  const texture    = useTexture(frontImage);
  const { size, camera } = useThree();

  // Framing
  useEffect(() => {
    camera.position.set(0, 1, 18);
    camera.fov = 38;
    camera.updateProjectionMatrix();
  }, [camera]);

  // Refs for every physics body in the chain
  const anchorRef = useRef();
  const j0Ref     = useRef();
  const j1Ref     = useRef();
  const j2Ref     = useRef();
  const cardRef   = useRef();

  // Dragging
  const isDragging   = useRef(false);
  const dragPlane    = useRef(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0));
  const dragOffset   = useRef(new THREE.Vector3());
  const prevCardPos  = useRef(new THREE.Vector3());
  const impulseTimer = useRef(null);

  const onPointerDown = useCallback((e) => {
    e.stopPropagation();
    isDragging.current = true;
    if (cardRef.current) {
      const t = cardRef.current.translation();
      prevCardPos.current.set(t.x, t.y, t.z);
      cardRef.current.setGravityScale(0, true);
      cardRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      cardRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
    }
  }, []);

  const onPointerUp = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (cardRef.current) {
      cardRef.current.setGravityScale(1, true);
    }
  }, []);

  const { raycaster } = useThree();

  useFrame(({ pointer, camera: cam }) => {
    if (!isDragging.current || !cardRef.current) return;
    raycaster.setFromCamera(pointer, cam);
    const hit = new THREE.Vector3();
    raycaster.ray.intersectPlane(dragPlane.current, hit);
    if (hit) {
      cardRef.current.setTranslation({ x: hit.x, y: hit.y, z: 0 }, true);
      cardRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }
  });

  // The joint graph:
  //  anchorRef (fixed)
  //    └─[spherical, parentAnchor=[0,0,0], selfAnchor=[0,0,0]]─ j0
  //         └─[spherical]─ j1
  //              └─[spherical]─ j2
  //                   └─[spherical, selfAnchor=[0, CARD_H/2, 0]]─ cardRef

  // Anchor ↔ J0
  useSphericalJoint(anchorRef, j0Ref, [
    [0, 0, 0],
    [0, 0.5, 0],   // attach at the top of j0
  ]);

  // J0 ↔ J1
  useSphericalJoint(j0Ref, j1Ref, [
    [0, -0.5, 0],   // bottom of j0
    [0,  0.5, 0],   // top of j1
  ]);

  // J1 ↔ J2
  useSphericalJoint(j1Ref, j2Ref, [
    [0, -0.5, 0],
    [0,  0.5, 0],
  ]);

  // J2 ↔ Card (attach to top clip of card)
  useSphericalJoint(j2Ref, cardRef, [
    [0, -0.5, 0],
    [0, CARD_H / 2, 0],  // top edge of card
  ]);

  return (
    <group>
      {/* ── Visible lanyard line ── */}
      <LanyardLine
        refs={[anchorRef, j0Ref, j1Ref, j2Ref, cardRef]}
        cardHalfH={CARD_H / 2}
        size={size}
      />

      {/* ── Fixed anchor ── */}
      <RigidBody
        ref={anchorRef}
        type="fixed"
        position={[0, ANCHOR_Y, 0]}
        colliders={false}
      >
        {/* Visible metal pin */}
        <mesh>
          <cylinderGeometry args={[0.06, 0.06, 0.5, 16]} />
          <meshStandardMaterial color="#aaa" metalness={0.9} roughness={0.2} />
        </mesh>
      </RigidBody>

      {/* ── Joint 0 ── */}
      <RigidBody
        ref={j0Ref}
        position={[0, J0_Y, 0]}
        type="dynamic"
        colliders={false}
        linearDamping={4}
        angularDamping={5}
        mass={0.2}
      >
        <mesh visible={false}>
          <sphereGeometry args={[0.05]} />
          <meshBasicMaterial />
        </mesh>
      </RigidBody>

      {/* ── Joint 1 ── */}
      <RigidBody
        ref={j1Ref}
        position={[0, J1_Y, 0]}
        type="dynamic"
        colliders={false}
        linearDamping={4}
        angularDamping={5}
        mass={0.2}
      >
        <mesh visible={false}>
          <sphereGeometry args={[0.05]} />
          <meshBasicMaterial />
        </mesh>
      </RigidBody>

      {/* ── Joint 2 ── */}
      <RigidBody
        ref={j2Ref}
        position={[0, J2_Y, 0]}
        type="dynamic"
        colliders={false}
        linearDamping={4}
        angularDamping={5}
        mass={0.2}
      >
        <mesh visible={false}>
          <sphereGeometry args={[0.05]} />
          <meshBasicMaterial />
        </mesh>
      </RigidBody>

      {/* ── ID Card ── */}
      <RigidBody
        ref={cardRef}
        position={[0, CARD_START_Y, 0]}
        type="dynamic"
        colliders="cuboid"
        linearDamping={3}
        angularDamping={5}
        mass={1.5}
        restitution={0.05}
        friction={0.8}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {/* Front face */}
        <mesh>
          <boxGeometry args={[CARD_W, CARD_H, 0.05]} />
          <meshStandardMaterial
            map={texture}
            roughness={0.4}
            metalness={0.1}
          />
        </mesh>
      </RigidBody>
    </group>
  );
}
