import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef, MutableRefObject, useState } from "react";
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

const renderResolutionScale = 8;

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
  range: number,
  position: Vector3,
  scale: number
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

  const depthValues = new Uint8Array(
    resolution * renderResolutionScale * resolution * renderResolutionScale * 4
  );
  gl.readRenderTargetPixels(
    renderTarget,
    0,
    0,
    resolution * renderResolutionScale,
    resolution * renderResolutionScale,
    depthValues
  );

  const coordinates = new Vector4();

  return points.reduce((points, point) => {
    // We only keep the points in the front quadran
    const horizontalAngle = new Vector3(
      lidarDirection.x,
      0,
      lidarDirection.z
    ).angleTo(new Vector3(point.x, 0, point.z));

    const verticalAngle = new Vector3(
      0,
      lidarDirection.y,
      lidarDirection.z
    ).angleTo(new Vector3(0, point.y, point.z));

    const horizontalDirection = point.x > 0 ? -1 : 1;
    const verticalDirection = point.y > 0 ? -1 : 1;

    const xOnDepthCameraNearPlane =
      Math.sin(horizontalAngle) *
      (0.5 / Math.cos(horizontalAngle)) *
      horizontalDirection;
    const yOnDepthCameraNearPlane =
      Math.sin(verticalAngle) *
      (0.5 / Math.cos(verticalAngle)) *
      verticalDirection;

    const x = Math.round(
      (xOnDepthCameraNearPlane + 0.5) * resolution * renderResolutionScale
    );
    const y = Math.round(
      (yOnDepthCameraNearPlane + 0.5) * resolution * renderResolutionScale
    );

    const offset = x * 4 + y * resolution * renderResolutionScale * 4;
    coordinates
      .fromArray([
        depthValues[offset],
        depthValues[offset + 1],
        depthValues[offset + 2],
        depthValues[offset + 3],
      ])
      .divideScalar(255);

    // This should be matching the packing in the shader
    const bitShift = new Vector4(
      1.0 / (256.0 * 256.0 * 256.0),
      1.0 / (256.0 * 256.0),
      1.0 / 256.0,
      1.0
    );
    const distanceFromCamera = coordinates.dot(bitShift);

    if (
      isNaN(distanceFromCamera) ||
      distanceFromCamera === 0 ||
      distanceFromCamera === 1
    ) {
      return points;
    }

    const distance = distanceFromCamera * range * scale;
    const angle = lidarDirection.angleTo(point);
    const z = Math.cos(angle) * -distance;

    const finalPointPosition = new Vector3(
      -Math.tan(horizontalAngle) * z * horizontalDirection,
      -Math.tan(verticalAngle) * z * verticalDirection,
      z
    ).applyQuaternion(depthCamera.quaternion);

    points.push(
      new Vector4(
        finalPointPosition.x + position.x,
        finalPointPosition.y + position.y,
        finalPointPosition.z + position.z,
        distanceFromCamera
      )
    );

    return points;
  }, [] as Array<Vector4>);
};

type LidarProps = {
  resolution: number;
  sensorPosition: Vector3;
  sensorRotation: Euler;
  displayPosition: Vector3;
  displayRotation: Euler;
  displayScale: number;
  size: number;
  range: number;
  debug?: boolean;
};

const Lidar = ({
  resolution,
  sensorPosition,
  sensorRotation,
  displayPosition,
  displayScale,
  size,
  range,
  debug = false,
}: LidarProps) => {
  const instancedMeshRef =
    useRef<InstancedMesh<BufferGeometry<NormalBufferAttributes>, Material>>(
      null
    );
  const frontDepthCameraRef = useRef<PerspectiveCamera>(null);
  const leftDepthCameraRef = useRef<PerspectiveCamera>(null);
  const rightDepthCameraRef = useRef<PerspectiveCamera>(null);
  const backDepthCameraRef = useRef<PerspectiveCamera>(null);
  const topDepthCameraRef = useRef<PerspectiveCamera>(null);
  const bottomDepthCameraRef = useRef<PerspectiveCamera>(null);

  const lidar = useMemo(() => {
    const lidar = new SphereGeometry(
      size / 2,
      resolution * 2,
      resolution / 2,
      0,
      Math.PI * 2,
      Math.PI * 0.2,
      Math.PI - Math.PI * 0.4
    );

    return lidar;
  }, [size, resolution]);

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

  const { gl, scene, camera } = useThree();

  const [frontPoints, setFrontPoints] = useState<Array<Vector4>>([]);
  const [leftPoints, setLeftPoints] = useState<Array<Vector4>>([]);
  const [rightPoints, setRightPoints] = useState<Array<Vector4>>([]);
  const [backPoints, setBackPoints] = useState<Array<Vector4>>([]);
  const [topPoints, setTopPoints] = useState<Array<Vector4>>([]);
  const [bottomPoints, setBottomPoints] = useState<Array<Vector4>>([]);

  const renderTarget = useMemo(
    () =>
      new WebGLRenderTarget(
        resolution * renderResolutionScale,
        resolution * renderResolutionScale
      ),
    [resolution]
  );

  const sidePoints = useMemo(
    () =>
      points.filter((point) => {
        const horizontalAngle = new Vector3(0, 0, 1).angleTo(
          new Vector3(point.x, 0, point.z)
        );

        return (
          point.z > 0 &&
          (horizontalAngle < Math.PI * 0.25 ||
            // Dirty round up to prevent holes between sides
            (point.x > 0 && horizontalAngle <= Math.PI * 0.251)) &&
          new Vector3(0, 0, 1).angleTo(new Vector3(0, point.y, point.z)) <
            Math.PI * 0.25
        );
      }),
    [points]
  );
  const verticalPoints = useMemo(
    () =>
      points
        .filter((point) => {
          if (point.y < 0) {
            return false;
          }

          const verticalAngle = new Vector3(0, 0, 1).angleTo(
            new Vector3(0, point.y, point.z)
          );

          const otherAngle = new Vector3(1, 0, 0).angleTo(
            new Vector3(point.x, point.y, 0)
          );

          return (
            otherAngle >= Math.PI * 0.25 &&
            otherAngle <= Math.PI * 0.75 &&
            verticalAngle >= Math.PI * 0.25 &&
            verticalAngle <= Math.PI * 0.75
          );
        })
        .map((point) => point.applyEuler(new Euler(Math.PI * 0.5, 0, 0))),
    [points]
  );

  useHelper(
    debug
      ? (frontDepthCameraRef as MutableRefObject<PerspectiveCamera>)
      : false,
    CameraHelper
  );
  useHelper(
    debug ? (leftDepthCameraRef as MutableRefObject<PerspectiveCamera>) : false,
    CameraHelper
  );
  useHelper(
    debug
      ? (rightDepthCameraRef as MutableRefObject<PerspectiveCamera>)
      : false,
    CameraHelper
  );
  useHelper(
    debug ? (backDepthCameraRef as MutableRefObject<PerspectiveCamera>) : false,
    CameraHelper
  );

  // TODO: Replace part of this with a billboard vertex shader
  useFrame(() => {
    // This is where we update the LIDAR points position
    if (
      frontDepthCameraRef.current &&
      leftDepthCameraRef.current &&
      rightDepthCameraRef.current &&
      backDepthCameraRef.current &&
      topDepthCameraRef.current &&
      bottomDepthCameraRef.current &&
      instancedMeshRef.current
    ) {
      setLeftPoints(
        render(
          instancedMeshRef.current,
          leftDepthCameraRef.current,
          scene,
          gl,
          renderTarget,
          resolution,
          sidePoints,
          lidarDirection,
          range,
          displayPosition,
          displayScale
        )
      );

      setRightPoints(
        render(
          instancedMeshRef.current,
          rightDepthCameraRef.current,
          scene,
          gl,
          renderTarget,
          resolution,
          sidePoints,
          lidarDirection,
          range,
          displayPosition,
          displayScale
        )
      );

      setBackPoints(
        render(
          instancedMeshRef.current,
          backDepthCameraRef.current,
          scene,
          gl,
          renderTarget,
          resolution,
          sidePoints,
          lidarDirection,
          range,
          displayPosition,
          displayScale
        )
      );

      setTopPoints(
        render(
          instancedMeshRef.current,
          topDepthCameraRef.current,
          scene,
          gl,
          renderTarget,
          resolution,
          verticalPoints,
          lidarDirection,
          range,
          displayPosition,
          displayScale
        )
      );

      setBottomPoints(
        render(
          instancedMeshRef.current,
          bottomDepthCameraRef.current,
          scene,
          gl,
          renderTarget,
          resolution,
          verticalPoints,
          lidarDirection,
          range,
          displayPosition,
          displayScale
        )
      );

      // We run it last so we can debug the rendered texture from the front camera
      setFrontPoints(
        render(
          instancedMeshRef.current,
          frontDepthCameraRef.current,
          scene,
          gl,
          renderTarget,
          resolution,
          sidePoints,
          lidarDirection,
          range,
          displayPosition,
          displayScale
        )
      );
    }

    if (instancedMeshRef.current) {
      const temp = new Object3D();

      instancedMeshRef.current.count =
        frontPoints.length +
        leftPoints.length +
        rightPoints.length +
        backPoints.length +
        topPoints.length +
        bottomPoints.length;

      for (let i = 0; i < frontPoints.length; i++) {
        const point = frontPoints[i];
        temp.position.set(point.x, point.y, point.z);
        temp.scale.set(displayScale, displayScale, displayScale);
        temp.updateMatrix();
        temp.quaternion.copy(camera.quaternion);
        instancedMeshRef.current.setMatrixAt(i, temp.matrix);
        instancedMeshRef.current.setColorAt(
          i,
          new Color(0, 1 - point.w, point.w)
        );
      }
      for (let i = 0; i < leftPoints.length; i++) {
        const point = leftPoints[i];
        temp.position.set(point.x, point.y, point.z);
        temp.scale.set(displayScale, displayScale, displayScale);
        temp.updateMatrix();
        temp.quaternion.copy(camera.quaternion);
        instancedMeshRef.current.setMatrixAt(
          frontPoints.length + i,
          temp.matrix
        );
        instancedMeshRef.current.setColorAt(
          frontPoints.length + i,
          new Color(0, 1 - point.w, point.w)
        );
      }
      for (let i = 0; i < rightPoints.length; i++) {
        const point = rightPoints[i];
        temp.position.set(point.x, point.y, point.z);
        temp.scale.set(displayScale, displayScale, displayScale);
        temp.updateMatrix();
        temp.quaternion.copy(camera.quaternion);
        instancedMeshRef.current.setMatrixAt(
          frontPoints.length + leftPoints.length + i,
          temp.matrix
        );
        instancedMeshRef.current.setColorAt(
          frontPoints.length + leftPoints.length + i,
          new Color(0, 1 - point.w, point.w)
        );
      }
      for (let i = 0; i < backPoints.length; i++) {
        const point = backPoints[i];
        temp.position.set(point.x, point.y, point.z);
        temp.scale.set(displayScale, displayScale, displayScale);
        temp.updateMatrix();
        temp.quaternion.copy(camera.quaternion);
        instancedMeshRef.current.setMatrixAt(
          frontPoints.length + leftPoints.length + rightPoints.length + i,
          temp.matrix
        );
        instancedMeshRef.current.setColorAt(
          frontPoints.length + leftPoints.length + rightPoints.length + i,
          new Color(0, 1 - point.w, point.w)
        );
      }
      for (let i = 0; i < topPoints.length; i++) {
        const point = topPoints[i];
        temp.position.set(point.x, point.y, point.z);
        temp.scale.set(displayScale, displayScale, displayScale);
        temp.updateMatrix();
        temp.quaternion.copy(camera.quaternion);
        instancedMeshRef.current.setMatrixAt(
          frontPoints.length +
            leftPoints.length +
            rightPoints.length +
            backPoints.length +
            i,
          temp.matrix
        );
        instancedMeshRef.current.setColorAt(
          frontPoints.length +
            leftPoints.length +
            rightPoints.length +
            backPoints.length +
            i,
          new Color(0, 1 - point.w, point.w)
        );
      }
      for (let i = 0; i < bottomPoints.length; i++) {
        const point = bottomPoints[i];
        temp.position.set(point.x, point.y, point.z);
        temp.scale.set(displayScale, displayScale, displayScale);
        temp.updateMatrix();
        temp.quaternion.copy(camera.quaternion);
        instancedMeshRef.current.setMatrixAt(
          frontPoints.length +
            leftPoints.length +
            rightPoints.length +
            backPoints.length +
            topPoints.length +
            i,
          temp.matrix
        );
        instancedMeshRef.current.setColorAt(
          frontPoints.length +
            leftPoints.length +
            rightPoints.length +
            backPoints.length +
            topPoints.length +
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
        ref={frontDepthCameraRef}
        args={[90, 1, size, range]}
        position={sensorPosition}
        rotation={sensorRotation}
      />
      <perspectiveCamera
        ref={leftDepthCameraRef}
        args={[90, 1, size, range]}
        position={sensorPosition}
        rotation={[
          sensorRotation.x,
          sensorRotation.y + Math.PI * 0.5,
          sensorRotation.z,
        ]}
      />
      <perspectiveCamera
        ref={rightDepthCameraRef}
        args={[90, 1, size, range]}
        position={sensorPosition}
        rotation={[
          sensorRotation.x,
          sensorRotation.y + Math.PI * -0.5,
          sensorRotation.z,
        ]}
      />
      <perspectiveCamera
        ref={backDepthCameraRef}
        args={[90, 1, size, range]}
        position={sensorPosition}
        rotation={[
          sensorRotation.x,
          sensorRotation.y + Math.PI,
          sensorRotation.z,
        ]}
      />
      <perspectiveCamera
        ref={topDepthCameraRef}
        args={[90, 1, size, range]}
        position={sensorPosition}
        rotation={[
          sensorRotation.x + Math.PI * -0.5,
          sensorRotation.y,
          sensorRotation.z,
        ]}
      />
      <perspectiveCamera
        ref={bottomDepthCameraRef}
        args={[90, 1, size, range]}
        position={sensorPosition}
        rotation={[
          sensorRotation.x + Math.PI * 0.5,
          sensorRotation.y,
          sensorRotation.z,
        ]}
      />

      {debug && (
        <mesh position={sensorPosition} rotation={sensorRotation}>
          <planeGeometry />
          <meshBasicMaterial map={renderTarget.texture} />
        </mesh>
      )}

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
