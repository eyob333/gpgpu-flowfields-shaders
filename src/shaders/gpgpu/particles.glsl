
void main(){
    vec2 uv = gl_FragCoord.xy/ resolution.xy;
    vec4 particle = texture(uParticle,uv);
    // particle.x += .01;
    gl_FragColor = particle;
}