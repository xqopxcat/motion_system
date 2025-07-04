import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { BVHLoader } from 'three/examples/jsm/loaders/BVHLoader';
import { adjustCamera } from './init';
import { createBoneMeshes, createJointSpheres, calculateBoundingBox } from './createObject';
import { makeTextSprite } from "./modules";
import { highlightSelectedJoint } from "../App";

// 根據簡化的 15 個關節點重新定義連接關係
const POSE_CONNECTIONS = [
    // 上半身連線（使用新的索引）
    [1, 2],   // left_shoulder - right_shoulder
    [1, 3],   // left_shoulder - left_elbow  
    [3, 5],   // left_elbow - left_wrist
    [2, 4],   // right_shoulder - right_elbow
    [4, 6],   // right_elbow - right_wrist
    
    // 軀幹連線  
    [1, 7],   // left_shoulder - left_hip
    [2, 8],   // right_shoulder - right_hip
    [7, 8],   // left_hip - right_hip
    
    // 下半身連線
    [7, 9],   // left_hip - left_knee
    [9, 11],  // left_knee - left_ankle
    [8, 10],  // right_hip - right_knee
    [10, 12], // right_knee - right_ankle
    
    // 足部連線
    [11, 13], // left_ankle - left_foot_index
    [12, 14], // right_ankle - right_foot_index
    
    // 頭部連線
    [0, 1],   // nose - left_shoulder (可選)
    [0, 2],   // nose - right_shoulder (可選)
];

const JOINT_NAMES = [
    'nose',              // 0
    'left_shoulder',     // 1
    'right_shoulder',    // 2
    'left_elbow',        // 3
    'right_elbow',       // 4
    'left_wrist',        // 5
    'right_wrist',       // 6
    'left_hip',          // 7
    'right_hip',         // 8
    'left_knee',         // 9
    'right_knee',        // 10
    'left_ankle',        // 11
    'right_ankle',       // 12
    'left_foot_index',   // 13
    'right_foot_index'   // 14
];

// MediaPipe 33個關節點到簡化15個關節點的映射
const MEDIAPIPE_TO_SIMPLIFIED = {
    0: 0,   // nose
    11: 1,  // left_shoulder
    12: 2,  // right_shoulder  
    13: 3,  // left_elbow
    14: 4,  // right_elbow
    15: 5,  // left_wrist
    16: 6,  // right_wrist
    23: 7,  // left_hip
    24: 8,  // right_hip
    25: 9,  // left_knee
    26: 10, // right_knee
    27: 11, // left_ankle
    28: 12, // right_ankle
    31: 13, // left_foot_index
    32: 14  // right_foot_index
};

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

export async function loadLandmarkAndInitSkeleton({
    landmarkUrl,
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
    setIsLandmarkLoaded,
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
        fetch(landmarkUrl)
            .then(response => response.json())
            .then(landmarkData => {
                console.log('Landmark 數據加載完成', landmarkData);
                
                // 創建虛擬骨架結構
                const skeletonGroup = new THREE.Group();
                const bones = [];
                const boneMap = {};
                
                // 為每個關節點創建 Bone
                JOINT_NAMES.forEach((name, index) => {
                    const bone = new THREE.Bone();
                    bone.name = name;
                    bone.userData.index = index;
                    bones.push(bone);
                    boneMap[name] = bone;
                    jointMapRef.current[name] = bone;
                });
                
                // 建立骨架層次結構
                // 創建一個虛擬根節點作為整個骨架的根
                const rootBone = new THREE.Bone();
                rootBone.name = 'root';
                skeletonGroup.add(rootBone);
                
                // 將所有骨頭添加到場景中（先不建立父子關係）
                bones.forEach(bone => {
                    skeletonGroup.add(bone);
                });
                
                // 為了視覺化目的，我們不建立嚴格的父子骨骼關係
                // 而是讓所有骨頭都獨立存在，通過連線來表示關係
                
                scene.add(skeletonGroup);
                
                // 設置初始位置（使用第一幀數據）
                if (landmarkData.length > 0) {
                    const firstFrame = landmarkData[0];
                    updateBonePositions(bones, firstFrame.landmarks3D || firstFrame.landmarks2D);
                }
                
                // 設置關節列表
                setJoints(JOINT_NAMES);
                setSelectedJoint(JOINT_NAMES[1] || ''); // left_shoulder
                setComparedJoint(JOINT_NAMES[2] || ''); // right_shoulder
                
                // 創建視覺化
                createLandmarkBoneMeshes(bones, POSE_CONNECTIONS, boneMeshes, skeletonGroup);
                createLandmarkJointSpheres(bones, jointSpheres, skeletonGroup);
                highlightSelectedJoint(jointSpheres, JOINT_NAMES[1], JOINT_NAMES[2]);
                
                // 點擊事件
                renderer.domElement.addEventListener('click', e => 
                    onClick(e, renderer, camera, skeletonGroup, jointSpheres, setAnnotations, frameRef)
                );
                
                // 創建自定義動畫系統
                const landmarkMixer = createLandmarkAnimationMixer(bones, landmarkData);
                mixerRef.current = landmarkMixer;
                setIsLandmarkLoaded(true);
                
                // 預計算 hip 位置用於重心分析
                landmarkData.forEach((frameData, frameIndex) => {
                    const landmarks = frameData.landmarks3D || frameData.landmarks2D;
                    const leftHip = landmarks[7]; // left_hip index
                    const rightHip = landmarks[8]; // right_hip index
                    console.log('landmarks', landmarks, leftHip, rightHip);
                    if (leftHip && rightHip) {
                        const centerHip = new THREE.Vector3(
                            (leftHip.x + rightHip.x) / 2,
                            (leftHip.y + rightHip.y) / 2,
                            (leftHip.z + rightHip.z) / 2
                        );
                        hipsPositionsRef.current[frameIndex] = centerHip;
                    }
                });
                
                // 啟動動畫循環
                animate({
                    renderer, scene, camera, 
                    mixer: landmarkMixer,
                    boneMeshes, jointSpheres,
                    isPausedRef, speedRef,
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
                    skeletonGroup,
                    bones,
                    boneMeshes,
                    jointSpheres,
                    mixer: landmarkMixer,
                    landmarkData
                });
            })
            .catch(reject);
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

// 更新骨骼位置
function updateBonePositions(bones, landmarks) {
    bones.forEach((bone, index) => {
        if (landmarks[index]) {
            const landmark = landmarks[index];
            bone.position.set(
                landmark.x * 100, // 放大座標
                -landmark.y * 100, // Y軸翻轉
                landmark.z * 100
            );
        }
    });
}

// 創建 Landmark 專用的動畫混合器
function createLandmarkAnimationMixer(bones, landmarkData) {
    let currentFrame = 0;
    const totalFrames = landmarkData.length;
    const fps = 30; // 假設 30fps
    
    return {
        _isLandmarkMixer: true,
        _bones: bones,
        _landmarkData: landmarkData,
        _currentFrame: currentFrame,
        _totalFrames: totalFrames,
        time: 0,
        
        update(deltaTime) {
            this.time += deltaTime;
            const targetFrame = Math.floor(this.time * fps) % totalFrames;
            
            if (targetFrame !== this._currentFrame) {
                this._currentFrame = targetFrame;
                const frameData = this._landmarkData[targetFrame];
                if (frameData) {
                    updateBonePositions(this._bones, frameData.landmarks3D || frameData.landmarks2D);
                }
            }
        },
        
        setTime(time) {
            this.time = time;
            const targetFrame = Math.floor(time * fps) % totalFrames;
            this._currentFrame = targetFrame;
            const frameData = this._landmarkData[targetFrame];
            if (frameData) {
                updateBonePositions(this._bones, frameData.landmarks3D || frameData.landmarks2D);
            }
        },
        
        // 相容原有 mixer API
        _actions: [{
            _clip: {
                duration: totalFrames / fps,
                tracks: [{ times: landmarkData.map((_, i) => i / fps) }]
            },
            time: 0
        }]
    };
}

// 創建 Landmark 專用骨骼網格
function createLandmarkBoneMeshes(bones, connections, boneMeshes, parent) {
    connections.forEach(([startIndex, endIndex]) => {
        const startBone = bones[startIndex];
        const endBone = bones[endIndex];
        
        if (startBone && endBone) {
            const geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
            const material = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
            const mesh = new THREE.Mesh(geometry, material);
            
            boneMeshes.push({ 
                bone: startBone, 
                endBone: endBone,
                mesh 
            });
            parent.add(mesh);
        }
    });
}

// 創建 Landmark 專用關節球體
function createLandmarkJointSpheres(bones, jointSpheres, parent) {
    bones.forEach(bone => {
        const geometry = new THREE.SphereGeometry(1.5, 16, 16);
        const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const sphere = new THREE.Mesh(geometry, material);
        
        jointSpheres.push({ bone, sphere });
        parent.add(sphere);
    });
}