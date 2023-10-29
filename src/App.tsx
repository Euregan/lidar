import { useMemo, useRef } from "react";
import {
  BufferGeometry,
  Material,
  Mesh,
  NormalBufferAttributes,
  Object3DEventMap,
  InstancedMesh,
  Vector3,
  Matrix4,
  Raycaster,
  SphereGeometry,
  BackSide,
  Color,
} from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Box, OrbitControls } from "@react-three/drei";

const minimumDistance = 2.5;
const maximumDistance = 3;

const minimumColor = new Color("#7bba26");
const maximumColor = new Color("#4281d7");

const Lidar = () => {
  const walls =
    useRef<
      Mesh<BufferGeometry<NormalBufferAttributes>, Material, Object3DEventMap>
    >(null);
  const box =
    useRef<
      Mesh<BufferGeometry<NormalBufferAttributes>, Material, Object3DEventMap>
    >(null);
  const pointsMesh =
    useRef<InstancedMesh<BufferGeometry<NormalBufferAttributes>, Material>>(
      null
    );

  const lidar = useMemo(
    () =>
      new SphereGeometry(
        1,
        100,
        64,
        0,
        Math.PI * 2,
        Math.PI * 0.25,
        Math.PI - Math.PI * 0.4
      ),
    []
  );

  useFrame(() => {
    if (walls.current && pointsMesh.current && box.current) {
      const raycaster = new Raycaster();

      pointsMesh.current.count = 0;

      let placed = 0;

      const color = new Color();

      for (let i = 0; i < lidar.attributes.position.count; i++) {
        const position = new Vector3().fromBufferAttribute(
          lidar.attributes.position,
          i
        );

        raycaster.set(new Vector3(0, 2, 0), position);

        const intersections = raycaster.intersectObjects([
          walls.current,
          box.current,
        ]);
        const matrix = new Matrix4();

        // We only display the first intersection (the closest to the origin)
        const intersection = intersections[0];
        if (intersection) {
          pointsMesh.current.count += 1;

          matrix.makeTranslation(
            intersection.point.x,
            intersection.point.y,
            intersection.point.z
          );
          pointsMesh.current.setMatrixAt(placed, matrix);

          pointsMesh.current.setColorAt(
            placed,
            color.lerpColors(
              minimumColor,
              maximumColor,
              (intersection.distance - minimumDistance) / maximumDistance
            )
          );

          placed++;
        }
      }

      pointsMesh.current.instanceMatrix.needsUpdate = true;
      pointsMesh.current.instanceColor!.needsUpdate = true;
    }
  });

  return (
    <>
      <Box ref={box} position={[-2, 0, -1]}>
        <meshBasicMaterial opacity={0} transparent />
      </Box>

      <Box ref={walls} args={[10, 1, 8]}>
        <meshBasicMaterial side={BackSide} opacity={0} transparent />
      </Box>

      <instancedMesh
        ref={pointsMesh}
        args={[undefined, undefined, lidar.attributes.position.count]}
      >
        <sphereGeometry args={[0.0125, 8, 8]} />
      </instancedMesh>
    </>
  );
};

const App = () => (
  <Canvas>
    <OrbitControls />
    <Lidar />
  </Canvas>
);

export default App;
