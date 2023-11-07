import { Vector3, Euler } from "three";
import { Canvas } from "@react-three/fiber";
import { Box, OrbitControls, Plane } from "@react-three/drei";
import Lidar from "./Lidar";
import { useControls } from "leva";

const Scene = () => {
  const { debug, lidarResolution } = useControls({
    debug: true,
    lidarResolution: {
      label: "Lidar resolution",
      min: 8,
      max: 2048,
      value: 128,
    },
  });

  const lidarPosition = new Vector3(0, 0, 0);
  const lidarRotation = new Euler(0, Math.PI, 0);

  return (
    <>
      <Box position={[-2, 0, -1]}>
        <meshBasicMaterial
          color="darkblue"
          opacity={debug ? 1 : 0}
          transparent
        />
      </Box>

      <Box position={[1, -0.75, 2]}>
        <meshBasicMaterial
          color="darkred"
          opacity={debug ? 1 : 0}
          transparent
        />
      </Box>

      <Plane
        args={[10, 10]}
        rotation={[Math.PI * 1.5, 0, 0]}
        position={[0, -0.75, 0]}
      >
        <meshBasicMaterial
          color="darkgreen"
          opacity={debug ? 1 : 0}
          transparent
        />
      </Plane>

      <Plane
        args={[10, 10]}
        rotation={[Math.PI * 0.75, 0, 0]}
        position={[0, -0.75, 5]}
      >
        <meshBasicMaterial
          color="darkgreen"
          opacity={debug ? 1 : 0}
          transparent
        />
      </Plane>

      <Lidar
        resolution={lidarResolution}
        position={lidarPosition}
        rotation={lidarRotation}
        size={0.5}
        range={4.2}
        debug={debug}
      />
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
