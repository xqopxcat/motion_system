import { useEffect, useState, useRef } from 'react';
import * as THREE from 'three';
import { BVHLoader } from 'three/examples/jsm/loaders/BVHLoader';
import { initScene, adjustCamera } from './scenes/init'; // 假設有一個 initScene 函數來初始化場景
import { addLights, addFloor } from './scenes/lightsAndFloor'; // 假設有一個模組來添加光源和地板
import { createBoneMeshes, createJointSpheres, calculateBoundingBox } from './scenes/createObject';
import { makeTextSprite } from "./scenes/modules";
import ControlPanel from "./components/ControlPanel";
import ActionDataPanel from "./components/ActionDataPanel";


function App() {
    const mountRef = useRef(null);
    const [annotations, setAnnotations] = useState([]);
    const [speed, setSpeed] = useState(0.1);      // 控制播放速率
    const [progress, setProgress] = useState(0);  // 控制播放進度條
    const [frameNumber, setFrameNumber] = useState(0);
    const [isPaused, setIsPaused] = useState(true);
    const [frameStep, setFrameStep] = useState(false);
    const [isBVHLoaded, setIsBVHLoaded] = useState(false)
    const [joints, setJoints] = useState([]); // 用於存儲骨架關節
    const [selectedJoint, setSelectedJoint] = useState('');
    const [comparedJoint, setComparedJoint] = useState('');
    const [currentFrameData, setCurrentFrameData] = useState({
        angle: 0,
        centerX: 0,
        centerY: 0,
        centerZ: 0,
        jointDistance: 0,
    });
    const mixerRef = useRef(null);
    const isPausedRef = useRef(isPaused);
    const speedRef = useRef(speed);
    const frameRef = useRef(frameNumber);
    const cameraRef = useRef(null);
    const jointMapRef = useRef({});
    const selectedJointRef = useRef('');
    const comparedJointRef = useRef('');

    // 取得骨架所有 bone
    function getAllBones(root) {
        const arr = [];
        root.traverse(b => {
            if (b.isBone) arr.push(b);
        });
        return arr;
    }
    
    useEffect(() => {
        isPausedRef.current = isPaused;
    }, [isPaused]);

    useEffect(() => {
        selectedJointRef.current = selectedJoint;
    }, [selectedJoint]);

    useEffect(() => {
        comparedJointRef.current = comparedJoint;
    }, [comparedJoint]);
    
    useEffect(() => {
        speedRef.current = speed;
    }, [speed]);
    
    useEffect(() => {
        frameRef.current = frameNumber;
    }, [frameNumber]);
    
    useEffect(() => {
        const mount = mountRef.current;
        const { scene, camera, renderer } = initScene(mount);
        cameraRef.current = camera;
        addLights(scene);
        addFloor(scene);

        const loader = new BVHLoader();
        loader.load('/full_body_motion_sample.bvh', (result) => {
            const boneRoot = result.skeleton.bones[0];
            const skeletonGroup = new THREE.Group();
            skeletonGroup.add(boneRoot);
            scene.add(skeletonGroup);
            
            const boneList = getAllBones(boneRoot);
            setJoints(boneList.map(b => b.name));
            setSelectedJoint(boneList[0]?.name || '');
            setComparedJoint(boneList[1]?.name || '');
            boneList.forEach(b => jointMapRef.current[b.name] = b);
            // boneRoot.updateMatrixWorld(true);
            let raycaster = new THREE.Raycaster();
            let mouse = new THREE.Vector2();
            

            // 建立骨架視覺物件
            const boneMeshes = [];
            const jointSpheres = [];
            createBoneMeshes(boneRoot, boneMeshes, skeletonGroup);
            createJointSpheres(boneRoot, jointSpheres, skeletonGroup);
            
            function onClick(event) {
                const rect = renderer.domElement.getBoundingClientRect();
                mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
                mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
                raycaster.setFromCamera(mouse, camera);

                const intersects = raycaster.intersectObjects(
                    jointSpheres.map(j => j.sphere)
                );
                if (intersects.length > 0) {
                    const sphere = intersects[0].object;
                    const joint = jointSpheres.find(j => j.sphere === sphere);
                    if (joint) {
                        // 1. 新增姿勢標記球
                        const marker = new THREE.Mesh(
                            new THREE.SphereGeometry(1.2),
                            new THREE.MeshBasicMaterial({ color: 0x00ff00 })
                        );
                        marker.position.copy(joint.bone.getWorldPosition(new THREE.Vector3()));
                        skeletonGroup.add(marker);

                        // 2. 彈出輸入框加入註解
                        const text = window.prompt('請輸入註解：');
                        if (text) {
                            const info = {
                                frame: frameRef.current,
                                text
                            }
                            const sprite = makeTextSprite(`${frameRef.current} ${joint.bone.name}: ${text}`);
                            sprite.position.copy(joint.bone.getWorldPosition(new THREE.Vector3()));
                            skeletonGroup.add(sprite);
                            setAnnotations(prev => [
                                ...prev,
                                { bone: joint.bone, sprite, marker, info }
                            ]);
                        }
                    }
                }
            }
            renderer.domElement.addEventListener('click', onClick);
            // 計算骨骼的邊界框和最低點
            const { offset, center, size } = calculateBoundingBox(boneRoot);
            skeletonGroup.position.y -= offset / 2;
            adjustCamera(camera, center, size);
        
            // 動畫
            const mixer = new THREE.AnimationMixer(boneRoot);
            mixer.clipAction(result.clip).setEffectiveWeight(1.0).play();
            mixerRef.current = mixer;
            setIsBVHLoaded(true);
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
                onSetCurrentFrameData: setCurrentFrameData,
            });
            return () => {
                renderer.domElement.removeEventListener('click', onClick);
            }
        });

        // 處理視窗大小調整
        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            mount.removeChild(renderer.domElement);
            window.removeEventListener('resize', handleResize);
        };
    }, []);
    
    useEffect(() => {
        if (frameStep && mixerRef.current) {
            mixerRef.current.update(1 / 30); // 假設 30fps
            setFrameStep(false);
        }
    }, [frameStep]);
    
    return (
        <>
            <div ref={mountRef} style={{ width: '100vw', height: '100vh' }} />);
            {isBVHLoaded && (
                <ControlPanel
                    annotations={annotations}
                    onAnnotationFocus={ann => {
                        // 例如讓相機聚焦到 ann.bone
                        if (ann.bone) {
                            const pos = ann.bone.getWorldPosition(new THREE.Vector3());
                            cameraRef.current.position.lerp(pos, 0.5); // 或自訂聚焦動畫
                        }
                    }}
                    onAnnotationDelete={idx => {
                        setAnnotations(prev => {
                            const annotation = prev[idx];
                            if (annotation?.marker && annotation.marker.parent) {
                                annotation.marker.parent.remove(annotation.marker);
                            }
                            if (annotation?.sprite && annotation.sprite.parent) {
                                annotation.sprite.parent.remove(annotation.sprite);
                            }
                            return prev.filter((_, i) => i !== idx)
                        });
                    }}
                    onAnnotationEdit={(idx, newText) => {
                        setAnnotations(prev => prev.map((ann, i) => {
                            if (i === idx) {
                                // 1. 產生新的 sprite
                                const newSprite = makeTextSprite(`${ann.info.frame} ${ann.bone?.name}: ${newText}`);
                                // 2. 保持 sprite 位置不變
                                newSprite.position.copy(ann.sprite.position);
                                // 3. 用新 sprite 替換舊 sprite
                                if (ann.sprite && ann.sprite.parent) {
                                    ann.sprite.parent.add(newSprite);
                                    ann.sprite.parent.remove(ann.sprite);
                                }
                                // 4. 回傳新的 annotation
                                return {
                                    ...ann,
                                    sprite: newSprite,
                                    info: { ...ann.info, text: newText }
                                };
                            }
                            return ann;
                        }));
                    }}
                    frameNumber={frameNumber}
                    frameRef={frameRef}
                    mixerRef={mixerRef}
                    setFrameNumber={setFrameNumber}
                    isPaused={isPaused}
                    setIsPaused={setIsPaused}
                    setFrameStep={setFrameStep}
                    speed={speed}
                    setSpeed={setSpeed}
                    progress={progress}
                    setProgress={setProgress}
                />
            )}
            <ActionDataPanel
                jointsList={joints}
                selectedJoint={selectedJoint}
                comparedJoint={comparedJoint}
                onJointChange={setSelectedJoint}
                onComparedJointChange={setComparedJoint}
                frameData={currentFrameData}
                onFrameDataChange={(data) => {
                    setCurrentFrameData(data);
                }}
            />
        </>
    )
}

export default App;

// 動畫循環
function animate({
    renderer,
    scene,
    camera,
    mixer,
    boneMeshes,
    jointSpheres,
    isPausedRef,
    speedRef,
    onProgerss,
    onFrame,
    jointMapRef,
    selectedJointRef,
    comparedJointRef,
    onSetCurrentFrameData,
}) {
    const clock = new THREE.Clock();
    function loop() {
        requestAnimationFrame(loop);
        const delta = clock.getDelta();
        if (!isPausedRef.current && mixer) {
            mixer.update(delta * speedRef.current);
        };
        
        // 進度條計算 && 幀數計算
        if (mixer && mixer._actions[0]?._clip) {
            const action = mixer._actions[0];
            const clip = action._clip;
            const time = action.time !== undefined ? action.time : mixer.time;
            const fps = 1 / clip.tracks[0].times[1] - clip.tracks[0].times[0] || 30;
            const frame = Math.floor(time * fps);
            if (onFrame) onFrame(frame);
            const progress = Math.min(time / clip.duration, 1);
            if (onProgerss) onProgerss(progress);
        }

        // 更新骨架圓柱
        boneMeshes.forEach(({ bone, mesh }) => {
            const parentPosition = bone.parent.getWorldPosition(new THREE.Vector3());
            const childPosition = bone.getWorldPosition(new THREE.Vector3());
            const direction = new THREE.Vector3().subVectors(childPosition, parentPosition);
            const length = direction.length();
            mesh.position.copy(parentPosition.clone().add(direction.multiplyScalar(0.5)));
            mesh.quaternion.setFromUnitVectors(
                new THREE.Vector3(0, 1, 0),
                direction.clone().normalize()
            );
            mesh.scale.set(1, length / mesh.geometry.parameters.height, 1);
        });
        
        jointSpheres.forEach(({ bone, sphere }) => {
            const pos = bone.getWorldPosition(new THREE.Vector3());
            sphere.position.copy(pos);
        });

        // 重心座標（用 Hips）
        const hips = jointMapRef.current["Hips"];
        if (hips) {
            const pos = hips.getWorldPosition(new THREE.Vector3());
            onSetCurrentFrameData(prev => ({
                ...prev,
                centerX: pos.x.toFixed(2),
                centerY: pos.y.toFixed(2),
                centerZ: pos.z.toFixed(2),
            }));
        }
        

        // 指定關節的角度
        const sel = jointMapRef.current[selectedJointRef.current];
        const compared = jointMapRef.current[comparedJointRef.current];
        let angleDeg = 0;
        let jointDistance = 0;
        if (sel && sel.parent && sel.parent.isBone) {
            // 用四元數 dot 取夾角（僅作展示）
            const jointQuaternion = sel.quaternion;
            const parentQuaternion = sel.parent.quaternion;
            angleDeg = Math.acos(
                2 * Math.pow(jointQuaternion.dot(parentQuaternion), 2) - 1
            ) * (180 / Math.PI);
            onSetCurrentFrameData(prev => ({
                ...prev,
                angle: angleDeg,
            }));
        }
        // 相對關節距離
        if (sel && compared) {
            jointDistance = sel.getWorldPosition(new THREE.Vector3()).distanceTo(compared.getWorldPosition(new THREE.Vector3()));
            onSetCurrentFrameData(prev => ({
                ...prev,
                jointDistance: jointDistance.toFixed(2),
            }));
        }

        renderer.render(scene, camera);
    }

    loop();
}
