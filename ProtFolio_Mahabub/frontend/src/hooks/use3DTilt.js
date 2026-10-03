import { useState, useCallback, useRef } from 'react';

export default function use3DTilt(intensity = 15) {
    const ref = useRef(null);
    const [transform, setTransform] = useState('perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)');

    const handleMouseMove = useCallback((e) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -intensity;
        const rotateY = ((x - centerX) / centerX) * intensity;
        setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`);
    }, [intensity]);

    const handleMouseLeave = useCallback(() => {
        setTransform('perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)');
    }, []);

    return { ref, transform, handleMouseMove, handleMouseLeave };
}
