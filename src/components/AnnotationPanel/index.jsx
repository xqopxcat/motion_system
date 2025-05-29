import React from 'react';
import './AnnotationPanel.scss';

const AnnotationPanel = ({ annotations, onFocus, onDelete }) => {
    return (
        <div className="annotation-panel">
            <div className="annotation-panel-title">註解列表</div>
            {annotations.length === 0 && (
                <div className="annotation-empty">尚無註解</div>
            )}
            <ul>
                { annotations.map((ann, idx) => {
                    const { bone, info } = ann;
                    return (
                        <li key={idx} className="annotation-item">
                            <span
                                className="annotation-text"
                                onClick={() => onFocus && onFocus(ann)}
                                title="點擊聚焦"
                            >
                                {`${info.frame} ${bone?.name}: ${info.text} `}
                            </span>
                            <button
                                className="annotation-delete"
                                onClick={() => onDelete && onDelete(idx)}
                                title="刪除"
                            >🗑</button>
                        </li>
                    )
                }) }
            </ul>
        </div>
    );
};

export default AnnotationPanel;