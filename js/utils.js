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
    // Asegúrate de que el DOM esté completamente cargado
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

    createLineMarker(); // Create the line marker geometry once

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    
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
    console.log(`loadScene called for: ${sceneId}`);
    currentSceneId = sceneId;
    const sceneData = scenes.find(s => s.id === sceneId);
    if (!sceneData) {
        console.error("Scene not found:", sceneId); return;
    }

    // Configura opciones avanzadas para el cargador de texturas
    const loadingManager = new THREE.LoadingManager();
    loadingManager.onError = function(url) {
        console.error('Error loading texture:', url);
    };
    
    const loader = new THREE.TextureLoader(loadingManager);
    
    // Importante: Evita la compresión y optimiza la calidad
    function loadScene(sceneId, onLoadedCallback) {
        console.log(`loadScene called for: ${sceneId}`);
        currentSceneId = sceneId;
        const sceneData = scenes.find(s => s.id === sceneId);
        if (!sceneData) {
            console.error("Scene not found:", sceneId); 
            return;
        }
    
        // Configura opciones avanzadas para el cargador de texturas
        const loadingManager = new THREE.LoadingManager();
        loadingManager.onError = function(url) {
            console.error('Error loading texture:', url);
        };
        
        const loader = new THREE.TextureLoader(loadingManager);
        
        loader.load(sceneData.filename, function(texture) {
            console.log(`Texture loaded for: ${sceneId}`);
            
            // Optimizaciones específicas para Quest
            const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
            texture.anisotropy = Math.min(4, maxAnisotropy); // Limitar anisotropía para mejor performance
            
            texture.minFilter = THREE.LinearFilter;  // LinearFilter preserva mejor los detalles
            texture.magFilter = THREE.LinearFilter;
            texture.generateMipmaps = false;  // Crucial para mantener la calidad original
            
            // Usar RGB en lugar de RGBA para ahorrar memoria si no necesitas transparencia
            texture.format = THREE.RGBFormat; // Cambiado de RGBAFormat para mejor performance
            texture.encoding = THREE.sRGBEncoding;
            
            // Verificar tamaño de textura y advertir si es muy grande
            if (texture.image) {
                const width = texture.image.width;
                const height = texture.image.height;
                console.log(`Texture dimensions: ${width}x${height}`);
                
                if (width > 4096 || height > 2048) {
                    console.warn(`⚠️  Texture ${sceneData.filename} is very large (${width}x${height}). For better Quest performance, consider resizing to max 4096x2048 or 2048x1024.`);
                }
                
                // Performance tip basado en el tamaño
                if (width > 8000 || height > 4000) {
                    console.warn(`🚨 Texture is extremely large! This may cause performance issues on Quest. Strongly recommend resizing.`);
                    // Reducir anisotropía aún más para texturas muy grandes
                    texture.anisotropy = Math.min(2, maxAnisotropy);
                }
            }
            
            // Aplicar la textura al material
            material.map = texture;
            material.needsUpdate = true;
            
            // Actualizar interfaz y elementos
            updateInfoText();
            createHotspotsForCurrentScene();
    
            if (onLoadedCallback) {
                console.log(`Executing onLoadedCallback for scene: ${sceneId}`);
                onLoadedCallback();
            }
        }, 
        
        // Progress callback (opcional - para mostrar progreso de carga)
        function(progress) {
            if (progress.lengthComputable) {
                const percentComplete = (progress.loaded / progress.total) * 100;
                console.log(`Loading ${sceneId}: ${Math.round(percentComplete)}%`);
            }
        },
        
        // Error callback
        function(error) {
            console.error(`Failed to load texture for scene ${sceneId}:`, error);
            // Opcional: mostrar mensaje de error al usuario
            const infoDiv = document.getElementById('info');
            if (infoDiv) {
                infoDiv.textContent = `Error loading scene: ${sceneId}`;
            }
        });
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