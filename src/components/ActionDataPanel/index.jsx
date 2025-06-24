import React, { useState } from 'react';
import './ActionDataPanel.scss';

const joints = [
    'LeftKnee', 'RightKnee', 'LeftElbow', 'RightElbow', // 可依實際骨架命名擴充
];

export default function ActionDataPanel({
    frameData, // 當前幀的數據
    onJointChange,
    onComparedJointChange,
    selectedJoint,
    comparedJoint,
    jointsList = joints
}) {
    return (
        <div className="action-data-panel">
            <div className="panel-title">動作數據</div>
            <div className="joint-selector">
                <label className="select-joint">選擇關節：</label>
                <select
                    value={selectedJoint}
                    onChange={e => onJointChange(e.target.value)}
                >
                    {jointsList.map((joint, index) => (
                        <option key={`${joint}-${index}`} value={joint}>{joint}</option>
                    ))}
                </select>
            </div>
            <div className="joint-selector">
                <label className="compared-joint">相對關節：</label>
                <select
                    value={comparedJoint}
                    onChange={e => onComparedJointChange(e.target.value)}
                >
                    {jointsList.map((joint, index) => (
                        <option key={`${joint}-${index}`} value={joint}>{joint}</option>
                    ))}
                </select>
            </div>
            <div className="data-row">
                <strong>重心座標：</strong>
                <span>
                    X: {frameData.centerX}&nbsp;
                    Y: {frameData.centerY}&nbsp;
                    Z: {frameData.centerZ}
                </span>
            </div>
            <div className="data-row">
                <strong className='distance' data-full-text={`${selectedJoint}對${comparedJoint}的姿態差異角度`}>
                    {`${selectedJoint}對${comparedJoint}的姿態差異角度`}
                </strong>
                <span>{frameData.angle}°</span>
            </div>
            <div className="data-row">
                <strong className='distance' data-full-text={`${selectedJoint}對${comparedJoint}的姿態差異分量`}>
                    {`${selectedJoint}對${comparedJoint}的姿態差異分量`}
                </strong>
                <span>
                    X: {frameData.angleX}&nbsp;
                    Y: {frameData.angleY}&nbsp;
                    Z: {frameData.angleZ}
                </span>
            </div>
            <div className="data-row">
                <strong className='distance' data-full-text={`${selectedJoint}對${comparedJoint}距離`}>
                    {`${selectedJoint}對${comparedJoint}距離：`}
                </strong>
                <span>{frameData.jointDistance}</span>
            </div>
        </div>
    );
}