#include  ../includes/simplexNoise4d.glsl

uniform float uTime;
uniform uDeltaTime;
uniform sampler2D uBase;


void main(){
    vec2 uv = gl_FragCoord.xy/ resolution.xy;
    vec4 particle = texture(uParticle,uv);
    vec4 baseParticle = texture(uBase, uv);

    // Dead
    if (particle.a >= 1.0 ){        
        particle.a = 0.;
        particle.xyz = baseParticle.xyz;

    }

    else {
        vec3 flowField = vec3( 
            simplexNoise4d(vec4(particle.xyz + .0, uTime)), 
            simplexNoise4d(vec4(particle.xyz + 1., uTime)), 
            simplexNoise4d(vec4(particle.xyz + 2., uTime))
        );
        flowField = normalize(flowField);
        particle.xzy += flowField * .01;
        particle.a += 0.01;
    }


    //decay


    gl_FragColor = particle;
}