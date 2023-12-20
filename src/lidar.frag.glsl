precision mediump float;

varying vec4 vertexWorldPosition;

// We assume the camera viewport is a square with an angle of 90°
float angle = radians(45.0);
// TODO: pass these as a uniform
float near = 0.1;
float far = 4.2;

void main() {
    float distanceFromCamera = distance(cameraPosition, vertexWorldPosition.xyz);

    gl_FragColor = vec4(distanceFromCamera / far);
}
