precision mediump float;

attribute vec2 a_position;
varying vec2 v_texCoord;

void main() {
    // Simple pass-through, converting position to clip space
    gl_Position = vec4(a_position, 0.0, 1.0);
    // Calculate texture coordinates (0 to 1)
    v_texCoord = a_position * 0.5 + 0.5;
}
