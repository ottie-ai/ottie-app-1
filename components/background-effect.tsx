'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GUI } from 'dat.gui';

// Pure RGB color definitions - extremely simplified
const colorPalettes = {
  original: {
    primary: [0.3, 0.3, 0.6], // Light blue
    secondary: [0.5, 0.4, 0.7] // Light purple
  },
  blue: {
    primary: [0.0, 0.0, 1.0], // Pure blue
    secondary: [0.4, 0.4, 1.0] // Light blue
  },
  purple: {
    primary: [0.6, 0.0, 0.8], // Purple
    secondary: [0.8, 0.3, 1.0] // Light purple
  },
  fire: {
    primary: [1.0, 0.4, 0.0], // Orange
    secondary: [1.0, 0.6, 0.1] // Light orange
  },
  green: {
    primary: [0.0, 1.0, 0.0], // Pure green
    secondary: [0.4, 1.0, 0.4] // Light green
  },
  rainbow: {
    primary: [1.0, 0.0, 1.0], // Magenta
    secondary: [0.0, 1.0, 1.0] // Cyan
  }
};

// Settings for GUI - Default values from newest screenshot
const settings = {
  intensity: 1.09,
  streakLength: 48,
  streakHeight: 0.23,
  glowPower: 2.75,
  useMousePosition: true,
  flareSize: 1.52,
  flareSpeed: 1.0,
  colorIntensity: 0.5,
  colorScheme: "fire",
  contrastBW: 0.0,
  saturation: 2.0,
  invert: false,
  cursorSize: 8,
  cursorIntensity: 2.0,
  resetPosition: () => {
    mouse.x = 0.5;
    mouse.y = 0.5;
  }
};

// Mouse position tracking
const mouse = new THREE.Vector2(0.5, 0.5);
const defaultMouse = new THREE.Vector2(0.5, 0.5);

// Variables for cursor tracking
let isMoving = false;
let lastMouseX = 0;
let lastMouseY = 0;
let mouseMoveTimeout: NodeJS.Timeout | null = null;

// FPS tracking variables
let frameCount = 0;
let lastTime = performance.now();

// Shader code
const vertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform vec2 iResolution;
  uniform float iTime;
  uniform vec2 iMouse;
  uniform float intensity;
  uniform float streakLength;
  uniform float streakHeight;
  uniform float glowPower;
  uniform float flareSize;
  uniform float colorIntensity;
  uniform vec3 primaryColor;
  uniform vec3 secondaryColor;
  uniform float contrastBW;
  uniform float saturation;
  uniform bool invert;
  varying vec2 vUv;

  // Noise function for flare variation
  float InterleavedGradientNoise(vec2 uv) {
    const vec3 magic = vec3(0.06711056, 0.00583715, 52.9829189);
    return fract(magic.z * fract(dot(uv, magic.xy)));
  }

  // Function to create glow effect
  float Interglow(in vec2 uv, in vec2 pos, in vec3 flex, in float power) {
    vec2 uvd = uv * (length(uv)) * flex.xy;
    float edge = (1.0 / (1.0 + flex.z * pow(length(uvd - pos), power)));
    return clamp(edge, 0.0, 1.0);
  }

  // Function to convert to black and white
  vec3 blackAndWhite(vec3 color, float amount) {
    float luminance = dot(color, vec3(0.299, 0.587, 0.114));
    vec3 bw = vec3(luminance);
    return mix(color, bw, amount);
  }

  // Function to adjust saturation
  vec3 adjustSaturation(vec3 color, float saturation) {
    float luminance = dot(color, vec3(0.299, 0.587, 0.114));
    return mix(vec3(luminance), color, saturation);
  }

  void main() {
    // Get coordinates
    vec2 uv = vUv;
    vec2 fragCoord = vUv * iResolution;

    // Use mouse position
    vec2 mm = iMouse;

    // Noise for variation
    float inz = InterleavedGradientNoise(fragCoord);

    // Streak parameters
    float ano_clampW = streakLength;
    float ano_clampH = streakHeight;

    // Base effect color - using white then tinting with color
    vec3 baseColor = vec3(1.0, 1.0, 1.0);

    // Output color
    vec3 outcol = vec3(0.0, 0.0, 0.0);

    // Create streak effect
    {
      const vec2 A = sin(vec2(0.0, 2.2));
      const mat2 Ar = mat2(A, -A.y, A.x);
      vec2 U = uv;
      U -= mm.xy;
      U = (abs(U * Ar) * mat2(0.0, 0.0, ano_clampW, ano_clampH));
      float lfStreak = 0.15 / max(U.x, U.y);

      // Fade in based on distance from center
      float fadein = smoothstep(0.8, 1.0, 1.0 - (length(vec2(0.5, 0.5) - mm) * 2.0 * flareSize));

      float xt = smoothstep(0.0, 1.1, lfStreak);

      // Calculate base white/gray effect
      outcol = baseColor * xt * (fadein * fadein * 2.0 * intensity);
    }

    // Add glow effects
    float xr1 = Interglow(vec2(-0.5, -0.5) + uv, uv - mm, vec3(2.2, 1.5, 24.0 + inz), 1.25);
    float xr2 = Interglow(vec2(-0.45, -0.55) + uv, uv - mm, vec3(4.2, 2.2, 28.0 + inz), 1.5);
    float xr3 = Interglow(vec2(-0.53, -0.46) + uv, uv - mm, vec3(1.4, 4.6, 16.0 + inz), 1.1);

    // Add more glows using base white color
    outcol += baseColor * xr1 * xr1 * colorIntensity;
    outcol += baseColor * xr2 * colorIntensity * 0.7;
    outcol += baseColor * pow(xr3 + (inz * 0.3335), glowPower) * colorIntensity;

    // AFTERWARDS we tint the whole effect with the primary color
    // This ensures the effect takes the color properly
    outcol *= primaryColor;

    // Apply saturation adjustment
    outcol = adjustSaturation(outcol, saturation);

    // Apply black and white effect
    outcol = blackAndWhite(outcol, contrastBW);

    // Clamp colors
    outcol = clamp(outcol, 0.0, 1.0);

    // Invert colors if enabled
    if (invert) {
      outcol = 1.0 - outcol;
    }

    gl_FragColor = vec4(outcol, outcol.r + outcol.g + outcol.b);
  }
`;

export default function BackgroundEffect() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const fpsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || typeof window === 'undefined') return;

    // Store the current ref value for cleanup
    const container = containerRef.current;

    // Initialize core Three.js components
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    // Initialize uniforms for shader
    const uniforms = {
      iResolution: {
        value: new THREE.Vector2(window.innerWidth, window.innerHeight)
      },
      iTime: { value: 0 },
      iMouse: { value: new THREE.Vector2(0.5, 0.5) },
      intensity: { value: settings.intensity },
      streakLength: { value: settings.streakLength },
      streakHeight: { value: settings.streakHeight },
      glowPower: { value: settings.glowPower },
      flareSize: { value: settings.flareSize },
      colorIntensity: { value: settings.colorIntensity },
      primaryColor: { value: new THREE.Vector3(0, 1, 0) }, // Pure green
      secondaryColor: { value: new THREE.Vector3(0.4, 1, 0.4) }, // Light green
      contrastBW: { value: settings.contrastBW },
      saturation: { value: settings.saturation },
      invert: { value: settings.invert }
    };

    // Create material and geometry
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      transparent: true
    });

    // Create mesh and add to scene
    const plane = new THREE.Mesh(geometry, material);
    scene.add(plane);

    // Function to update colors based on selected scheme
    function updateColors() {
      const palette = colorPalettes[settings.colorScheme as keyof typeof colorPalettes] || colorPalettes.green;
      // Update the uniforms with direct property assignment
      uniforms.primaryColor.value.x = palette.primary[0];
      uniforms.primaryColor.value.y = palette.primary[1];
      uniforms.primaryColor.value.z = palette.primary[2];
      uniforms.secondaryColor.value.x = palette.secondary[0];
      uniforms.secondaryColor.value.y = palette.secondary[1];
      uniforms.secondaryColor.value.z = palette.secondary[2];
      // Force material update
      material.needsUpdate = true;
    }

    // Make sure cursor is visible initially
    if (cursorRef.current) {
      cursorRef.current.style.opacity = "1";
    }

    // Handle mouse movement
    const handleMouseMove = (e: MouseEvent) => {
      if (settings.useMousePosition) {
        mouse.x = e.clientX / window.innerWidth;
        mouse.y = 1.0 - e.clientY / window.innerHeight; // Flip Y
      }

      // Update custom cursor position
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
      }

      // Check if mouse is actually moving
      if (e.clientX !== lastMouseX || e.clientY !== lastMouseY) {
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        // Update cursor state - active when moving
        cursorRef.current?.classList.add("active");
        cursorRef.current?.classList.remove("idle");
        isMoving = true;
        // Clear previous timeout
        if (mouseMoveTimeout) {
          clearTimeout(mouseMoveTimeout);
        }
        // Set timeout to detect when movement stops - slower to deactivate (500ms)
        mouseMoveTimeout = setTimeout(() => {
          isMoving = false;
          cursorRef.current?.classList.remove("active");
          cursorRef.current?.classList.add("idle");
        }, 500); // 500ms without movement = idle
      }
    };

    // Initialize cursor as visible but idle
    const handleLoad = () => {
      cursorRef.current?.classList.add("idle");
      // Initial color update
      updateColors();
    };

    // Handle window resize
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      renderer.setSize(width, height);
      uniforms.iResolution.value.set(width, height);
    };

    // GUI instance
    let gui: GUI;

    // Create GUI controls
    function createGUI() {
      gui = new GUI();

      // Flare parameters
      const flareFolder = gui.addFolder("Flare Settings");
      flareFolder
        .add(settings, "intensity", 0.1, 2.0)
        .name("Flare Intensity")
        .onChange(() => {
          uniforms.intensity.value = settings.intensity;
          material.needsUpdate = true;
        });
      flareFolder
        .add(settings, "streakLength", 1.0, 50.0)
        .name("Streak Length")
        .onChange(() => {
          uniforms.streakLength.value = settings.streakLength;
          material.needsUpdate = true;
        });
      flareFolder
        .add(settings, "streakHeight", 0.1, 2.0)
        .name("Streak Height")
        .onChange(() => {
          uniforms.streakHeight.value = settings.streakHeight;
          material.needsUpdate = true;
        });
      flareFolder
        .add(settings, "glowPower", 0.5, 5.0)
        .name("Glow Power")
        .onChange(() => {
          uniforms.glowPower.value = settings.glowPower;
          material.needsUpdate = true;
        });
      flareFolder
        .add(settings, "flareSize", 0.1, 3.0)
        .name("Flare Size")
        .onChange(() => {
          uniforms.flareSize.value = settings.flareSize;
          material.needsUpdate = true;
        });
      flareFolder.add(settings, "flareSpeed", 0.1, 5.0).name("Animation Speed");
      flareFolder.open();

      // Color parameters
      const colorFolder = gui.addFolder("Color Settings");
      colorFolder
        .add(settings, "colorScheme", [
          "original",
          "blue",
          "purple",
          "fire",
          "green",
          "rainbow"
        ])
        .name("Color Scheme")
        .onChange(() => {
          updateColors();
        });
      colorFolder
        .add(settings, "colorIntensity", 0.1, 0.5)
        .name("Color Intensity")
        .onChange(() => {
          uniforms.colorIntensity.value = settings.colorIntensity;
          material.needsUpdate = true;
        });
      colorFolder
        .add(settings, "contrastBW", 0.0, 1.0)
        .name("Black & White")
        .onChange(() => {
          uniforms.contrastBW.value = settings.contrastBW;
          material.needsUpdate = true;
        });
      colorFolder
        .add(settings, "saturation", 0.0, 2.0)
        .name("Saturation")
        .onChange(() => {
          uniforms.saturation.value = settings.saturation;
          material.needsUpdate = true;
        });
      colorFolder
        .add(settings, "invert")
        .name("Invert Colors")
        .onChange(() => {
          uniforms.invert.value = settings.invert;
          material.needsUpdate = true;
        });
      colorFolder.open();

      // Cursor and interaction
      const cursorFolder = gui.addFolder("Cursor & Controls");
      cursorFolder.add(settings, "useMousePosition").name("Use Mouse Position");
      cursorFolder.add(settings, "cursorSize", 8, 40).name("Cursor Size");
      cursorFolder.add(settings, "cursorIntensity", 0.1, 2.0).name("Cursor Glow");
      cursorFolder.add(settings, "resetPosition").name("Reset Position");
      cursorFolder.open();
    }

    // Initialize GUI
    createGUI();

    // Animation function
    function animate() {
      requestAnimationFrame(animate);

      // Update cursor size based on settings
      document.documentElement.style.setProperty(
        "--cursor-size",
        `${settings.cursorSize}px`
      );

      // Apply cursor glow effect
      if (cursorRef.current) {
        if (isMoving) {
          cursorRef.current.style.boxShadow = `0 0 ${20 * settings.cursorIntensity}px ${
            10 * settings.cursorIntensity
          }px rgba(255, 255, 255, ${0.8 * settings.cursorIntensity})`;
        } else {
          cursorRef.current.style.boxShadow = "none";
        }
      }

      // Update uniforms
      uniforms.iTime.value += 0.01 * settings.flareSpeed;
      uniforms.iMouse.value.set(mouse.x, mouse.y);

      // Update FPS counter
      if (fpsRef.current) {
        frameCount++;
        const currentTime = performance.now();
        const deltaTime = currentTime - lastTime;
        if (deltaTime >= 1000) {
          const fps = Math.round((frameCount * 1000) / deltaTime);
          fpsRef.current.textContent = `FPS: ${fps}`;
          frameCount = 0;
          lastTime = currentTime;
        }
      }

      // Render scene
      renderer.render(scene, camera);
    }

    // Add event listeners
    document.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("load", handleLoad);
    window.addEventListener("resize", handleResize);

    // Start animation
    animate();

    // Cleanup function
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("load", handleLoad);
      window.removeEventListener("resize", handleResize);
      if (gui) {
        gui.destroy();
      }
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      material.dispose();
      geometry.dispose();
    };
  }, []);

  return (
    <>
      {/* Content to be revealed */}
      <div className="content">
        <div className="quote-container">
          <div className="caption">Fragments of stardust, scattered across time.</div>
          <div className="quote">Luminous absence</div>
          <div className="author">The light reveals what darkness conceals, but never explains</div>
        </div>
      </div>

      {/* Custom cursor */}
      <div ref={cursorRef} className="custom-cursor" style={{ opacity: 1 }}></div>

      <div ref={fpsRef} id="fps">FPS: 0</div>

      {/* Canvas container for Three.js */}
      <div ref={containerRef} className="canvas-container"></div>
    </>
  );
}
