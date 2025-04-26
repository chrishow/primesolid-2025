precision mediump float;

uniform sampler2D u_texture;
uniform float u_time; // Optional: for potential subtle animations
uniform vec2 u_resolution;
uniform float u_curvature; // Control the amount of curve

varying vec2 v_texCoord;

// Function to apply barrel distortion
vec2 barrelDistortion(vec2 uv, float strength) {
    vec2 center = vec2(0.5, 0.5);
    vec2 diff = uv - center;
    float dist = length(diff);
    // Apply distortion: move points away from center based on distance squared
    // Adjust strength and formula as needed for desired curve
    vec2 distortedUv = uv + diff * dist * dist * strength;
    return distortedUv;
}

void main() {
    // Normalize texture coordinates to range [-1, 1] if needed, or keep [0, 1]
    vec2 uv = v_texCoord;

    // Flip Y coordinate because texture coordinates often start from top-left
    uv.y = 1.0 - uv.y;

    // Apply barrel distortion for the CRT curve effect
    float curvatureStrength = 0.2; // Adjust this value for more/less curve
    vec2 distortedUv = barrelDistortion(uv, curvatureStrength);

    vec4 color = vec4(0.0); // Default to transparent black

    // Check if the distorted coordinates are within the valid range [0, 1]
    if (distortedUv.x >= 0.0 && distortedUv.x <= 1.0 && distortedUv.y >= 0.0 && distortedUv.y <= 1.0) {
        color = texture2D(u_texture, distortedUv);
    } else {
        // Optional: Add a subtle vignette or border effect outside the main texture
        // color = vec4(0.0, 0.0, 0.0, 1.0); // Opaque black border
    }

    // Optional: Add scanline effect
    // float scanline = mod(v_texCoord.y * u_resolution.y * 0.5, 2.0);
    // color.rgb *= 1.0 - smoothstep(0.9, 1.1, scanline) * 0.1;

    // Optional: Add subtle noise or other CRT effects
    // float noise = fract(sin(dot(v_texCoord + u_time * 0.01, vec2(12.9898, 78.233))) * 43758.5453);
    // color.rgb += noise * 0.02;

    gl_FragColor = color;
}
