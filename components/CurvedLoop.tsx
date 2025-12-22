import { useRef, useEffect, useState, useMemo, useId, FC, PointerEvent } from 'react';

interface CurvedLoopProps {
  marqueeText?: string;
  speed?: number;
  className?: string;
  curveAmount?: number;
  direction?: 'left' | 'right';
  interactive?: boolean;
  fontFamily?: string;
}

const CurvedLoop: FC<CurvedLoopProps> = ({
  marqueeText = '',
  speed = 2,
  className,
  curveAmount = 400,
  direction = 'left',
  interactive = true,
  fontFamily
}) => {
  const text = useMemo(() => {
    const hasTrailing = /\s|\u00A0$/.test(marqueeText);
    return (hasTrailing ? marqueeText.replace(/\s+$/, '') : marqueeText) + '\u00A0';
  }, [marqueeText]);

  const measureRef = useRef<SVGTextElement | null>(null);
  const textPathRef = useRef<SVGTextPathElement | null>(null);
  const pathRef = useRef<SVGPathElement | null>(null);
  const [spacing, setSpacing] = useState(0);
  const [offset, setOffset] = useState(0);
  const [textHeight, setTextHeight] = useState(120); // Default height
  const uid = useId();
  const pathId = `curve-${uid}`;
  // Dynamic path based on text height - position at ~75% to account for text baseline
  const pathY = textHeight * 0.75;
  const pathD = `M-100,${pathY} Q500,${pathY + curveAmount} 1540,${pathY}`;

  const dragRef = useRef(false);
  const lastXRef = useRef(0);
  const dirRef = useRef<'left' | 'right'>(direction);
  const velRef = useRef(0);

  // Update dirRef when direction prop changes
  useEffect(() => {
    dirRef.current = direction;
  }, [direction]);

  const textLength = spacing;
  // Create enough text copies for seamless infinite loop (at least 3-4 copies)
  const totalText = textLength
    ? Array(Math.max(Math.ceil(1800 / textLength) + 3, 4))
        .fill(text)
        .join('')
    : text;
  const ready = spacing > 0;

  useEffect(() => {
    if (measureRef.current) {
      setSpacing(measureRef.current.getComputedTextLength());
      // Get text height dynamically - use exact text height
      const bbox = measureRef.current.getBBox();
      if (bbox.height > 0) {
        // Use exact height with minimal padding
        setTextHeight(bbox.height);
      }
    }
  }, [text, className, fontFamily]);

  useEffect(() => {
    if (!spacing) return;
    if (textPathRef.current) {
      const initial = -spacing;
      textPathRef.current.setAttribute('startOffset', initial + 'px');
      setOffset(initial);
    }
  }, [spacing]);

  useEffect(() => {
    if (!spacing || !ready) return;
    let frame = 0;
    const step = () => {
      if (!dragRef.current && textPathRef.current) {
        const delta = dirRef.current === 'right' ? speed : -speed;
        const currentOffset = parseFloat(textPathRef.current.getAttribute('startOffset') || '0');
        let newOffset = currentOffset + delta;
        const wrapPoint = spacing;
        // Seamless infinite loop - continuously wrap without jumps
        // When offset goes beyond -wrapPoint, wrap it back smoothly
        while (newOffset <= -wrapPoint) {
          newOffset += wrapPoint;
        }
        while (newOffset > 0) {
          newOffset -= wrapPoint;
        }
        textPathRef.current.setAttribute('startOffset', newOffset + 'px');
        setOffset(newOffset);
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [spacing, speed, ready, direction]);

  const onPointerDown = (e: PointerEvent) => {
    if (!interactive) return;
    dragRef.current = true;
    lastXRef.current = e.clientX;
    velRef.current = 0;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!interactive || !dragRef.current || !textPathRef.current) return;
    const dx = e.clientX - lastXRef.current;
    lastXRef.current = e.clientX;
    velRef.current = dx;
    const currentOffset = parseFloat(textPathRef.current.getAttribute('startOffset') || '0');
    let newOffset = currentOffset + dx;
    const wrapPoint = spacing;
    if (newOffset <= -wrapPoint) newOffset += wrapPoint;
    if (newOffset > 0) newOffset -= wrapPoint;
    textPathRef.current.setAttribute('startOffset', newOffset + 'px');
    setOffset(newOffset);
  };

  const endDrag = () => {
    if (!interactive) return;
    dragRef.current = false;
    dirRef.current = velRef.current > 0 ? 'right' : 'left';
  };

  const cursorStyle = interactive ? (dragRef.current ? 'grabbing' : 'grab') : 'auto';

  return (
    <div
      className="flex items-center justify-center w-full"
      style={{ visibility: ready ? 'visible' : 'hidden', cursor: cursorStyle }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
    >
      <svg
        className="select-none w-full overflow-visible block font-normal leading-none"
        style={{ 
          fontFamily: fontFamily || 'system-ui, sans-serif', 
          height: `${textHeight}px`,
          maxHeight: `${textHeight}px`,
          fontSize: 'clamp(2rem, 8vw, 6rem)'
        }}
        viewBox={`0 0 1440 ${textHeight}`}
        preserveAspectRatio="xMidYMid slice"
      >
        <text ref={measureRef} xmlSpace="preserve" style={{ visibility: 'hidden', opacity: 0, pointerEvents: 'none', fontFamily: fontFamily || 'system-ui, sans-serif' }}>
          {text}
        </text>
        <defs>
          <path ref={pathRef} id={pathId} d={pathD} fill="none" stroke="transparent" />
        </defs>
        {ready && (
          <text xmlSpace="preserve" className={className ?? ''} style={{ fontFamily: fontFamily || 'system-ui, sans-serif' }} fill="white">
            <textPath ref={textPathRef} href={`#${pathId}`} startOffset={offset + 'px'} xmlSpace="preserve">
              {totalText}
            </textPath>
          </text>
        )}
      </svg>
    </div>
  );
};

export default CurvedLoop;
