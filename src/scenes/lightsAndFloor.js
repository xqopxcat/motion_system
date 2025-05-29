import * as THREE from 'three';

// 添加光源
export function addLights(scene) {
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xff0000, 1, 500);
    pointLight.position.set(50, 50, 50);
    scene.add(pointLight);
}

// 添加地板
export function addFloor(scene) {
    const floorGeometry = new THREE.PlaneGeometry(1000, 1000);
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, depthWrite: false });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(400, 20);
    scene.add(grid);

    const axesHelper = new THREE.AxesHelper(100);
    scene.add(axesHelper);
}