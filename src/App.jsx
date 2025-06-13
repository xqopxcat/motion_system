import { useEffect, useState, useRef } from 'react';
import * as THREE from 'three';
import { initScene } from './scenes/init'; // 假設有一個 initScene 函數來初始化場景
import { addLights, addFloor } from './scenes/lightsAndFloor'; // 假設有一個模組來添加光源和地板
import { makeTextSprite } from "./scenes/modules";
import ControlPanel from "./components/ControlPanel";
import ActionDataPanel from "./components/ActionDataPanel";
import { loadBVHAndInitSkeleton, loadFBXAndInitSkeleton } from "./scenes/loadFile";

const boneMeshes = [];
const jointSpheres = [];

export function highlightSelectedJoint(jointSpheres, selectedJointName, comparedJointName) {
    jointSpheres.forEach(({ bone, sphere }) => {
        if (bone.name === selectedJointName) {
            sphere.material.color.set(0x00ffff); // 主選擇關節：青色
        } else if (bone.name === comparedJointName) {
            sphere.material.color.set(0xffff00); // 比較關節：黃色
        } else {
            sphere.material.color.set(0xff0000); // 其他：紅色
        }
    });
}

function App() {
    const mountRef = useRef(null);
    const [annotations, setAnnotations] = useState([]);
    const [speed, setSpeed] = useState(0.5);      // 控制播放速率
    const [progress, setProgress] = useState(0);  // 控制播放進度條
    const [frameNumber, setFrameNumber] = useState(0);
    const [isPaused, setIsPaused] = useState(true);
    const [frameStep, setFrameStep] = useState(false);
    const [isBVHLoaded, setIsBVHLoaded] = useState(false)
    const [isFBXLoaded, setIsFBXLoaded] = useState(false)
    const [joints, setJoints] = useState([]); // 用於存儲骨架關節
    const [selectedJoint, setSelectedJoint] = useState('');
    const [comparedJoint, setComparedJoint] = useState('');
    const [currentFrameData, setCurrentFrameData] = useState({
        angle: 0,
        angleX: 0,
        angleY: 0,
        angleZ: 0,
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

        loadBVHAndInitSkeleton({
            bvhUrl: '/pirouette.bvh',
            scene,
            camera,
            renderer,
            setJoints,
            setSelectedJoint,
            setComparedJoint,
            boneMeshes,
            jointSpheres,
            jointMapRef,
            setAnnotations,
            setIsBVHLoaded,
            setProgress,
            setFrameNumber,
            setCurrentFrameData,
            mixerRef,
            isPausedRef,
            speedRef,
            selectedJointRef,
            comparedJointRef,
            animate,
        });
        // loadFBXAndInitSkeleton({
        //     fbxUrl: '/Baseball_Pitcher_mixamo.fbx',
        //     scene,
        //     camera,
        //     renderer,
        //     setJoints,
        //     setSelectedJoint,
        //     setComparedJoint,
        //     jointMapRef,
        //     boneMeshes,
        //     jointSpheres,
        //     setAnnotations,
        //     setIsFBXLoaded,
        //     setProgress,
        //     setFrameNumber,
        //     setCurrentFrameData,
        //     frameRef,
        //     mixerRef,
        //     isPausedRef,
        //     speedRef,
        //     selectedJointRef,
        //     comparedJointRef,
        //     animate,
        // });

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
            const action = mixerRef.current._actions[0];
            const clip = action._clip;
            const fps = 1 / clip.tracks[0].times[1] - clip.tracks[0].times[0] || 30;
            mixerRef.current.update(1 / Math.floor(fps)); // 假設 30fps
            setFrameStep(false);
        }
    }, [frameStep, frameNumber]);
    
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
                onJointChange={jointName => {
                    setSelectedJoint(jointName);
                    highlightSelectedJoint(jointSpheres, jointName, comparedJoint);
                }}
                onComparedJointChange={jointName => {
                    setComparedJoint(jointName);
                    highlightSelectedJoint(jointSpheres, selectedJoint, jointName);
                }}
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
        const hips = jointMapRef.current["hip"] ||jointMapRef.current["Hips"] || jointMapRef.current["mixamorigHips"] || jointMapRef.current["mixamorig:Hips"];
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
        if (sel && compared) {
            // 取得兩個骨頭的世界旋轉
            const selQuat = sel.getWorldQuaternion(new THREE.Quaternion());
            const comparedQuat = compared.getWorldQuaternion(new THREE.Quaternion());
            const relativeQuat = selQuat.clone().invert().multiply(comparedQuat);
            // 轉成歐拉角（XYZ順序）
            const relativeEuler = new THREE.Euler().setFromQuaternion(relativeQuat, 'XYZ');
            // 取得每個軸向的角度（單位：度）
            const angleX = THREE.MathUtils.radToDeg(relativeEuler.x);
            const angleY = THREE.MathUtils.radToDeg(relativeEuler.y);
            const angleZ = THREE.MathUtils.radToDeg(relativeEuler.z);
            const angleRad = 2 * Math.acos(Math.min(Math.max(relativeQuat.w, -1), 1));
            angleDeg = angleRad * (180 / Math.PI);
            // angleDeg = Math.acos(
            //     2 * Math.pow(selQuat.dot(comparedQuat), 2) - 1
            // ) * (180 / Math.PI);
            onSetCurrentFrameData(prev => ({
                ...prev,
                angle: angleDeg.toFixed(2),
                angleX: angleX.toFixed(2),
                angleY: angleY.toFixed(2),
                angleZ: angleZ.toFixed(2),
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
