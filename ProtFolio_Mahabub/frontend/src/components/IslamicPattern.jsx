import React, { useId } from 'react';

function IslamicPattern({ className = '', style = {}, strokeWidth = 1 }) {
    const id = useId().replace(/[^a-zA-Z0-9]/g, '');

    return (
        <svg
            className={className}
            style={style}
            width="100%"
            height="100%"
            aria-hidden="true"
            focusable="false"
        >
            <defs>
                <pattern id={id} width="48" height="48" patternUnits="userSpaceOnUse">
                    <g fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round">
                        {/* Center 8-pointed star */}
                        <polygon points="24,8 40,24 24,40 8,24" />
                        <polygon points="35.31,12.69 35.31,35.31 12.69,35.31 12.69,12.69" />
                        {/* Mid-edge diamonds */}
                        <polygon points="24,8 32,0 24,-8 16,0" />
                        <polygon points="24,56 32,48 24,40 16,48" />
                        <polygon points="8,24 0,32 -8,24 0,16" />
                        <polygon points="56,24 48,32 40,24 48,16" />
                        {/* Quarter stars at corners */}
                        <polygon points="0,-16 16,0 0,16 -16,0" />
                        <polygon points="11.31,-11.31 11.31,11.31 -11.31,11.31 -11.31,-11.31" />
                        <polygon points="48,-16 64,0 48,16 32,0" />
                        <polygon points="59.31,-11.31 59.31,11.31 36.69,11.31 36.69,-11.31" />
                        <polygon points="0,32 16,48 0,64 -16,48" />
                        <polygon points="11.31,36.69 11.31,59.31 -11.31,59.31 -11.31,36.69" />
                        <polygon points="48,32 64,48 48,64 32,48" />
                        <polygon points="59.31,36.69 59.31,59.31 36.69,59.31 36.69,36.69" />
                    </g>
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#${id})`} />
        </svg>
    );
}

export default IslamicPattern;
