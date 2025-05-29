import React, { useState } from 'react';
import './ActionDataPanel.scss';

const joints = [
    'LeftKnee', 'RightKnee', 'LeftElbow', 'RightElbow', // 可依實際骨架命名擴充
];

export default function ActionDataPanel({
    frameData, // 當前幀的數據
    onJointChange,
    selectedJoint,
    jointsList = joints
}) {
    return (
        <div className="action-data-panel">
            <div className="panel-title">動作數據</div>
            <div className="joint-selector">
                <label>選擇關節：</label>
                <select
                    value={selectedJoint}
                    onChange={e => onJointChange(e.target.value)}
                >
                    {jointsList.map(j => (
                        <option key={j} value={j}>{j}</option>
                    ))}
                </select>
            </div>
            <div className="data-row">
                <strong>{selectedJoint} Flexion：</strong>
                <span>{frameData.angle}°</span>
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
                <strong>關節對關節距離：</strong>
                <span>{frameData.jointDistance}</span>
            </div>
        </div>
    );
}