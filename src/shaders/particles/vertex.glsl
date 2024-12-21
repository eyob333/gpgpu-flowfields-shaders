attribute vec2 aUvParticles;
attribute vec3 aColor;
attribute float aSize;

uniform vec2 uResolution;
uniform float uSize;
uniform sampler2D uParticleTextue;

varying vec3 vColor;

void main(){
    vec4 particle = texture(uParticleTextue, aUvParticles);

    // Final position
    vec4 modelPosition = modelMatrix * vec4(particle.xyz, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;
    gl_Position = projectedPosition;

    // Point size
    gl_PointSize = aSize * uSize * uResolution.y;
    gl_PointSize *= (1.0 / - viewPosition.z);

    // Varyings
    vColor =aColor;
}