varying vec4 vertexPosition;

// We assume the camera viewport is a square with an angle of 90°
float angle = radians(45.0);
// TODO: pass these as a uniform
float near = 0.5;
float far = 4.2;

void main() {
    vec4 vertexWorldPosition = modelMatrix * vec4(position, 1.0);
    float z = distance(vertexWorldPosition.z, cameraPosition.z) - near;
    vertexPosition = vec4(z / far, z / far, z / far, 1.0);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
