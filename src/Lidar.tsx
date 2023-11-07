import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef, useEffect, MutableRefObject, useState } from "react";
import {
  WebGLRenderTarget,
  PerspectiveCamera,
  SphereGeometry,
  Vector3,
  MeshDepthMaterial,
  CameraHelper,
  Euler,
  InstancedMesh,
  BufferGeometry,
  NormalBufferAttributes,
  Material,
  Object3D,
  Vector4,
  Color,
} from "three";
import { useHelper } from "@react-three/drei";

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

  const renderTarget = useMemo(
    () => new WebGLRenderTarget(resolution, resolution),
    [resolution]
  );

  const [frontPoints, setFrontPoints] = useState<Array<Vector4>>([]);

  useEffect(() => {
    // This is where we update the LIDAR points position
    if (depthCameraRef.current) {
      const depthMaterial = new MeshDepthMaterial();
      depthMaterial.onBeforeCompile = function (shader) {
        // the <packing> GLSL chunk from three.js has the packDeathToRGBA function.
        // then at the end of the shader the default MaterialBasicShader has
        // already read from the material's `map` texture (the depthTexture)
        // which has depth in 'r' and assigned it to gl_FragColor
        shader.fragmentShader = shader.fragmentShader
          .replace("#include <common>", "#include <common>")
          .replace(
            "#include <fog_fragment>",
            "gl_FragColor = packDepthToRGBA( gl_FragColor.r );"
          );
      };

      // If there are LIDAR points projected, we remove them so they don't get their depth calculated
      if (instancedMeshRef.current) {
        instancedMeshRef.current.count = 0;
      }
      scene.overrideMaterial = depthMaterial;
      gl.setRenderTarget(renderTarget);
      gl.render(scene, depthCameraRef.current);
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

      const frontPoints: Array<Vector4> = points.reduce((points, point) => {
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
        const depth =
          depthValues[offset] * (255 / 256 / (256 * 256 * 256)) +
          depthValues[offset + 1] * (255 / 256 / (256 * 256)) +
          depthValues[offset + 2] * (255 / 256 / 256);

        if (depth === 0) {
          return debug
            ? points.concat(
                new Vector4(
                  xOnDepthCameraNearPlane * -1,
                  yOnDepthCameraNearPlane,
                  0
                )
              )
            : points;
        }

        const length = (1 - depth) * range - size;

        return points.concat(
          new Vector4(
            Math.sin(horizontalAngle) * horizontalDirection * length * -1,
            Math.sin(verticalAngle) * verticalDirection * length,
            length,
            1 - depth
          )
        );
      }, [] as Array<Vector4>);

      setFrontPoints(frontPoints);
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
          new Color(0, point.w, 1 - point.w)
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

      {debug && (
        <mesh position={position} rotation={rotation}>
          <planeGeometry />
          <meshBasicMaterial
            map={renderTarget.texture}
            opacity={0.9}
            transparent
          />
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
