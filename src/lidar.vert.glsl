varying vec4 vertexWorldPosition;

void main() {
    vertexWorldPosition = (modelMatrix * vec4(position, 1.0));

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
