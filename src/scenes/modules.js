import * as THREE from 'three';
// 額外模組
export function addAnnotation(bone, annotations, text) {
    const sprite = makeTextSprite(text);
    bone.add(sprite);
    annotations.push({ bone, sprite });
}

export function markPosture(bone, postureHighlights, color = 0x00ff00) {
    const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(1.2),
        new THREE.MeshBasicMaterial({ color })
    );
    bone.add(sphere);
    postureHighlights.push({ bone, sphere });
}

export function makeTextSprite(message, parameters = {}) {
    const fontface = parameters.fontface || "Arial";
    const fontsize = parameters.fontsize || 32;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    context.font = `${fontsize}px ${fontface}`;
    context.fillStyle = 'rgba(255,255,255,1.0)';
    context.fillText(message, 0, fontsize);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(40, 20, 1.0);
    return sprite;
}