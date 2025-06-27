import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { BVHLoader } from 'three/examples/jsm/loaders/BVHLoader';
import { adjustCamera } from './init';
import { createBoneMeshes, createJointSpheres, calculateBoundingBox } from './createObject';
import { makeTextSprite } from "./modules";
import { highlightSelectedJoint } from "../App";

export async function loadBVHAndInitSkeleton({
    bvhUrl,
    scene,
    camera,
    renderer,
    setJoints,
    setSelectedJoint,
    setComparedJoint,
    jointMapRef,
    boneMeshes,
    jointSpheres,
    setAnnotations,
    setIsBVHLoaded,
    setProgress,
    setFrameNumber,
    setCurrentFrameData,
    mixerRef,
    frameRef,
    isPausedRef,
    speedRef,
    selectedJointRef,
    comparedJointRef,
    hipsPositionsRef,
    animate,
}) {
    return new Promise((resolve, reject) => {
        const loader = new BVHLoader();
        loader.load(bvhUrl, (result) => {
            console.log('BVH 加載完成', result);
            const boneRoot = result.skeleton.bones[0];
            const skeletonGroup = new THREE.Group();
            skeletonGroup.add(boneRoot);
            scene.add(skeletonGroup);

            // 取得所有骨頭
            const boneList = [];
            boneRoot.traverse(b => { if (b.isBone) boneList.push(b); });
            setJoints(boneList.map(b => b.name));
            setSelectedJoint(boneList[0]?.name || '');
            setComparedJoint(boneList[1]?.name || '');
            boneList.forEach(b => jointMapRef.current[b.name] = b);
            createBoneMeshes(boneRoot, boneMeshes, skeletonGroup);
            createJointSpheres(boneRoot, jointSpheres, skeletonGroup);
            highlightSelectedJoint(jointSpheres, boneList[0]?.name, boneList[1]?.name);
            
            renderer.domElement.addEventListener('click', e => onClick(e, renderer, camera, skeletonGroup, jointSpheres, setAnnotations, frameRef));

            // 邊界框與相機調整
            const { offset, center, size } = calculateBoundingBox(boneRoot);
            // skeletonGroup.position.y -= offset / 2;
            adjustCamera(camera, center, size);

            // 動畫
            const mixer = new THREE.AnimationMixer(boneRoot);
            mixer.clipAction(result.clip).setEffectiveWeight(1.0).play();
            mixerRef.current = mixer;
            setIsBVHLoaded(true);
            
            const hipsName = boneList.find(n => /hip/i.test(n.name))?.name || "Hips";
            const frameTimes = result.clip.tracks[0].times; // 假設每個track都是同一個長度
            for (let i = 0; i < frameTimes.length; i++) {
                mixer.setTime(frameTimes[i]);
                const hip = boneList.find(b => b.name === hipsName);
                if (hip) {
                    hipsPositionsRef.current[i] = hip.getWorldPosition(new THREE.Vector3());
                }
            }

            // 動畫循環
            animate({
                renderer, scene, camera, mixer,
                boneMeshes, jointSpheres,
                isPausedRef,
                speedRef,
                onProgerss: setProgress,
                onFrame: setFrameNumber,
                jointMapRef,
                selectedJointRef,
                comparedJointRef,
                hipsPositionsRef,
                frameRef,
                onSetCurrentFrameData: setCurrentFrameData,
            });

            resolve({
                boneRoot,
                skeletonGroup,
                boneList,
                boneMeshes,
                jointSpheres,
                mixer,
            });
        }, undefined, reject);
    });
}

export async function loadFBXAndInitSkeleton({
    fbxUrl,
    scene,
    camera,
    renderer,
    setJoints,
    setSelectedJoint,
    setComparedJoint,
    jointMapRef,
    boneMeshes,
    jointSpheres,
    setAnnotations,
    setIsFBXLoaded,
    setProgress,
    setFrameNumber,
    setCurrentFrameData,
    mixerRef,
    frameRef,
    isPausedRef,
    speedRef,
    selectedJointRef,
    comparedJointRef,
    hipsPositionsRef,
    animate,
}) {
    return new Promise((resolve, reject) => {
        const loader = new FBXLoader();
        loader.load(fbxUrl, (object) => {
            scene.add(object);
            const boneList = [];
            object.traverse(child => {
                if (child.isBone) boneList.push(child);
            });
            setJoints(boneList.map(b => b.name));
            setSelectedJoint(boneList[0]?.name || '');
            setComparedJoint(boneList[1]?.name || '');
            boneList.forEach(b => jointMapRef.current[b.name] = b);
            createBoneMeshes(boneList[0], boneMeshes, object);
            createJointSpheres(boneList[0], jointSpheres, object);
            highlightSelectedJoint(jointSpheres, boneList[0]?.name, boneList[1]?.name);
            // // 將 FBX 加入場景
            console.log('FBX 加載完成', object, boneList[0]);

            renderer.domElement.addEventListener('click', (e) => onClick(e, renderer, camera, object, jointSpheres, setAnnotations, frameRef));

            // 邊界框與相機調整
            const { offset, center, size } = calculateBoundingBox(boneList[0]);
            object.position.y -= offset / 2;
            adjustCamera(camera, center, size);

            // 動畫
            let mixer = null;
            if (object.animations && object.animations.length > 0) {
                mixer = new THREE.AnimationMixer(object);
                mixer.clipAction(object.animations[0]).setEffectiveWeight(1.0).play();
                mixerRef.current = mixer;
            }
            setIsFBXLoaded(true);
            console.log(object.animations[0]);
            const hipsName = boneList.find(n => /hip/i.test(n.name))?.name || "Hips";
            const frameTimes = object.animations[0].tracks[0].times; // 假設每個track都是同一個長度
            for (let i = 0; i < frameTimes.length; i++) {
                mixer.setTime(frameTimes[i]);
                const hip = boneList.find(b => b.name === hipsName);
                if (hip) {
                    hipsPositionsRef.current[i] = hip.getWorldPosition(new THREE.Vector3());
                }
            }
            // 動畫循環
            animate({
                renderer, scene, camera, mixer,
                boneMeshes, jointSpheres,
                isPausedRef,
                speedRef,
                onProgerss: setProgress,
                onFrame: setFrameNumber,
                jointMapRef,
                selectedJointRef,
                comparedJointRef,
                hipsPositionsRef,
                frameRef,
                onSetCurrentFrameData: setCurrentFrameData,
            });

            resolve({
                object,
                boneList,
                boneMeshes,
                jointSpheres,
                mixer,
            });
        }, undefined, reject);
    });
}

function onClick(event, renderer, camera, object, jointSpheres, setAnnotations, frameRef) {
    const rect = renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(
        jointSpheres.map(j => j.sphere)
    );
    if (intersects.length > 0) {
        const sphere = intersects[0].object;
        const joint = jointSpheres.find(j => j.sphere === sphere);
        if (joint) {
            const text = window.prompt('請輸入註解：');
            if (text) {
                const info = {
                    frame: frameRef.current,
                    text
                }
                const sprite = makeTextSprite(`${frameRef.current} ${joint.bone.name}: ${text}`);
                sprite.position.copy(joint.bone.getWorldPosition(new THREE.Vector3()));
                sprite.position.y += 8; // 提高一些位置以避免與骨頭重疊
                object.add(sprite);
                const marker = new THREE.Mesh(
                    new THREE.SphereGeometry(1.5),
                    new THREE.MeshBasicMaterial({ color: 0x00ff00 })
                );
                marker.position.copy(joint.bone.getWorldPosition(new THREE.Vector3()));
                object.add(marker);
                setAnnotations(prev => [
                    ...prev,
                    { bone: joint.bone, sprite, marker, info }
                ]);
            }
        }
    }
}