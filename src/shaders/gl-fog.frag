// Baed on shader by @patriciogv - 2015
// http://patriciogonzalezvivo.com

#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution; // GlslCanvas provides these automatically
uniform vec2 u_mouse;      // GlslCanvas provides these automatically
uniform float u_time;      // GlslCanvas provides these automatically
uniform float u_speed;     // Speed control from JS
uniform float u_customTime; // Custom time controlled by JS

uniform vec3 u_baseColor;
uniform vec3 u_lowlightColor;
uniform vec3 u_midtoneColor;
uniform vec3 u_highlightColor;

float random (in vec2 _st) {
    return fract(sin(dot(_st.xy,
                       vec2(0.129898,0.78233)))*
          437.585453123);
}

// Based on Morgan McGuire @morgan3d
// https://www.shadertoy.com/view/4dS3Wd
float noise (in vec2 _st) {
    vec2 i = floor(_st);
    vec2 f = fract(_st);

    // Four corners in 2D of a tile
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));

    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(a, b, u.x) +
            (c - a)* u.y * (1.0 - u.x) +
            (d - b) * u.x * u.y;
}

#define NUM_OCTAVES 5

float fbm ( in vec2 _st) {
    float blurFactor = 0.5;
    float v = 0.0;
    float a = blurFactor;
    vec2 shift = vec2(100.0);
    // Rotate to reduce axial bias
    mat2 rot = mat2(cos(0.5), sin(0.5),
                    -sin(0.5), cos(0.50));
    for (int i = 0; i < NUM_OCTAVES; ++i) {
        v += a * noise(_st);
        _st = rot * _st * 2.0 + shift;
        a *= (1. - blurFactor);
    }
    return v;
}

void main() {
    // Original normalized coordinates (0.0 to 1.0)
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;

    // Calculate current aspect ratio
    float aspect = u_resolution.x / u_resolution.y;
    vec2 st = uv;

    // Fix aspect ratio correction for fog effect
    // We want to maintain the same "density" of fog pattern regardless of screen shape
    if (aspect > 1.0) {
        // Wider than tall: compress x to maintain pattern density
        st.x = (st.x - 0.5) / aspect + 0.5;
    } else {
        // Taller than wide: compress y to maintain pattern density  
        st.y = (st.y - 0.5) * aspect + 0.5;
    }

    // Scale the corrected coordinates for the effect
    st *= 3.0; // You might adjust this scaling factor

    vec3 color = vec3(0.0);

    vec2 q = vec2(0.);
    q.x = fbm( st + 0.00*u_time);
    q.y = fbm( st + vec2(1.0));

    vec2 r = vec2(0.);
    // Use u_customTime instead of u_time * u_speed
    r.x = fbm( st + 1.0*q + vec2(1.7,9.2)+ 0.15*u_customTime ); 
    r.y = fbm( st + 1.0*q + vec2(8.3,2.8)+ 0.126*u_customTime );

    float f = fbm(st+r);

    color = mix(u_baseColor,
                u_lowlightColor,
                clamp((f*f)*4.0,0.0,1.0));

    color = mix(color,
                u_midtoneColor,
                clamp(length(q),0.0,1.0));

    color = mix(color,
                u_highlightColor,
                clamp(length(r.x),0.0,1.0));

    vec3 finalColor = mix(u_baseColor, color, f*f*f+.6*f*f+.5*f);                
    gl_FragColor = vec4(finalColor,1.0);
}