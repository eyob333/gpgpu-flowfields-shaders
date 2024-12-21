#include  ../includes/simplexNoise4d.glsl

uniform float uTime;
uniform float uDeltaTime;
uniform sampler2D uBase;
uniform float uFlowFieldInfluence;
uniform float uFlowFieldStrength;
uniform float uFlowFieldFrequency;


void main(){
    float time = uTime * 0.2;
    vec2 uv = gl_FragCoord.xy/ resolution.xy;
    vec4 particle = texture(uParticle,uv);
    vec4 baseParticle = texture(uBase, uv);    

    // Dead
    if (particle.a >= 1.0 ){     
        particle.a = mod(particle.a, 1.);        
        particle.xyz = baseParticle.xyz;  

    }

    else {
        /// strength
        float strength = simplexNoise4d( vec4(baseParticle.xyz * .2, time + 1.));
        strength = smoothstep(.0, 1., strength);

        // influence
        float influence = (uFlowFieldInfluence - .5) * ( -2.);
        strength = smoothstep( influence, 1., strength);

        vec3 flowField = vec3( 
            simplexNoise4d(vec4(particle.xyz * uFlowFieldFrequency + 0., time)), 
            simplexNoise4d(vec4(particle.xyz * uFlowFieldFrequency + 1., time)), 
            simplexNoise4d(vec4(particle.xyz * uFlowFieldFrequency + 2., time))
        );
        flowField = normalize(flowField);
        particle.xzy += flowField * strength * uDeltaTime * uFlowFieldStrength;    

        //decay
        particle.a += uDeltaTime * .3;

    }





    gl_FragColor = particle;
}