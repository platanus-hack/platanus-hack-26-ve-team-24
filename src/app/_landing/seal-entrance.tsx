'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useLayoutEffect, useRef } from 'react';
import type { Group, PerspectiveCamera } from 'three';
import { SEAL_GAP_RATIO, SEAL_GRID, SEGMENT_AREAS } from '@/components/ui/seal';

const STAGGER_S = 0.16;
const FOLD_S = 0.52;
const SETTLE_S = 0.24;
const LAST_LANDING_S = (SEGMENT_AREAS.length - 1) * STAGGER_S + FOLD_S;
const SETTLE_SCALE = 1.03;
const CAMERA_FOV_DEG = 25;

// arista desde la que se despliega cada bloque, siguiendo el trazado de la C
const HINGES = ['top', 'right', 'top', 'top', 'left'] as const;
type Hinge = (typeof HINGES)[number];

// la escena mide 1×1 (el lado del sello); celda y gap son fracciones de ese lado
const CELL = (1 - (SEAL_GRID - 1) * SEAL_GAP_RATIO) / SEAL_GRID;
const PITCH = CELL + SEAL_GAP_RATIO;
const DEPTH = CELL;

type Box = { x: number; y: number; w: number; h: number };

function gridAreaToBox(area: string): Box {
  const [r0, c0, r1, c1] = area.split('/').map(Number);
  const w = (c1 - c0) * PITCH - SEAL_GAP_RATIO;
  const h = (r1 - r0) * PITCH - SEAL_GAP_RATIO;
  return {
    x: (c0 - 1) * PITCH + w / 2 - 0.5,
    y: 0.5 - ((r0 - 1) * PITCH + h / 2),
    w,
    h,
  };
}

const BLOCKS = SEGMENT_AREAS.map((area, index) => ({
  box: gridAreaToBox(area),
  hinge: HINGES[index],
}));

// misma curva que --ease-resolve: salida exponencial, sin rebote
function expoOut(t: number) {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

function clamp01(t: number) {
  return Math.min(1, Math.max(0, t));
}

// la marca entera se asienta una vez que cae el último bloque
function settleScale(t: number) {
  if (t < LAST_LANDING_S) return 1;
  const settled = expoOut(clamp01((t - LAST_LANDING_S) / SETTLE_S));
  return SETTLE_SCALE - (SETTLE_SCALE - 1) * settled;
}

type Offset = { pivot: [number, number]; mesh: [number, number] };

// el pivote va en la arista de bisagra; el mesh se desplaza medio bloque hacia dentro
function hingeOffset({ box, hinge }: { box: Box; hinge: Hinge }): Offset {
  const offsets: Record<Hinge, Offset> = {
    top: { pivot: [box.x, box.y + box.h / 2], mesh: [0, -box.h / 2] },
    right: { pivot: [box.x + box.w / 2, box.y], mesh: [-box.w / 2, 0] },
    left: { pivot: [box.x - box.w / 2, box.y], mesh: [box.w / 2, 0] },
  };
  return offsets[hinge];
}

function applyFold(group: Group, hinge: Hinge, progress: number) {
  const angle = (1 - expoOut(progress)) * (Math.PI / 2);
  group.visible = progress > 0;
  // el bloque parte de pie, apuntando al espectador, y se acuesta sobre la página
  switch (hinge) {
    case 'top':
      group.rotation.set(-angle, 0, 0);
      break;
    case 'right':
      group.rotation.set(0, angle, 0);
      break;
    case 'left':
      group.rotation.set(0, -angle, 0);
      break;
  }
}

// la cámara se aleja justo lo necesario para que la escena de 1×1 llene el canvas
function FitCamera() {
  const camera = useThree((state) => state.camera) as PerspectiveCamera;
  const size = useThree((state) => state.size);

  useLayoutEffect(() => {
    camera.fov = CAMERA_FOV_DEG;
    camera.aspect = size.width / size.height;
    camera.position.set(0, 0, 0.5 / Math.tan((CAMERA_FOV_DEG * Math.PI) / 360));
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera, size]);

  return null;
}

function Blocks({ onDone }: { onDone: () => void }) {
  const root = useRef<Group>(null);
  const hinges = useRef<(Group | null)[]>([]);
  const finished = useRef(false);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    for (const [index, group] of hinges.current.entries()) {
      if (group) applyFold(group, BLOCKS[index].hinge, clamp01((t - index * STAGGER_S) / FOLD_S));
    }
    root.current?.scale.setScalar(settleScale(t));
    if (!finished.current && t >= LAST_LANDING_S + SETTLE_S) {
      finished.current = true;
      onDone();
    }
  });

  return (
    <group ref={root}>
      {BLOCKS.map((block, index) => {
        const { pivot, mesh } = hingeOffset(block);
        return (
          <group
            key={SEGMENT_AREAS[index]}
            ref={(node) => {
              hinges.current[index] = node;
            }}
            position={[pivot[0], pivot[1], 0]}
            visible={false}
          >
            <mesh position={[mesh[0], mesh[1], -DEPTH / 2]}>
              <boxGeometry args={[block.box.w, block.box.h, DEPTH]} />
              <meshStandardMaterial color="#141414" roughness={0.6} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/** Los cinco bloques de la C caen en dominó sobre la grilla del sello; avisa al asentarse. */
export default function SealEntrance({ onDone }: { onDone: () => void }) {
  return (
    <Canvas
      className="absolute inset-0"
      gl={{ alpha: true, antialias: true }}
      dpr={[1, 2]}
      camera={{ near: 0.1, far: 20 }}
    >
      <FitCamera />
      <ambientLight intensity={0.6} />
      <directionalLight position={[-3, 5, 6]} intensity={1.8} />
      <Blocks onDone={onDone} />
    </Canvas>
  );
}
