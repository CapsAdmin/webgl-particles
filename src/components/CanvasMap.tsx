import { Add, GpsFixed, Remove } from "@mui/icons-material";
import { IconButton, Stack } from "@mui/material";
import {
  MutableRefObject,
  RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { renderLoop } from "../other/Events";
import { useResize } from "../other/useResize";

export type MapView = { x: number; y: number; scale: number };

export const CanvasMap = (props: {
  canvasRef: RefObject<HTMLCanvasElement>;
  viewRef: MutableRefObject<[number, number, number, number]>;
  worldSize: [number, number];
}) => {
  const [view, setView] = useState<MapView>({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const { width, height } = useResize();

  const viewHeight = height || window.innerHeight || 700;
  const viewWidth = width || window.innerWidth || 700;

  const worldWidth = props.worldSize[0];
  const worldHeight = props.worldSize[1];

  const renderSize = Math.max(worldWidth, worldHeight);
  const renderWidth = Math.min(renderSize, 1024);
  const renderHeight = Math.min(renderSize, 1024);

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      let newScale = view.scale - (view.scale / e.deltaY) * 4;
      setView({ ...view, scale: newScale });
    },
    [view]
  );

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      setIsDragging(true);
      setDragStart({ x: e.clientX - view.x, y: e.clientY - view.y });
    },
    [view]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      setView({
        ...view,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (e.touches.length === 1) {
        setIsDragging(true);
        setDragStart({
          x: e.touches[0].clientX - view.x,
          y: e.touches[0].clientY - view.y,
        });
      }
    },
    [view]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging || e.touches.length !== 1) return;
      setView({
        ...view,
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    },
    [isDragging, dragStart]
  );

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const zoomIn = useCallback(
    () => setView({ ...view, scale: view.scale - (view.scale / -10) * 4 }),
    [view]
  );

  const zoomOut = useCallback(
    () => setView({ ...view, scale: view.scale - (view.scale / 10) * 4 }),
    [view]
  );

  const center = useCallback(() => {
    setView({
      x: 0,
      y: 0,
      scale: 1,
    });
  }, [viewWidth, viewHeight, worldWidth, worldHeight, view]);

  // Set up event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("wheel", handleWheel, { passive: false });
    container.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    container.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      container.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  ]);

  useEffect(() => {
    const stop = renderLoop(() => {
      let x = -view.x / view.scale;
      let y = view.y / view.scale;

      props.viewRef.current = [x, y, view.scale, viewWidth / viewHeight];
    });
    return stop;
  }, [viewWidth, viewHeight, view]);

  return (
    <div
      style={{
        position: "relative",
        flex: 1,
        height: "100%",
        overflow: "hidden",
      }}
      ref={containerRef}
    >
      <>
        <div
          style={{
            position: "absolute",
            bottom: 25,
            right: 15,
            zIndex: 100,
          }}
        >
          <Stack direction={"column"}>
            <IconButton
              size="small"
              onClick={() => {
                center();
              }}
            >
              <GpsFixed />
            </IconButton>
            <IconButton size="small" onClick={() => zoomIn()}>
              <Add />
            </IconButton>
            <IconButton size="small" onClick={() => zoomOut()}>
              <Remove />
            </IconButton>
          </Stack>
        </div>
        <div
          style={{
            width: viewWidth,
            height: viewHeight,
            position: "relative",
            overflow: "visible",
          }}
        ></div>
        <canvas
          width={renderWidth}
          height={renderHeight}
          ref={props.canvasRef}
          style={{
            objectFit: "cover",
            pointerEvents: "none",
            position: "absolute",
            width: viewWidth,
            height: viewHeight,
            zIndex: 10,
            top: 0,
            left: 0,
          }}
        />
      </>
    </div>
  );
};
