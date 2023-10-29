import { useRef } from "react";
import {
  BufferGeometry,
  Material,
  Mesh,
  NormalBufferAttributes,
  Object3DEventMap,
  BackSide,
} from "three";
import { Canvas } from "@react-three/fiber";
import { Box, OrbitControls } from "@react-three/drei";
import Lidar from "./Lidar";

const Scene = () => {
  const walls =
    useRef<
      Mesh<BufferGeometry<NormalBufferAttributes>, Material, Object3DEventMap>
    >(null);
  const box =
    useRef<
      Mesh<BufferGeometry<NormalBufferAttributes>, Material, Object3DEventMap>
    >(null);

  return (
    <>
      <Box ref={box} position={[-2, 0, -1]}>
        <meshBasicMaterial opacity={0} transparent />
      </Box>

      <Box ref={walls} args={[10, 1, 8]}>
        <meshBasicMaterial side={BackSide} opacity={0} transparent />
      </Box>

      <Lidar refs={[walls, box]} />
    </>
  );
};

const App = () => (
  <Canvas>
    <OrbitControls />
    <Scene />
  </Canvas>
);

export default App;
