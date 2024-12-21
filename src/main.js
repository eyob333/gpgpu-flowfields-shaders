import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import {GPUComputationRenderer} from 'three/addons/misc/GPUComputationRenderer.js'
import GUI from 'lil-gui'
import particlesVertexShader from './shaders/particles/vertex.glsl'
import particlesFragmentShader from './shaders/particles/fragment.glsl'
import gpgpuParticleShader from './shaders/gpgpu/particles.glsl'



/**
 * Base
 */
// Debug
const gui = new GUI({ width: 340 })
const debugObject = {}

// Canvas
const canvas = document.querySelector('canvas.webgl')


// Scene
const scene = new THREE.Scene()

// Loaders
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('/draco/')

const gltfLoader = new GLTFLoader()
gltfLoader.setDRACOLoader(dracoLoader)

//models
const shipModel = await gltfLoader.loadAsync('./model.glb')


/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight,
    pixelRatio: Math.min(window.devicePixelRatio, 2)
}

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight
    sizes.pixelRatio = Math.min(window.devicePixelRatio, 2)

    // Materials
    particles.material.uniforms.uResolution.value.set(sizes.width * sizes.pixelRatio, sizes.height * sizes.pixelRatio)

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(sizes.pixelRatio)
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(35, sizes.width / sizes.height, 0.1, 100)
camera.position.set(4.5, 4, 11)
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(sizes.pixelRatio)

debugObject.clearColor = '#29191f'
renderer.setClearColor(debugObject.clearColor)


/**
 * BaseGeometry
 */
const BaseGeometry = {}
BaseGeometry.instance = shipModel.scene.children[0].geometry
BaseGeometry.count = BaseGeometry.instance.attributes.position.count


/**
 * GpuCompute
 */
const gpgpu = {}
gpgpu.size = Math.ceil(Math.sqrt(BaseGeometry.count))
gpgpu.computation = new GPUComputationRenderer(gpgpu.size, gpgpu.size, renderer)

//baseParticles
const baseParticleTexture = gpgpu.computation.createTexture()

for(let i = 0; i < BaseGeometry.count; i++){

    const i3 = i * 3
    const i4 = i * 4

    //position beased on gemetry
    baseParticleTexture.image.data[i4 + 0] = BaseGeometry.instance.attributes.position.array[i3 + 0]
    baseParticleTexture.image.data[i4 + 1] = BaseGeometry.instance.attributes.position.array[i3 + 1]
    baseParticleTexture.image.data[i4 + 2] = BaseGeometry.instance.attributes.position.array[i3 + 2]
    baseParticleTexture.image.data[i4 + 3] =  Math.random()

}


//Particle Variable
gpgpu.particlesVariable = gpgpu.computation.addVariable('uParticle', gpgpuParticleShader, baseParticleTexture)
gpgpu.computation.setVariableDependencies(gpgpu.particlesVariable, [gpgpu.particlesVariable])

//unifors
gpgpu.particlesVariable.material.uniforms.uTime = new THREE.Uniform(0)
gpgpu.particlesVariable.material.uniforms.uDeltaTime = new THREE.Uniform(0)
gpgpu.particlesVariable.material.uniforms.uBase = new THREE.Uniform(baseParticleTexture)
gpgpu.particlesVariable.material.uniforms.uFlowFieldInfluence = new THREE.Uniform(0.5)
gpgpu.particlesVariable.material.uniforms.uFlowFieldStrength = new THREE.Uniform(2.)
gpgpu.particlesVariable.material.uniforms.uFlowFieldFrequency = new THREE.Uniform(.5)




//init
gpgpu.computation.init()

//debug
gpgpu.debug = new THREE.Mesh(
    new THREE.PlaneGeometry(3, 3),
    new THREE.MeshBasicMaterial({
        map: gpgpu.computation.getCurrentRenderTarget(gpgpu.particlesVariable).texture
    })
)
gpgpu.debug.position.x = 3
gpgpu.debug.visible = false
scene.add(gpgpu.debug)


/**
 * Particles
 */
const particles = {}

// Material
particles.material = new THREE.ShaderMaterial({
    vertexShader: particlesVertexShader,
    fragmentShader: particlesFragmentShader,
    uniforms:
    {
        uSize: new THREE.Uniform(0.06),
        uResolution: new THREE.Uniform(new THREE.Vector2(sizes.width * sizes.pixelRatio, sizes.height * sizes.pixelRatio)),
        uParticleTextue: new THREE.Uniform()
    }
})

//Geometry
const particlesUvArray = new Float32Array(BaseGeometry.count * 2)
const sizesArray = new Float32Array(BaseGeometry.count)

for ( let y = 0; y < gpgpu.size; y++ ){
    for( let x = 0; x < gpgpu.size; x++){
        const i = (y * gpgpu.size + x)
        const i2 = i * 2

        const uvX = ( x + .5) / gpgpu.size
        const uvY = ( y + .5) / gpgpu.size

        particlesUvArray[i2 + 0] = uvX
        particlesUvArray[i2 + 1] = uvY

        sizesArray[i] = Math.random()
    }
}

particles.geometry = new THREE.BufferGeometry()
particles.geometry.setDrawRange(0, BaseGeometry.count)

particles.geometry.setAttribute('aUvParticles', new THREE.BufferAttribute(particlesUvArray, 2))
particles.geometry.setAttribute('aSize', new THREE.BufferAttribute(sizesArray, 1))
particles.geometry.setAttribute('aColor', BaseGeometry.instance.attributes.color)

// Points
particles.points = new THREE.Points(particles.geometry, particles.material)
scene.add(particles.points)

/**
 * Tweaks
 */
gui.addColor(debugObject, 'clearColor').onChange(() => { renderer.setClearColor(debugObject.clearColor) })
gui.add(particles.material.uniforms.uSize, 'value').min(0).max(1).step(0.001).name('uSize')
gui.add(gpgpu.particlesVariable.material.uniforms.uFlowFieldInfluence, 'value').min(0).max(1).step(0.001).name('flowFieldInfluence')
gui.add(gpgpu.particlesVariable.material.uniforms.uFlowFieldStrength, 'value').min(0).max(10).step(0.001).name('flowFieldStrength')
gui.add(gpgpu.particlesVariable.material.uniforms.uFlowFieldFrequency, 'value').min(0).max(1).step(0.001).name('flowFieldFreqency')

/**
 * Animate
 */
const clock = new THREE.Clock()
let previousTime = 0

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()
    const deltaTime = elapsedTime - previousTime
    previousTime = elapsedTime
    
    // Update controls
    controls.update()

    //gpgpu update
    gpgpu.particlesVariable.material.uniforms.uTime.value = elapsedTime 
    gpgpu.particlesVariable.material.uniforms.uDeltaTime.value = deltaTime

    gpgpu.computation.compute()
    particles.material.uniforms.uParticleTextue.value = gpgpu.computation.getCurrentRenderTarget(gpgpu.particlesVariable).texture

    // Render normal scene
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()