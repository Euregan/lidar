import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef, useEffect, MutableRefObject, useState } from "react";
import {
  WebGLRenderTarget,
  PerspectiveCamera,
  SphereGeometry,
  Vector3,
  CameraHelper,
  Euler,
  InstancedMesh,
  BufferGeometry,
  NormalBufferAttributes,
  Material,
  Object3D,
  Vector4,
  Color,
  Scene,
  WebGLRenderer,
  ShaderMaterial,
} from "three";
import { useHelper } from "@react-three/drei";
import vertexShader from "./lidar.vert.glsl";
import fragmentShader from "./lidar.frag.glsl";

const render = (
  instancedMesh: InstancedMesh<
    BufferGeometry<NormalBufferAttributes>,
    Material
  >,
  depthCamera: PerspectiveCamera,
  scene: Scene,
  gl: WebGLRenderer,
  renderTarget: WebGLRenderTarget,
  resolution: number,
  points: Array<Vector3>,
  lidarDirection: Vector3,
  size: number,
  range: number,
  position: Vector3
): Array<Vector4> => {
  const depthMaterial = new ShaderMaterial({
    vertexShader,
    fragmentShader,
  });

  // If there are LIDAR points projected, we remove them so they don't get their depth calculated
  instancedMesh.count = 0;
  scene.overrideMaterial = depthMaterial;
  gl.setRenderTarget(renderTarget);
  gl.render(scene, depthCamera);
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

  const coordinates = new Vector4();

  return points.reduce((points, point) => {
    // For now, we only keep the points in the front quadran
    const horizontalAngle = lidarDirection.angleTo(
      new Vector3(point.x, 0, point.z)
    );
    if (horizontalAngle > Math.PI * 0.25) {
      return points;
    }

    const verticalAngle = lidarDirection.angleTo(
      new Vector3(0, point.y, point.z)
    );

    if (verticalAngle > Math.PI * 0.25) {
      return points;
    }

    const horizontalDirection = point.x > position.x ? -1 : 1;
    const verticalDirection = point.y > position.y ? -1 : 1;

    const xOnDepthCameraNearPlane =
      Math.sin(horizontalAngle) *
      (size / Math.cos(horizontalAngle)) *
      horizontalDirection;
    const yOnDepthCameraNearPlane =
      Math.sin(verticalAngle) *
      (size / Math.cos(verticalAngle)) *
      verticalDirection;

    const x = Math.round((xOnDepthCameraNearPlane + 0.5) * resolution);
    const y = Math.round((yOnDepthCameraNearPlane + 0.5) * resolution);

    const offset = x * 4 + y * resolution * 4;
    coordinates
      .fromArray(depthValues.slice(offset, offset + 4))
      .divideScalar(255);

    if (coordinates.z === 0) {
      return points;
    }

    const length = coordinates.z * range + size;

    return points.concat(
      new Vector4(
        Math.tan(horizontalAngle) * length * -horizontalDirection,
        Math.tan(verticalAngle) * length * verticalDirection,
        length,
        coordinates.z
      )
    );
  }, [] as Array<Vector4>);
};

type LidarProps = {
  resolution: number;
  position: Vector3;
  rotation: Euler;
  size: number;
  range: number;
  debug?: boolean;
};

const Lidar = ({
  resolution,
  position,
  rotation,
  size,
  range,
  debug = false,
}: LidarProps) => {
  const instancedMeshRef =
    useRef<InstancedMesh<BufferGeometry<NormalBufferAttributes>, Material>>(
      null
    );
  const depthCameraRef = useRef<PerspectiveCamera>(null);

  const lidarRadius = size / 2;

  const lidar = useMemo(() => {
    const lidar = new SphereGeometry(
      lidarRadius,
      resolution * 2,
      resolution / 2,
      0,
      Math.PI * 2,
      Math.PI * 0.25,
      Math.PI - Math.PI * 0.4
    );
    // lidar.rotateZ(Math.PI * 0.5);
    return lidar;
  }, [lidarRadius, resolution]);

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

  const { gl, scene, raycaster, camera } = useThree();

  const [frontPoints, setFrontPoints] = useState<Array<Vector4>>([]);

  const renderTarget = useMemo(
    () => new WebGLRenderTarget(resolution, resolution),
    [resolution]
  );

  useEffect(() => {
    // This is where we update the LIDAR points position
    if (depthCameraRef.current && instancedMeshRef.current) {
      setFrontPoints(
        render(
          instancedMeshRef.current,
          depthCameraRef.current,
          scene,
          gl,
          renderTarget,
          resolution,
          points,
          lidarDirection,
          size,
          range,
          position
        )
      );
    }
  }, [
    gl,
    renderTarget,
    scene,
    rotation,
    position,
    points,
    lidarDirection,
    lidarRadius,
    size,
    raycaster.ray,
    resolution,
    range,
    debug,
  ]);

  useHelper(
    debug ? (depthCameraRef as MutableRefObject<PerspectiveCamera>) : false,
    CameraHelper
  );

  // TODO: Replace this with a billboard vertex shader
  useFrame(() => {
    if (instancedMeshRef.current) {
      const temp = new Object3D();

      instancedMeshRef.current.count = frontPoints.length;

      for (let i = 0; i < frontPoints.length; i++) {
        const point = frontPoints[i];
        temp.position.set(point.x, point.y, point.z);
        temp.updateMatrix();
        temp.quaternion.copy(camera.quaternion);
        instancedMeshRef.current.setMatrixAt(i, temp.matrix);
        instancedMeshRef.current.setColorAt(
          i,
          new Color(0, 1 - point.w, point.w)
        );
      }

      instancedMeshRef.current.instanceMatrix.needsUpdate = true;
      if (instancedMeshRef.current.instanceColor) {
        instancedMeshRef.current.instanceColor.needsUpdate = true;
      }
    }
  });

  return (
    <>
      <perspectiveCamera
        ref={depthCameraRef}
        args={[90, 1, size, range]}
        position={position}
        rotation={rotation}
      />

      <instancedMesh
        ref={instancedMeshRef}
        args={[undefined, undefined, points.length]}
        frustumCulled={false}
      >
        <planeGeometry args={[0.0125, 0.0125]} />
        <meshBasicMaterial />
      </instancedMesh>
    </>
  );
};

export default Lidar;
