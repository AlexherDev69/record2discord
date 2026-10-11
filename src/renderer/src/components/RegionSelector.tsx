import { useRef, useState, type MouseEvent } from 'react';
import type { Region, ScoreRegions } from '../../../shared/types';
import { isDrawnRegion, regionFromPoints, type Point } from '../lib/region';

export type Side = keyof ScoreRegions;

interface RegionSelectorProps {
  frameDataUrl: string;
  regions: ScoreRegions;
  activeSide: Side;
  onChange: (region: Region) => void;
  /** Called once a rectangle has been drawn. */
  onDrawEnd: () => void;
}

// The frame is shown magnified, since a score digit is only a few dozen pixels wide.
const ZOOM = 2;
const SIDES: Side[] = ['home', 'away'];
const PERCENT = 100;
const LEFT_MOUSE_BUTTON = 0;

function toPercent(fraction: number): string {
  return `${fraction * PERCENT}%`;
}

/** Shows the captured frame and lets the user draw the active score region with the mouse. */
export function RegionSelector({ frameDataUrl, regions, activeSide, onChange, onDrawEnd }: RegionSelectorProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<Point | null>(null);
  const hasDrawn = useRef(false);
  const [naturalWidth, setNaturalWidth] = useState<number | null>(null);

  const pointFromEvent = (event: MouseEvent): Point | null => {
    const bounds = frameRef.current?.getBoundingClientRect();
    if (bounds === undefined) {
      return null;
    }
    return { x: (event.clientX - bounds.left) / bounds.width, y: (event.clientY - bounds.top) / bounds.height };
  };

  const drag = (event: MouseEvent): void => {
    const point = pointFromEvent(event);
    if (dragStart.current === null || point === null) {
      return;
    }
    const region = regionFromPoints(dragStart.current, point);
    if (isDrawnRegion(region)) {
      onChange(region);
      hasDrawn.current = true;
    }
  };

  const endDrag = (): void => {
    dragStart.current = null;
    if (hasDrawn.current) {
      hasDrawn.current = false;
      onDrawEnd();
    }
  };

  return (
    <div className="frame-scroll">
      <div
        ref={frameRef}
        className="frame"
        onMouseDown={(event) => {
          if (event.button === LEFT_MOUSE_BUTTON) {
            dragStart.current = pointFromEvent(event);
          }
        }}
        onMouseMove={drag}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
      >
        <img
          src={frameDataUrl}
          alt="Capture du jeu"
          draggable={false}
          style={naturalWidth === null ? undefined : { width: naturalWidth * ZOOM }}
          onLoad={(event) => setNaturalWidth(event.currentTarget.naturalWidth)}
        />
        {SIDES.map((side) => (
          <div
            key={side}
            className={side === activeSide ? `region region-${side} region-active` : `region region-${side}`}
            style={{
              left: toPercent(regions[side].left),
              top: toPercent(regions[side].top),
              width: toPercent(regions[side].width),
              height: toPercent(regions[side].height),
            }}
          />
        ))}
      </div>
    </div>
  );
}
