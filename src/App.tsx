import { Vector3, Euler, BufferGeometry, Color, RepeatWrapping } from "three";
import { Canvas } from "@react-three/fiber";
import { Box, OrbitControls, Plane, useTexture } from "@react-three/drei";
import Lidar from "./Lidar";
import { useControls } from "leva";
import { useGLTF } from "@react-three/drei";
import { useRef } from "react";

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

const lidarDisplayPosition = new Vector3(0, 0.5, 0);

type Node = {
  geometry: BufferGeometry;
};

const Deck = ({ debug }: SceneProps) => {
  // @ts-expect-error The GLTF type is wrong 🤷
  const { nodes: floorNodes, materials: floorMaterials } =
    useGLTF("/floor.glb");
  // @ts-expect-error The GLTF type is wrong 🤷
  const { nodes: wallNodes, materials: wallMaterials } = useGLTF("/wall.glb");
  // @ts-expect-error The GLTF type is wrong 🤷
  const { nodes: columnNodes, materials: columnMaterials } =
    useGLTF("/column.glb");

  const paddedTextures = useTexture(
    {
      diffuse: "/padded_diffuse.jpg",
      ambientOcclusion: "/padded_ao.jpg",
      metalness: "/padded_metallic.jpg",
      roughness: "/padded_roughness.jpg",
      normal: "/padded_normal.jpg",
      height: "/padded_height.png",
    },
    (textures) => {
      (Array.isArray(textures) ? textures : [textures]).forEach((texture) => {
        texture.wrapS = RepeatWrapping;
        texture.wrapT = RepeatWrapping;
      });
    }
  );

  const metalTextures = useTexture(
    {
      diffuse: "/metal_diffuse.jpg",
      ambientOcclusion: "/metal_ao.jpg",
      metalness: "/metal_metallic.jpg",
      roughness: "/metal_roughness.jpg",
      normal: "/metal_normal.jpg",
      height: "/metal_height.png",
    },
    (textures) => {
      (Array.isArray(textures) ? textures : [textures]).forEach((texture) => {
        texture.wrapS = RepeatWrapping;
        texture.wrapT = RepeatWrapping;
      });
    }
  );

  const targetRef = useRef(null);

  return (
    <group>
      <object3D ref={targetRef} position={[0, 10, 0]} />
      {targetRef.current && (
        <spotLight
          position={lidarDisplayPosition}
          target={targetRef.current}
          castShadow
          angle={Math.PI / 2}
          penumbra={0.1}
          decay={2.5}
          distance={2}
          color={new Color(0x9999ff)}
          intensity={debug ? 3 : 2}
        />
      )}
      {
        <ambientLight
          intensity={debug ? 0.5 : 0.1}
          color={new Color(debug ? 0xffffff : 0x9999ff)}
        />
      }

      <Box args={[0.5, 0.5, 0.5]} position={[0, 0.25, 0]}>
        <meshStandardMaterial
          color={floorMaterials.DarkGrey.color}
          map={paddedTextures.diffuse}
          aoMap={paddedTextures.ambientOcclusion}
          normalMap={paddedTextures.normal}
        />
      </Box>

      {Object.entries<Node>(floorNodes).map(([key, node]) => (
        <mesh key={key} geometry={node.geometry} castShadow receiveShadow>
          <meshStandardMaterial
            color={
              key !== "Plane014_1"
                ? floorMaterials.Main.color
                : floorMaterials.DarkGrey.color
            }
          />
        </mesh>
      ))}

      {Object.entries<Node>(wallNodes).map(([key, node]) => (
        <mesh
          key={key}
          geometry={node.geometry}
          rotation={[0, Math.PI, 0]}
          position={[0, 0, 1]}
          scale={0.5}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial
            map={
              key === "Plane111_1"
                ? paddedTextures.diffuse
                : metalTextures.diffuse
            }
            aoMap={
              key === "Plane111_1"
                ? paddedTextures.ambientOcclusion
                : metalTextures.ambientOcclusion
            }
            normalMap={
              key === "Plane111_1"
                ? paddedTextures.normal
                : metalTextures.normal
            }
            roughnessMap={
              key === "Plane111_1"
                ? paddedTextures.roughness
                : metalTextures.roughness
            }
            metalnessMap={
              key === "Plane111_1"
                ? paddedTextures.metalness
                : metalTextures.metalness
            }
            color={
              key === "Plane111_2"
                ? "black"
                : key === "Plane111_3"
                ? wallMaterials.DarkGrey.color
                : "white"
            }
          />
        </mesh>
      ))}

      {Object.entries<Node>(wallNodes).map(([key, node]) => (
        <mesh
          key={key}
          geometry={node.geometry}
          rotation={[0, Math.PI * 0.5, 0]}
          position={[-1, 0, 0]}
          scale={0.5}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial
            map={
              key === "Plane111_1"
                ? paddedTextures.diffuse
                : metalTextures.diffuse
            }
            aoMap={
              key === "Plane111_1"
                ? paddedTextures.ambientOcclusion
                : metalTextures.ambientOcclusion
            }
            normalMap={
              key === "Plane111_1"
                ? paddedTextures.normal
                : metalTextures.normal
            }
            roughnessMap={
              key === "Plane111_1"
                ? paddedTextures.roughness
                : metalTextures.roughness
            }
            metalnessMap={
              key === "Plane111_1"
                ? paddedTextures.metalness
                : metalTextures.metalness
            }
            color={
              key === "Plane111_2"
                ? "black"
                : key === "Plane111_3"
                ? wallMaterials.DarkGrey.color
                : "white"
            }
          />
        </mesh>
      ))}

      {Object.entries<Node>(columnNodes).map(([key, node]) => (
        <mesh
          key={key}
          geometry={node.geometry}
          position={[-1, 0, 1]}
          scale={0.5}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial
            color={
              key === "Plane266"
                ? columnMaterials.DarkGrey.color
                : columnMaterials.Main.color
            }
          />
        </mesh>
      ))}
    </group>
  );
};

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
        x: 0,
        y: 0,
      },
      x: { step: 0.01 },
      y: { step: 0.01 },
    },
    scene: {
      value: "complex",
      options: ["none", "simple", "pilar", "wall", "floor", "complex"],
    },
  });

  const lidarRotation = new Euler(0, Math.PI, 0);
  const scenePosition = new Vector3(0, 0, 10);

  return (
    <>
      <group position={scenePosition}>
        {scene === "simple" && <Simple debug={debug} />}
        {scene === "pilar" && <Pilar debug={debug} />}
        {scene === "wall" && <Wall debug={debug} />}
        {scene === "floor" && <Floor debug={debug} />}
        {scene === "complex" && <Complex debug={debug} />}
      </group>

      <Deck debug={debug} />

      <Lidar
        resolution={lidarResolution}
        sensorPosition={
          new Vector3(
            lidarPosition.x + scenePosition.x,
            scenePosition.y,
            lidarPosition.y + scenePosition.z
          )
        }
        sensorRotation={lidarRotation}
        displayPosition={
          new Vector3(
            lidarDisplayPosition.x,
            // Artificial elevation to fake the drone hovering
            lidarDisplayPosition.y + 0.05,
            lidarDisplayPosition.z
          )
        }
        displayRotation={new Euler(0, 0, 0)}
        displayScale={0.05}
        size={0.1}
        range={4.2}
        debug={debug}
      />
    </>
  );
};

const App = () => (
  <Canvas shadows>
    <OrbitControls target={lidarDisplayPosition} />
    <Scene />
  </Canvas>
);

export default App;
