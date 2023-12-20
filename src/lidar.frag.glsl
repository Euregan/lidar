precision mediump float;

varying vec4 vertexWorldPosition;

// We assume the camera viewport is a square with an angle of 90°
float angle = radians(45.0);
// TODO: pass these as a uniform
float near = 0.1;
float far = 4.2;

void main() {
    float distanceFromCamera = distance(cameraPosition, vertexWorldPosition.xyz);

    if (distanceFromCamera == 0.0 || distanceFromCamera > far) {
        discard;
    }

    const vec4 bitShift = vec4(256.0 * 256.0 * 256.0, 256.0 * 256.0, 256.0, 1.0);
    const vec4 bitMask = vec4(0.0, 1.0 / 256.0, 1.0 / 256.0, 1.0 / 256.0);

    vec4 packedDistanceFromCamera = fract((distanceFromCamera / far) * bitShift);
    packedDistanceFromCamera -= packedDistanceFromCamera.xxyz * bitMask;

    gl_FragColor = packedDistanceFromCamera;
}
