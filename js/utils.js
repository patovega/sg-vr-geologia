// utils.js - Archivo principal de utilidades para el Tour Virtual

// Configuración básica
let camera, scene, renderer;
let isUserInteracting = false,
    onPointerDownMouseX = 0,
    onPointerDownMouseY = 0,
    lon = 180,
    onPointerDownLon = 0,
    lat = 0,
    onPointerDownLat = 0,
    phi = 0,
    theta = 0;

const textureLoader = new THREE.TextureLoader();
let material; // Panorama material
let mesh;     // Panorama mesh

// Objetivos de elementos (extintores, etc.)
const elementsTargets = [
     
];

// Variables de animación de cámara
let isAnimatingCamera = false;
let animationDuration = 1000;
let animationStartTime = 0;
let startLon = 0, startLat = 0, targetLon = 0, targetLat = 0;

// Variables para el marcador de línea
let lineMarker;
const MARKER_DISTANCE = 490;
const MARKER_COLOR = 0x0000ff;

// Variables del estado actual
let currentSceneId = '1_';
let hotspots = [];

// Función principal de inicialización
function initTourVirtual() {
    init();
    animate();
}

function init() {
    if (!document.body) {
        console.error("El cuerpo del documento no está disponible. Esperando a que se cargue el DOM...");
        window.addEventListener('DOMContentLoaded', init);
        return;
    }
    const container = document.createElement('div');
    document.body.appendChild(container);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1100);
    camera.target = new THREE.Vector3(0, 0, 0);

    scene = new THREE.Scene();

    const geometry = new THREE.SphereGeometry(500, 60, 40);
    geometry.scale(-1, 1, 1);
    const texture = textureLoader.load(scenes.find(s => s.id === currentSceneId).filename);
    material = new THREE.MeshBasicMaterial({ map: texture });
 
    mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    createLineMarker();

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    optimizeForQuest();
    container.appendChild(renderer.domElement);

    container.style.touchAction = 'none';
    container.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('wheel', onDocumentMouseWheel);
    window.addEventListener('resize', onWindowResize);

    updateInfoText();
    createHotspotsForCurrentScene();
    createNavigationControlsLeft();
    createNavigationControlsRight();
}

function createLineMarker() {
    const points = [];
    // Create a 1x1 unit rectangle. We will scale it later.
    // Half-dimensions of 0.5 make a 1x1 unit square/rectangle.
    const unitHalfWidth = 0.5;
    const unitHalfHeight = 0.5;

    points.push( new THREE.Vector3( -unitHalfWidth,  unitHalfHeight, 0 ) );
    points.push( new THREE.Vector3(  unitHalfWidth,  unitHalfHeight, 0 ) );
    points.push( new THREE.Vector3(  unitHalfWidth, -unitHalfHeight, 0 ) );
    points.push( new THREE.Vector3( -unitHalfWidth, -unitHalfHeight, 0 ) );
    points.push( new THREE.Vector3( -unitHalfWidth,  unitHalfHeight, 0 ) );

    const geometry = new THREE.BufferGeometry().setFromPoints( points );
    const lineMaterial = new THREE.LineBasicMaterial( { color: MARKER_COLOR, linewidth: 3 } );
    lineMarker = new THREE.Line( geometry, lineMaterial );
    lineMarker.visible = false;
    scene.add( lineMarker );
    console.log("Unit Line marker (rectangle) created.");
}

function positionAndScaleLineMarker(lonDeg, latDeg, desiredHalfWidth, desiredHalfHeight) {
    if (!lineMarker) {
         console.error("Line marker not initialized!"); return;
    }
    console.log(`positionAndScaleLineMarker: lon=${lonDeg}, lat=${latDeg}, hW=${desiredHalfWidth}, hH=${desiredHalfHeight}`);

    const phiRad = THREE.MathUtils.degToRad(90 - latDeg);
    const thetaRad = THREE.MathUtils.degToRad(lonDeg);
    if (isNaN(phiRad) || isNaN(thetaRad)) {
         console.error("Invalid angle calculation:", {lonDeg, latDeg, phiRad, thetaRad}); return;
    }

    const x = MARKER_DISTANCE * Math.sin(phiRad) * Math.cos(thetaRad);
    const y = MARKER_DISTANCE * Math.cos(phiRad);
    const z = MARKER_DISTANCE * Math.sin(phiRad) * Math.sin(thetaRad);
    if (isNaN(x) || isNaN(y) || isNaN(z)) {
         console.error("Invalid position calculated:", {x,y,z}); return;
    }
    

    lineMarker.position.set(x, y, z);
    // Scale the 1x1 unit rectangle to the desired dimensions.
    // Since unit rectangle is 1 wide and 1 tall, scaling by 2*halfWidth gives total width.
    lineMarker.scale.set(desiredHalfWidth * 2, desiredHalfHeight * 2, 1); // Z-scale is 1 for a flat 2D line
    lineMarker.lookAt(0, 0, 0);
    lineMarker.visible = true;
    console.log(`Line marker positioned and scaled. Visible: ${lineMarker.visible}`);
}

function startCameraAnimation(targetLonDeg, targetLatDeg) {
    startLon = lon;
    startLat = lat;
    targetLon = targetLonDeg;
    targetLat = targetLatDeg;
    animationStartTime = Date.now();
    isAnimatingCamera = true;
    isUserInteracting = false;
    console.log(`Starting camera animation to lon=${targetLonDeg}, lat=${targetLatDeg}`);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    updateHotspotPositions();
}

function onPointerDown(event) {
    if (isAnimatingCamera) return;
    if (event.target.classList.contains('hotspot') || event.target.classList.contains('navButton')) return;
    isUserInteracting = true;
    onPointerDownMouseX = event.clientX;
    onPointerDownMouseY = event.clientY;
    onPointerDownLon = lon;
    onPointerDownLat = lat;
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
}

function onPointerMove(event) {
    if (isUserInteracting) {
        lon = (onPointerDownMouseX - event.clientX) * 0.1 + onPointerDownLon;
        lat = (event.clientY - onPointerDownMouseY) * 0.1 + onPointerDownLat;
    }
}

function onPointerUp() {
    isUserInteracting = false;
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
}

function onDocumentMouseWheel(event) {
    if (isAnimatingCamera) return;
    const fov = camera.fov + event.deltaY * 0.05;
    camera.fov = THREE.MathUtils.clamp(fov, 10, 75);
    camera.updateProjectionMatrix();
}

function update() {
    if (isAnimatingCamera) {
        const currentTime = Date.now();
        const elapsedTime = currentTime - animationStartTime;
        const t = Math.min(1, elapsedTime / animationDuration);
        const ease = 0.5 * (1 - Math.cos(Math.PI * t));
        lon = startLon + (targetLon - startLon) * ease;
        lat = startLat + (targetLat - startLat) * ease;
        if (t === 1) {
            isAnimatingCamera = false;
            console.log("Camera animation finished.");
        }
    }

    lat = Math.max(-85, Math.min(85, lat));
    phi = THREE.MathUtils.degToRad(90 - lat);
    theta = THREE.MathUtils.degToRad(lon);

    camera.target.x = 500 * Math.sin(phi) * Math.cos(theta);
    camera.target.y = 500 * Math.cos(phi);
    camera.target.z = 500 * Math.sin(phi) * Math.sin(theta);
    camera.lookAt(camera.target);

    if(isUserInteracting || isAnimatingCamera) {
        updateHotspotPositions();
    }
    renderer.render(scene, camera);
}


function loadScene(sceneId, onLoadedCallback) {
    console.log(`🎬 loadScene called for: ${sceneId}`);
    console.log(`📍 Current scene before change: ${currentSceneId}`);
    
    // PRIORIDAD 1: Usar textura precargada si existe
    if (window.preloadedTextures && window.preloadedTextures[sceneId]) {
        console.log(`⚡ Using preloaded texture for: ${sceneId}`);
        const texture = window.preloadedTextures[sceneId];
        
        // Aplicar textura precargada inmediatamente
        const oldTexture = material.map;
        material.map = texture;
        material.needsUpdate = true;
        
        // Liberar textura anterior
        if (oldTexture && oldTexture !== texture) {
            oldTexture.dispose();
            console.log(`🗑️ Old texture disposed`);
        }
        
        // Forzar renderizado inmediato
        renderer.render(scene, camera);
        
        // Actualizar estado y UI
        currentSceneId = sceneId;
        updateInfoText();
        createHotspotsForCurrentScene();
        
        console.log(`⚡ Instant scene change completed for: ${sceneId}`);
        
        if (onLoadedCallback) {
            console.log(`🎯 Executing onLoadedCallback for preloaded scene: ${sceneId}`);
            onLoadedCallback();
        }
        
        return; // SALIR AQUÍ - No necesita carga adicional
    }
    
    // PRIORIDAD 2: Si no está precargada, cargar normalmente
    currentSceneId = sceneId;
    const sceneData = scenes.find(s => s.id === sceneId);
    
    if (!sceneData) {
        console.error("❌ Scene not found:", sceneId);
        console.log("Available scenes:", scenes.map(s => s.id));
        return;
    }
    
    console.log(`✅ Scene data found:`, sceneData);
    console.log(`🔍 Loading texture from file: ${sceneData.filename}`);
    
    // Verificar que el material existe
    if (!material) {
        console.error("❌ Material not found! Cannot load texture.");
        return;
    }
    
    // Mostrar progreso de carga en pantalla
    const infoDiv = document.getElementById('info');
    if (infoDiv) {
        infoDiv.textContent = `Cargando escena...`;
    }
    
    // Configura opciones avanzadas para el cargador de texturas
    const loadingManager = new THREE.LoadingManager();
    
    loadingManager.onLoad = function() {
        console.log("🎉 LoadingManager: All resources loaded successfully");
    };
    
    loadingManager.onError = function(url) {
        console.error('❌ LoadingManager Error loading:', url);
    };
    
    const loader = new THREE.TextureLoader(loadingManager);
    
    console.log(`🚀 Starting texture load for: ${sceneData.filename}`);
    
    loader.load(
        sceneData.filename,
        
        // Success callback
        function(texture) {
            console.log(`✅ SUCCESS: Texture loaded for scene: ${sceneId}`);
            console.log(`📏 Texture dimensions: ${texture.image ? texture.image.width + 'x' + texture.image.height : 'unknown'}`);
            
            // Optimizaciones específicas para Quest 3
            const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
            texture.anisotropy = Math.min(8, maxAnisotropy); // Quest 3 puede manejar más anisotropía
            
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.generateMipmaps = false;
            texture.encoding = THREE.sRGBEncoding;
            
            // NO forzar formato - dejar que Three.js lo maneje automáticamente
            
            // Verificar tamaño de textura y optimizar para Quest 3
            if (texture.image) {
                const width = texture.image.width;
                const height = texture.image.height;
                console.log(`📐 Final texture dimensions: ${width}x${height}`);
                
                if (width > 4096 || height > 2048) {
                    console.warn(`⚠️ Texture ${sceneData.filename} is large (${width}x${height}). Quest 3 can handle it, but consider 4096x2048 for optimal performance.`);
                }
                
                if (width > 8000 || height > 4000) {
                    console.warn(`🚨 Texture is extremely large! Consider resizing to 4096x2048 for better Quest 3 performance.`);
                    // Para texturas muy grandes, reducir anisotropía
                    texture.anisotropy = Math.min(4, maxAnisotropy);
                }
            }
            
            // Aplicar la textura al material
            console.log(`🎨 Applying texture to material...`);
            const oldTexture = material.map;
            
            material.map = texture;
            material.needsUpdate = true;
            
            // Liberar textura anterior para ahorrar memoria
            if (oldTexture && oldTexture !== texture) {
                oldTexture.dispose();
                console.log(`🗑️ Old texture disposed`);
            }
            
            // Forzar renderizado inmediato
            renderer.render(scene, camera);
            console.log(`🖼️ Material updated and rendered for scene: ${sceneId}`);
            
            // Actualizar interfaz y elementos
            updateInfoText();
            createHotspotsForCurrentScene();
            console.log(`🔄 Interface updated for scene: ${sceneId}`);
            
            if (onLoadedCallback) {
                console.log(`🎯 Executing onLoadedCallback for scene: ${sceneId}`);
                onLoadedCallback();
            }
            
            console.log(`🎉 Scene loading completed successfully: ${sceneId}`);
        },
        
        // Progress callback - mostrar progreso en pantalla
        function(progress) {
            if (progress.lengthComputable) {
                const percentComplete = (progress.loaded / progress.total) * 100;
                const mbLoaded = (progress.loaded / 1024 / 1024).toFixed(1);
                const mbTotal = (progress.total / 1024 / 1024).toFixed(1);
                
                console.log(`📥 Loading ${sceneId}: ${Math.round(percentComplete)}% (${mbLoaded}/${mbTotal} MB)`);
                
                // Mostrar progreso en pantalla
                if (infoDiv) {
                    infoDiv.textContent = `Cargando: ${Math.round(percentComplete)}% (${mbLoaded}MB)`;
                }
            } else {
                const mbLoaded = (progress.loaded / 1024 / 1024).toFixed(1);
                console.log(`📥 Loading ${sceneId}: ${mbLoaded} MB loaded`);
                
                if (infoDiv) {
                    infoDiv.textContent = `Cargando: ${mbLoaded} MB...`;
                }
            }
        },
        
        // Error callback
        function(error) {
            console.error(`❌ FAILED to load texture for scene ${sceneId}:`, error);
            console.error(`❌ File path attempted: ${sceneData.filename}`);
            console.error(`❌ Error details:`, {
                message: error.message,
                type: error.constructor.name,
                stack: error.stack
            });
            
            // Mostrar mensaje de error al usuario
            if (infoDiv) {
                infoDiv.textContent = `❌ Error cargando escena: ${sceneId}`;
                infoDiv.style.color = 'red';
                
                // Restaurar después de 3 segundos
                setTimeout(() => {
                    updateInfoText();
                    infoDiv.style.color = 'white';
                }, 3000);
            }
        }
    );
}
function optimizeForQuest() {
    if (renderer) {
        // Configuración específica para Quest 3
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Mayor calidad
        renderer.antialias = true; // Quest 3 puede manejar antialiasing
        renderer.shadowMap.enabled = false; // No necesario para 360°
        renderer.powerPreference = "high-performance"; // Usar GPU dedicada
        
        console.log('🚀 Quest 3 optimizations applied');
    }
}

function createHotspotsForCurrentScene() {
    hotspots.forEach(hotspotElement => {
        if (hotspotElement.parentNode) {
            document.body.removeChild(hotspotElement);
        }
    });
    hotspots = [];

    const currentConnections = connections.filter(conn => conn.from === currentSceneId);
    currentConnections.forEach(conn => {
        const hotspotElement = document.createElement('div');
        hotspotElement.className = 'hotspot';
        
        // Crear el elemento tooltip dentro del hotspot
        const tooltipElement = document.createElement('div');
        tooltipElement.className = 'hotspot-tooltip';
        tooltipElement.textContent = conn.title || getSceneTitle(conn.to); // Usar el título personalizado o el título de la escena destino
        hotspotElement.appendChild(tooltipElement);
        
        hotspotElement.onclick = (e) => {
            e.stopPropagation();
            isAnimatingCamera = false;
            if (lineMarker) lineMarker.visible = false;
            console.log("Hotspot clicked, hiding line marker.");
            loadScene(conn.to);
        };
        hotspotElement.dataset.connLon = conn.position.lon;
        hotspotElement.dataset.connLat = conn.position.lat;
        document.body.appendChild(hotspotElement);
        hotspots.push(hotspotElement);
    });
    updateHotspotPositions();
}

// Función auxiliar para obtener el título de una escena por su ID
function getSceneTitle(sceneId) {
    const scene = scenes.find(s => s.id === sceneId);
    return scene ? scene.title : 'Desconocido';
}

function updateHotspotPositions() {
    hotspots.forEach(hotspotElement => {
        const connLon = parseFloat(hotspotElement.dataset.connLon);
        const connLat = parseFloat(hotspotElement.dataset.connLat);
        const phiRad = THREE.MathUtils.degToRad(90 - connLat);
        const thetaRad = THREE.MathUtils.degToRad(connLon);
        const hotspotRadius = 480;
        const vector = new THREE.Vector3(
            hotspotRadius * Math.sin(phiRad) * Math.cos(thetaRad),
            hotspotRadius * Math.cos(phiRad),
            hotspotRadius * Math.sin(phiRad) * Math.sin(thetaRad)
        );
        const projectedVector = vector.project(camera);
        const isInView = projectedVector.z < 1 && Math.abs(projectedVector.x) < 1 && Math.abs(projectedVector.y) < 1;
        if (isInView) {
            const xPos = (projectedVector.x + 1) / 2 * window.innerWidth;
            const yPos = (-projectedVector.y + 1) / 2 * window.innerHeight;
            hotspotElement.style.left = `${xPos}px`;
            hotspotElement.style.top = `${yPos}px`;
            hotspotElement.style.display = 'block';
        } else {
            hotspotElement.style.display = 'none';
        }
    });
}

function createNavigationControlsLeft() {
    const navControlsLeft = document.getElementById('navigationControlsLeft');
    navControlsLeft.innerHTML = '';
    const sortedScenes = scenes;
    sortedScenes.forEach(scene => {
        const button = document.createElement('button');
        button.className = 'navButton';
        button.textContent = scene.title;
        button.title = scene.title;
        button.onclick = function(e) {
            e.stopPropagation();
            isAnimatingCamera = false;
            if (lineMarker) lineMarker.visible = false;
            console.log("Nav-left button clicked, hiding line marker.");
            loadScene(scene.id);
        };
        navControlsLeft.appendChild(button);
    });
}

function createAndSetupElementButton(targetConfig, parentElement) {
    const button = document.createElement('button');
    button.className = 'navButton';
    button.textContent = targetConfig.buttonText; // Use buttonText from config
    button.title = targetConfig.buttonText; // Add title for hover text

    button.onclick = function(e) {
        e.stopPropagation();

        const targetSceneId = targetConfig.sceneId;
        const targetViewLon = targetConfig.lon;
        const targetViewLat = targetConfig.lat;
        // Get dimensions from targetConfig
        const targetHalfWidth = targetConfig.halfWidth;
        const targetHalfHeight = targetConfig.halfHeight;

        const actionAfterLoad = () => {
            console.log(`Executing actionAfterLoad for ${targetConfig.buttonText}: Positioning and scaling line marker.`);
            // Pass dimensions to positionAndScaleLineMarker
            positionAndScaleLineMarker(targetViewLon, targetViewLat, targetHalfWidth, targetHalfHeight);
            startCameraAnimation(targetViewLon, targetViewLat);
        };

        if (currentSceneId === targetSceneId) {
            console.log(`Already in target scene for ${targetConfig.buttonText}, executing action.`);
            actionAfterLoad();
        } else {
            console.log(`Not in target scene for ${targetConfig.buttonText} (${currentSceneId}), loading ${targetSceneId} and queueing action.`);
            loadScene(targetSceneId, actionAfterLoad);
        }
    };
    parentElement.appendChild(button);
}

function createNavigationControlsRight() {
    const navControlsRight = document.getElementById('navigationControlsRight');
    navControlsRight.innerHTML = '';

    // Loop through the elementsTargets array
    elementsTargets.forEach(targetConfig => {
        // Pass the whole targetConfig which now includes dimensions
        createAndSetupElementButton(targetConfig, navControlsRight);
    });
}

function updateInfoText() {
    const infoDiv = document.getElementById('info');
    const currentSceneData = scenes.find(s => s.id === currentSceneId);
    infoDiv.textContent = currentSceneData ? currentSceneData.title : 'Loading...';
}

function animate() {
    // Solo usar requestAnimationFrame si no está en modo VR
    if (renderer && !renderer.xr.isPresenting) {
        requestAnimationFrame(animate);
    }
    update();
}