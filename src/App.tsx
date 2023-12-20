import { Vector3, Euler, NoToneMapping } from "three";
import { Canvas } from "@react-three/fiber";
import { Box, OrbitControls, Plane } from "@react-three/drei";
import Lidar from "./Lidar";
import { useControls } from "leva";

type SceneProps = {
  debug: boolean;
};

const Simple = ({ debug }: SceneProps) => (
  <Box args={[0.5, 0.1, 3.7]} position={[0, -0.55, 2.35]}>
    <meshBasicMaterial color="green" opacity={debug ? 1 : 0} transparent />
  </Box>
);

const Pilar = ({ debug }: SceneProps) => (
  <Box args={[0.5, 3.7, 0.1]} position={[0, 0, 2.35]}>
    <meshBasicMaterial color="green" opacity={debug ? 1 : 0} transparent />
  </Box>
);

const Wall = ({ debug }: SceneProps) => (
  <Box
    args={[10, 10, 0.1]}
    rotation={[0, Math.PI * 1, 0]}
    position={[0, 0, 2.5 + 0.5]}
  >
    <meshBasicMaterial color="green" opacity={debug ? 1 : 0} transparent />
  </Box>
);

const Floor = ({ debug }: SceneProps) => (
  <Box
    args={[10, 10, 0.1]}
    rotation={[Math.PI * 1.5, 0, 0]}
    position={[0, -0.75, 0]}
  >
    <meshBasicMaterial color="green" opacity={debug ? 1 : 0} transparent />
  </Box>
);

const Complex = ({ debug }: SceneProps) => (
  <>
    <Box args={[0.25, 0.25, 0.25]} position={[0, -0.5, 0.626]}>
      <meshBasicMaterial color="purple" opacity={debug ? 1 : 0} transparent />
    </Box>

    <Box position={[1, 0.5, 1.5]}>
      <meshBasicMaterial color="darkblue" opacity={debug ? 1 : 0} transparent />
    </Box>

    <Box position={[1, -0.75, 2]}>
      <meshBasicMaterial color="darkred" opacity={debug ? 1 : 0} transparent />
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
      <meshBasicMaterial color="red" opacity={debug ? 1 : 0} transparent />
    </Plane>

    <Plane
      args={[10, 10]}
      rotation={[0, Math.PI * 0.5, 0]}
      position={[-1, -0.75, 5]}
    >
      <meshBasicMaterial color="green" opacity={debug ? 1 : 0} transparent />
    </Plane>
  </>
);

const Scene = () => {
  const { debug, lidarResolution, scene, lidarPosition } = useControls({
    debug: true,
    lidarResolution: {
      label: "Lidar resolution",
      min: 8,
      max: 512,
      value: 128,
    },
    lidarPosition: {
      label: "Lidar position",
      value: {
        x: 0.5,
        y: 0,
      },
      x: { step: 0.1 },
      y: { step: 0.1 },
    },
    scene: {
      value: "simple",
      options: ["none", "simple", "pilar", "wall", "floor", "complex"],
    },
  });

  const lidarRotation = new Euler(0, Math.PI, 0);

  return (
    <>
      {scene === "simple" && <Simple debug={debug} />}
      {scene === "pilar" && <Pilar debug={debug} />}
      {scene === "wall" && <Wall debug={debug} />}
      {scene === "floor" && <Floor debug={debug} />}
      {scene === "complex" && <Complex debug={debug} />}

      <Lidar
        resolution={lidarResolution}
        position={new Vector3(lidarPosition.x, 0, lidarPosition.y)}
        rotation={lidarRotation}
        size={0.5}
        range={4.2}
        debug={debug}
      />
    </>
  );
};

const App = () => (
  <Canvas
    gl={{
      // We remove the default tone mapping to fully control the colors
      toneMapping: NoToneMapping,
    }}
  >
    <OrbitControls />
    <Scene />
  </Canvas>
);

export default App;
