import { BackSide, Vector3, Euler } from "three";
import { Canvas } from "@react-three/fiber";
import { Box, OrbitControls } from "@react-three/drei";
import Lidar from "./Lidar";

const Scene = () => {
  const lidarPosition = new Vector3(0, 0, 0);
  const lidarRotation = new Euler(0, Math.PI, 0);

  return (
    <>
      <Box position={[-2, 0, -1]}>
        <meshBasicMaterial color="darkblue" />
      </Box>

      <Box position={[1, 0, 2]}>
        <meshBasicMaterial color="darkred" />
      </Box>

      <Box args={[10, 1, 8]}>
        <meshBasicMaterial color="darkgreen" side={BackSide} />
      </Box>

      <Lidar resolution={8} position={lidarPosition} rotation={lidarRotation} />
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
