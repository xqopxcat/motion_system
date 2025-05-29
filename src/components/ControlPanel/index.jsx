import React from 'react';
import './ControlPanel.scss';
import FrameDisplay from "./FrameDisplay/FrameDisplay";
import FrameJumpInput from "./FrameJumpInput/FrameJumpInput";
import PlayPauseButtons from "./PlayPauseButtons/PlayPauseButtons";
import SpeedSlider from "./SpeedSlider/SpeedSlider";
import ProgressSlider from "./ProgressSlider/ProgressSlider";
import AnnotationPanel from "../AnnotationPanel";

export default function ControlPanel(props) {
    return (
        <div className="control-panel-container">
            <div className="control-panel-title">控制面板</div>
            <FrameDisplay frameNumber={props.frameNumber} />
            <FrameJumpInput value={props.frameNumber} mixerRef={props.mixerRef} setFrameNumber={props.setFrameNumber} />
            <PlayPauseButtons isPaused={props.isPaused} setIsPaused={props.setIsPaused} setFrameStep={props.setFrameStep} />
            <SpeedSlider speed={props.speed} setSpeed={props.setSpeed} />
            <ProgressSlider progress={props.progress} setProgress={props.setProgress} mixerRef={props.mixerRef} />
            <AnnotationPanel
                annotations={props.annotations}
                onFocus={props.onAnnotationFocus}
                onDelete={props.onAnnotationDelete}
                onEdit={props.onAnnotationEdit}
            />
        </div>
    );
}