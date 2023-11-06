import { useThree } from "@react-three/fiber";
import { useMemo, useRef, useEffect, MutableRefObject } from "react";
import {
  WebGLRenderTarget,
  PerspectiveCamera,
  Object3D,
  SphereGeometry,
  Vector3,
  InstancedMesh,
  BufferGeometry,
  NormalBufferAttributes,
  Material,
  MeshDepthMaterial,
  CameraHelper,
  Euler,
} from "three";
import { useHelper } from "@react-three/drei";

type LidarProps = {
  resolution: number;
  position: Vector3;
  rotation: Euler;
  debug?: boolean;
};

const Lidar = ({
  resolution,
  position,
  rotation,
  debug = false,
}: LidarProps) => {
  const instancedMeshRef =
    useRef<InstancedMesh<BufferGeometry<NormalBufferAttributes>, Material>>(
      null
    );
  const cameraRef = useRef<PerspectiveCamera>(null);

  const lidar = useMemo(() => {
    const lidar = new SphereGeometry(
      1,
      resolution,
      resolution,
      0,
      Math.PI * 2,
      Math.PI * 0.25,
      Math.PI - Math.PI * 0.4
    );
    lidar.rotateZ(Math.PI * 0.5);
    return lidar;
  }, [resolution]);

  const points = useMemo(() => {
    const points: Array<Vector3> = [];
    for (let i = 0; i < lidar.attributes.position.array.length; i += 3) {
      points.push(
        new Vector3(
          lidar.attributes.position.array[i],
          lidar.attributes.position.array[i + 1],
          lidar.attributes.position.array[i + 2]
        )
      );
    }
    return points;
  }, [lidar]);

  const lidarDirection = useMemo(() => new Vector3(0, 0, 1), []);

  // We use 6 cameras to scan all around the LIDAR, so we split the points in 6 arrays
  const frontPoints = useMemo(
    () =>
      points.filter(
        (point) =>
          // Testing for the horizontal angle
          lidarDirection.angleTo(new Vector3(point.x, 0, point.z)) <=
            Math.PI * 0.25 &&
          // Testing for the vertical angle
          lidarDirection.angleTo(new Vector3(0, point.y, point.z)) <=
            Math.PI * 0.25
      ),
    [lidarDirection, points]
  );

  useEffect(() => {
    if (instancedMeshRef.current) {
      const temp = new Object3D();
      for (let i = 0; i < frontPoints.length; i++) {
        const point = frontPoints[i];
        temp.position.set(point.x, point.y, point.z);
        temp.updateMatrix();
        instancedMeshRef.current.setMatrixAt(i, temp.matrix);
      }
      instancedMeshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [frontPoints]);

  const { gl, scene } = useThree();

  const renderTarget = useMemo(
    () => new WebGLRenderTarget(resolution, resolution),
    [resolution]
  );

  useEffect(() => {
    if (cameraRef.current) {
      const depthMaterial = new MeshDepthMaterial();

      scene.overrideMaterial = depthMaterial;
      gl.setRenderTarget(renderTarget);
      gl.render(scene, cameraRef.current);
      gl.setRenderTarget(null);
      scene.overrideMaterial = null;

      const depthValues = new Uint8Array(resolution * resolution * 4);
      gl.readRenderTargetPixels(
        renderTarget,
        0,
        0,
        resolution,
        resolution,
        depthValues
      );
    }
  }, [gl, renderTarget, resolution, scene, rotation, position]);

  useHelper(
    debug ? (cameraRef as MutableRefObject<PerspectiveCamera>) : false,
    CameraHelper
  );

  return (
    <>
      <perspectiveCamera
        ref={cameraRef}
        args={[45, 1, 0.5, 4.2]}
        position={position}
        rotation={rotation}
      />

      {debug && (
        <mesh position={position} rotation={rotation}>
          <planeGeometry />
          <meshBasicMaterial map={renderTarget.texture} />
        </mesh>
      )}

      <instancedMesh
        ref={instancedMeshRef}
        args={[undefined, undefined, points.length]}
      >
        <sphereGeometry args={[0.0125, 8, 8]} />
      </instancedMesh>
    </>
  );
};

export default Lidar;
