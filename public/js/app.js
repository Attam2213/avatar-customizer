// State
const state = {
    isAuthenticated: false,
    user: null,
    avatarUrl: 'https://models.readyplayer.me/65a8dba831b23abb4f401bae.glb', // Default avatar
    gender: 'neutral', // 'male', 'female', 'neutral'
    inventory: [],
    scene: null,
    camera: null,
    renderer: null,
    avatarModel: null,
    mixer: null
};

// Base Models (Mannequins)
const baseModels = {
    male: '/models/male_base.glb',
    female: '/models/female_base.glb'
};

// Elements
const screens = {
    auth: document.getElementById('auth-screen'),
    choice: document.getElementById('avatar-choice-screen'),
    gender: document.getElementById('gender-screen'),
    manual: document.getElementById('manual-screen'),
    app: document.getElementById('app-screen')
};

const ui = {
    loginBtn: document.getElementById('google-login-btn'),
    scanSelfBtn: document.getElementById('scan-self-btn'),
    logoutBtn: document.getElementById('logout-btn'),
    choiceScanBtn: document.getElementById('choice-scan'),
    choiceManualBtn: document.getElementById('choice-manual'),
    genderMaleBtn: document.getElementById('gender-male'),
    genderFemaleBtn: document.getElementById('gender-female'),
    genderBackBtn: document.getElementById('gender-back-btn'),
    manualDoneBtn: document.getElementById('manual-done-btn'),
    addItemBtn: document.getElementById('add-item-btn'),
    inventoryGrid: document.getElementById('inventory-grid'),
    cameraOverlay: document.getElementById('camera-overlay'),
    cameraFeed: document.getElementById('camera-feed'),
    captureBtn: document.getElementById('capture-btn'),
    closeCameraBtn: document.getElementById('close-camera-btn'),
    rpmOverlay: document.getElementById('rpm-overlay'),
    rpmFrame: document.getElementById('rpm-frame'),
    closeRpmBtn: document.getElementById('close-rpm-btn')
};

const sliders = {
    height: document.getElementById('slider-height'),
    weight: document.getElementById('slider-weight'),
    waist: document.getElementById('slider-waist'),
    arms: document.getElementById('slider-arms')
};

// --- Initialization ---

function init() {
    setupEventListeners();
    checkAuth();
}

function setupEventListeners() {
    console.log('Setting up event listeners');
    if (ui.logoutBtn) {
        console.log('Logout button found');
        ui.logoutBtn.addEventListener('click', handleLogout);
    } else {
        console.error('Logout button NOT found');
    }
    
    ui.loginBtn.addEventListener('click', handleLogin);
    ui.scanSelfBtn.addEventListener('click', openAvatarCreator); // Re-scan from app
    
    // Avatar Choice
    ui.choiceScanBtn.addEventListener('click', openAvatarCreator);
    ui.choiceManualBtn.addEventListener('click', showGenderScreen);
    
    // Gender Selection
    ui.genderMaleBtn.addEventListener('click', () => selectGender('male'));
    ui.genderFemaleBtn.addEventListener('click', () => selectGender('female'));
    ui.genderBackBtn.addEventListener('click', showAvatarChoice);

    ui.manualDoneBtn.addEventListener('click', finishManualCustomization);

    // Sliders
    Object.keys(sliders).forEach(key => {
        sliders[key].addEventListener('input', updateBodyShape);
    });

    ui.addItemBtn.addEventListener('click', openCamera);
    ui.captureBtn.addEventListener('click', captureImage);
    ui.closeCameraBtn.addEventListener('click', closeCamera);
    ui.closeRpmBtn.addEventListener('click', () => ui.rpmOverlay.classList.add('hidden'));
    
    // Listen for Ready Player Me avatar export
    window.addEventListener('message', handleRpmMessage);
}

function checkAuth() {
    const user = localStorage.getItem('user');
    if (user) {
        state.user = JSON.parse(user);

        // Fix for broken default URL (auto-migrate)
        const oldDefaultId = '64b7f8f0c9f87265691e8460';
        const newDefault = 'https://models.readyplayer.me/65a8dba831b23abb4f401bae.glb';
        
        if (state.user.avatar && state.user.avatar.includes(oldDefaultId)) {
            console.log('Migrating broken avatar URL...');
            state.user.avatar = newDefault;
            localStorage.setItem('user', JSON.stringify(state.user));
        }

        // If avatar is set, go to app, else go to choice
        if (state.user.avatarSet) {
            showApp();
        } else {
            showAvatarChoice();
        }
    }
}

function handleLogin() {
    // Mock Google Login
    const mockUser = {
        name: 'Alex Styles',
        email: 'alex@example.com',
        avatar: 'https://models.readyplayer.me/65a8dba831b23abb4f401bae.glb', // Default base
        avatarSet: false
    };
    
    localStorage.setItem('user', JSON.stringify(mockUser));
    state.user = mockUser;
    showAvatarChoice();
}

function handleLogout() {
    // Clear state
    localStorage.removeItem('user');
    // Optional: Clear inventory too if you want full reset
    // localStorage.removeItem('inventory'); 
    
    state.user = null;
    state.isAuthenticated = false;
    
    // Stop 3D animation to save resources
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    
    // Show login screen
    hideAllScreens();
    screens.auth.classList.add('active');
}

function showAvatarChoice() {
    hideAllScreens();
    screens.choice.classList.add('active');
}

function showApp() {
    hideAllScreens();
    screens.app.classList.add('active');
    
    document.getElementById('username-display').textContent = state.user.name;
    document.getElementById('user-avatar-img').src = `https://ui-avatars.com/api/?name=${state.user.name}`;
    
    init3D('canvas-container');
    loadInventory();
}

function hideAllScreens() {
    Object.values(screens).forEach(el => el.classList.remove('active'));
}

// --- Manual Customization ---

function showGenderScreen() {
    hideAllScreens();
    screens.gender.classList.add('active');
}

function selectGender(gender) {
    state.gender = gender;
    
    // Select base model URL
    if (baseModels[gender]) {
        state.avatarUrl = baseModels[gender];
    }

    // Save gender to user profile if needed
    if (state.user) {
        state.user.gender = gender;
        if (baseModels[gender]) {
            state.user.avatar = baseModels[gender];
        }
        localStorage.setItem('user', JSON.stringify(state.user));
    }
    startManualCustomization();
}

function startManualCustomization() {
    hideAllScreens();
    screens.manual.classList.add('active');
    
    // Init 3D preview in manual screen
    init3D('manual-preview-container');
}

function updateBodyShape() {
    if (!state.avatarModel) return;

    const vals = {
        height: parseInt(sliders.height.value),
        weight: parseFloat(sliders.weight.value),
        waist: parseFloat(sliders.waist.value),
        arms: parseFloat(sliders.arms.value)
    };

    // Update UI labels
    document.getElementById('val-height').innerText = vals.height + ' cm';
    document.getElementById('val-weight').innerText = vals.weight.toFixed(2);
    document.getElementById('val-waist').innerText = vals.waist.toFixed(2);
    document.getElementById('val-arms').innerText = vals.arms.toFixed(2);

    // Apply Bone Scaling (Approximation)
    state.avatarModel.traverse((bone) => {
        if (!bone.isBone) return;
        
        const name = bone.name.toLowerCase();

        // Height (Global Scale on Hips or Root)
        if (name === 'hips' || name === 'mixamorighips') {
            let baseHeight = 170;
            if (state.gender === 'male') baseHeight = 180;
            if (state.gender === 'female') baseHeight = 165;
            
            const heightScale = vals.height / baseHeight; 
            state.avatarModel.scale.setScalar(heightScale);
        }

        // Weight (Width of body core)
        if (name.includes('spine') || name.includes('hips')) {
             // Scale X (width) and Z (depth)
             let weightMod = 1.0;
             if (state.gender === 'male') weightMod = 1.05; // Broader
             if (state.gender === 'female') weightMod = 0.95; // Narrower
             
             bone.scale.x = vals.weight * weightMod; 
             bone.scale.z = vals.weight * weightMod;
        }
        
        // Waist (Spine / Hips specific)
        if (name === 'spine' || name === 'mixamorigspine') { // Lower spine usually
             // Females usually have narrower waists relative to hips
             let waistMod = 1.0;
             if (state.gender === 'female') waistMod = 0.9;
             
            bone.scale.x = vals.waist * vals.weight * waistMod; 
            bone.scale.z = vals.waist * vals.weight * waistMod;
        }

        // Arms
        if (name.includes('arm') || name.includes('shoulder')) {
            let shoulderMod = 1.0;
            if (state.gender === 'male') shoulderMod = 1.1; // Broad shoulders
            
            bone.scale.x = vals.arms * shoulderMod; 
            bone.scale.z = vals.arms * shoulderMod; 
        }
    });
}

function finishManualCustomization() {
    // Save state
    state.user.avatarSet = true;
    localStorage.setItem('user', JSON.stringify(state.user));
    showApp();
}

// --- 3D Scene (Three.js) ---

let animationId = null;

function init3D(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Cleanup old scene if exists
    if (state.renderer && container.querySelector('canvas')) {
        container.innerHTML = ''; // Brute force clear
    }

    // Scene
    state.scene = new THREE.Scene();
    state.scene.background = new THREE.Color(0x1e272e);
    
    // Camera
    state.camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    state.camera.position.set(0, 1.4, 3.5);
    
    // Renderer
    state.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    state.renderer.setSize(container.clientWidth, container.clientHeight);
    state.renderer.outputEncoding = THREE.sRGBEncoding;
    container.appendChild(state.renderer.domElement);
    
    // Lights
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444);
    hemiLight.position.set(0, 20, 0);
    state.scene.add(hemiLight);
    
    const dirLight = new THREE.DirectionalLight(0xffffff);
    dirLight.position.set(0, 20, 10);
    state.scene.add(dirLight);
    
    // Ground
    const grid = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
    state.scene.add(grid);

    // Load Avatar
    loadAvatar(state.user.avatar || state.avatarUrl);
    
    // Animation Loop
    animate();
    
    // Resize Handler
    window.addEventListener('resize', () => {
        state.camera.aspect = container.clientWidth / container.clientHeight;
        state.camera.updateProjectionMatrix();
        state.renderer.setSize(container.clientWidth, container.clientHeight);
    });
}

function animate() {
    animationId = requestAnimationFrame(animate);
    if (state.renderer && state.scene && state.camera) {
        state.renderer.render(state.scene, state.camera);
    }
}

function loadAvatar(url) {
    if (state.avatarModel) {
        state.scene.remove(state.avatarModel);
        state.avatarModel = null;
    }
    
    const loader = new THREE.GLTFLoader();
    try {
        loader.setCrossOrigin('anonymous');
    } catch (e) {
        // Ignore if method doesn't exist
    }

    loader.load(url, (gltf) => {
        console.log('Avatar loaded successfully');
        const model = gltf.scene;
        
        // Auto-scale and center
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        
        console.log('Model size:', size);
        console.log('Model center:', center);

        // Normalize height to ~1.7m
        const maxDim = Math.max(size.y, 1.7); // Avoid scaling up too much if it's already big
        if (size.y > 0) {
            const scale = 1.7 / size.y;
            model.scale.setScalar(scale);
            console.log('Scaling model by:', scale);
        }

        // Center model
        model.position.x = -center.x * model.scale.x;
        model.position.y = -box.min.y * model.scale.y; // Put feet on ground
        model.position.z = -center.z * model.scale.z;

        state.avatarModel = model;
        state.scene.add(model);
        
        // Debug bones
        state.avatarModel.traverse((o) => {
            if (o.isMesh) console.log('Mesh found:', o.name);
            if (o.isBone) console.log('Bone found:', o.name);
        });

        // Apply Gender-Specific Base Style (Grey + No Hair)
        // Only apply if it's NOT the base Xbot/Ybot which are already "clean" mannequins
        // But we still want them grey.
        if (state.gender && state.gender !== 'neutral') {
             // For these new human models, they might have textures/clothes.
             // Let's force them to be grey mannequins.
             applyBaseStyle(state.avatarModel);
        }
    }, undefined, (error) => {
        console.error('An error happened loading the avatar:', error);
        console.error('Error details:', error.message, error.stack);
        
        // Fallback: Add a red box so we know the scene is working
        const geometry = new THREE.BoxGeometry(0.5, 1.7, 0.3);
        const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        const box = new THREE.Mesh(geometry, material);
        box.position.set(0, 0.85, 0);
        state.scene.add(box);
        state.avatarModel = box;
        alert('Failed to load avatar. Using placeholder. Check console for details.');
    });
}

function applyBaseStyle(model) {
    if (!model) return;
    
    console.log('Applying base style (Grey + No Hair)...');

    // Remove any virtual try-on items
    const tryOnItem = state.scene.getObjectByName('virtual-try-on');
    if (tryOnItem) state.scene.remove(tryOnItem);
    
    // Grey Material
    const greyMaterial = new THREE.MeshStandardMaterial({
        color: 0x888888,
        roughness: 0.7,
        metalness: 0.1
    });

    model.traverse((node) => {
        if (node.isMesh) {
            // Check for hair, beard, glasses, etc.
            const name = (node.name || '').toLowerCase();
            
            // Hide Alpha_Surface (Xbot outer shell) if we want "naked" robot
            // or just treat it as clothing
            if (name.includes('alpha_surface') || name.includes('joints')) {
                node.visible = false;
                return;
            }

            // Hide Hair/Accessories AND Clothes if possible
            if (name.includes('hair') || 
                name.includes('beard') || 
                name.includes('glass') || 
                name.includes('hat') || 
                name.includes('facewear') ||
                name.includes('headwear') ||
                name.includes('mask') ||
                name.includes('helmet') ||
                name.includes('vest')) {
                node.visible = false;
                return;
            }

            // Try to identify outfit meshes
            // Standard RPM naming: Wolf3D_Outfit_Top, Wolf3D_Outfit_Bottom, Wolf3D_Outfit_Footwear
            // If we hide them, we might get gaps. Safe bet: Apply Grey.
            
            if (name.includes('outfit') || name.includes('top') || name.includes('bottom') || name.includes('footwear') || name.includes('shoe') || name.includes('shirt') || name.includes('pants') || name.includes('trousers') || name.includes('jacket') || name.includes('coat') || name.includes('hoodie') || name.includes('dress') || name.includes('skirt')) {
                console.log('Hiding clothing mesh:', name);
                node.visible = false;
                return;
            }

            // For Body, make it grey
            const newMat = greyMaterial.clone();
            if (node.isSkinnedMesh) {
                // Ensure skinning is preserved/enabled if needed
                newMat.skinning = true; 
            }
            node.material = newMat;
            
            // Keep eyes/teeth separate
            if (name.includes('eye') || name.includes('teeth')) {
                 if (name.includes('eye')) {
                     node.material = new THREE.MeshStandardMaterial({ color: 0xffffff });
                 } else if (name.includes('teeth')) {
                     node.material = new THREE.MeshStandardMaterial({ color: 0xeeeeee });
                 }
            }
        }
    });
}

// Global helper for user command
window.stripAvatar = () => {
    if (state.avatarModel) applyBaseStyle(state.avatarModel);
};

function processImageFor3D(imageSrc) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            
            // Draw original
            ctx.drawImage(img, 0, 0);
            
            // Simple Background Removal (White/Light background assumption)
            const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = frame.data;
            const tolerance = 30; // Color distance tolerance
            
            // Sample corner colors to detect background
            const bgR = data[0];
            const bgG = data[1];
            const bgB = data[2];
            
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                
                // Euclidean distance check
                const diff = Math.sqrt(
                    Math.pow(r - bgR, 2) +
                    Math.pow(g - bgG, 2) +
                    Math.pow(b - bgB, 2)
                );
                
                if (diff < tolerance) {
                    data[i + 3] = 0; // Make transparent
                }
            }
            
            ctx.putImageData(frame, 0, 0);
            resolve(canvas.toDataURL());
        };
        img.src = imageSrc;
    });
}

// --- Ready Player Me Integration ---

function openAvatarCreator() {
    const subdomain = 'demo'; // Replace with your subdomain if you have one
    ui.rpmFrame.src = `https://${subdomain}.readyplayer.me/avatar?frameApi`;
    ui.rpmOverlay.classList.remove('hidden');
}

function handleRpmMessage(event) {
    const url = event.data;
    
    if (typeof url === 'string' && url.startsWith('http')) {
        // Avatar URL received
        state.avatarUrl = url;
        ui.rpmOverlay.classList.add('hidden');
        loadAvatar(url);
        console.log('New avatar URL:', url);
    }
}

// --- Camera & Scanning Logic ---

async function openCamera() {
    ui.cameraOverlay.classList.add('active');
    
    const constraints = {
        video: {
            facingMode: 'environment', // Try back camera first
            width: { ideal: 1280 },
            height: { ideal: 720 }
        }
    };

    try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        ui.cameraFeed.srcObject = stream;
        
        // Ensure video plays (some browsers require explicit play)
        ui.cameraFeed.onloadedmetadata = () => {
            ui.cameraFeed.play().catch(e => console.error("Error playing video:", e));
        };
    } catch (err) {
        console.error("Camera error (environment):", err);
        
        // Fallback to any available camera if back camera fails
        try {
            const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
            ui.cameraFeed.srcObject = fallbackStream;
            ui.cameraFeed.play();
        } catch (fallbackErr) {
            console.error("Camera error (fallback):", fallbackErr);
            alert("Could not access camera. Please allow permissions and ensure no other app is using it.");
            closeCamera();
        }
    }
}

function closeCamera() {
    const stream = ui.cameraFeed.srcObject;
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
    ui.cameraFeed.srcObject = null;
    ui.cameraOverlay.classList.remove('active');
}

function captureImage() {
    const video = ui.cameraFeed;
    const canvas = document.getElementById('camera-canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob(blob => {
        uploadImage(blob);
        closeCamera();
    }, 'image/jpeg');
}

function uploadImage(blob) {
    const formData = new FormData();
    formData.append('image', blob, 'scan.jpg');
    
    fetch('/api/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            addItemToInventory(data.file.path);
        }
    })
    .catch(err => console.error('Upload failed:', err));
}

// --- Inventory & Try On ---

function loadInventory() {
    // Load saved inventory from localstorage if any
    const saved = JSON.parse(localStorage.getItem('inventory') || '[]');
    state.inventory = saved;
    renderInventory();
}

function addItemToInventory(imagePath) {
    const newItem = {
        id: Date.now(),
        image: imagePath,
        type: 'cloth'
    };
    
    state.inventory.push(newItem);
    localStorage.setItem('inventory', JSON.stringify(state.inventory));
    renderInventory();
}

function renderInventory() {
    // Clear grid but keep placeholder
    ui.inventoryGrid.innerHTML = '';
    
    state.inventory.forEach(item => {
        const el = document.createElement('div');
        el.className = 'inventory-item';
        el.innerHTML = `<img src="${item.image}" alt="Item">`;
        el.onclick = () => tryOnItem(item);
        ui.inventoryGrid.appendChild(el);
    });
}

async function tryOnItem(item) {
    // Show loading state
    const loadingToast = document.createElement('div');
    loadingToast.style.position = 'absolute';
    loadingToast.style.top = '20px';
    loadingToast.style.left = '50%';
    loadingToast.style.transform = 'translateX(-50%)';
    loadingToast.style.background = 'rgba(0,0,0,0.8)';
    loadingToast.style.color = 'white';
    loadingToast.style.padding = '10px 20px';
    loadingToast.style.borderRadius = '20px';
    loadingToast.style.zIndex = '1000';
    loadingToast.textContent = 'Generating 3D Model...';
    document.body.appendChild(loadingToast);

    try {
        // Remove old item
        const oldItem = state.scene.getObjectByName('virtual-try-on');
        if (oldItem) state.scene.remove(oldItem);
        
        // Process Image (Remove Background)
        const processedImageSrc = await processImageFor3D(item.image);
        
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(processedImageSrc, (texture) => {
            const group = new THREE.Group();
            group.name = 'virtual-try-on';
            
            // "Volumetric Sprite" Technique: Stack layers to create 3D volume
            const layers = 15; // Number of layers
            const depth = 0.04; // Total thickness
            
            const geometry = new THREE.PlaneGeometry(0.6, 0.6); 
            const material = new THREE.MeshBasicMaterial({ 
                map: texture, 
                transparent: true, 
                side: THREE.DoubleSide,
                alphaTest: 0.1 
            });
            
            for (let i = 0; i < layers; i++) {
                const layer = new THREE.Mesh(geometry, material);
                layer.position.z = (i / layers) * depth;
                group.add(layer);
            }
            
            // Position in front of the avatar (approx chest area)
            group.position.set(0, 1.2, 0.3);
            
            state.scene.add(group);
            
            // Highlight in UI
            document.querySelectorAll('.inventory-item').forEach(el => el.classList.remove('selected'));
            
            document.body.removeChild(loadingToast);
        });
    } catch (e) {
        console.error(e);
        loadingToast.textContent = 'Error generating 3D model';
        setTimeout(() => document.body.removeChild(loadingToast), 2000);
    }
}

// Start
document.addEventListener('DOMContentLoaded', init);
