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
import ReactResizeDetector from "react-resize-detector";
import {
  ReactZoomPanPinchRef,
  TransformComponent,
  TransformWrapper,
} from "react-zoom-pan-pinch";
import { renderLoop } from "../other/Events";

export type MapView = [number, number, number, number];

export const CanvasMap = (props: {
  canvasRef: RefObject<HTMLCanvasElement>;
  viewRef: MutableRefObject<MapView>;
  viewSize: number;
  worldScale: number;
}) => {
  const [viewWidth, setViewWidth] = useState(window.innerWidth);
  const [viewHeight, setViewHeight] = useState(window.innerHeight);
  const worldWidth = viewWidth * props.worldScale;
  const worldHeight = viewHeight * props.worldScale;
  const panRef = useRef<ReactZoomPanPinchRef | null>(null);

  const renderSize = Math.max(viewWidth, viewHeight);
  const renderWidth = Math.min(renderSize, 1024);
  const renderHeight = Math.min(renderSize, 1024);

  useEffect(() => {
    const stop = renderLoop(() => {
      const pan = panRef.current;
      if (!pan) return;
      const scale = pan.state.scale;

      let x = pan.state.positionX;
      let y = pan.state.positionY;

      x = -(x - viewWidth / 2) / worldWidth;
      y = -(y - viewHeight / 2) / worldHeight;

      if (viewWidth < viewHeight) {
        x *= viewWidth / viewHeight;
      } else {
        y *= viewHeight / viewWidth;
      }

      x = x * (1 / scale);
      y = y * (1 / scale);

      x = x * 2 - 1;
      y = y * 2 - 1;

      x = x * (worldWidth / viewWidth);
      y = y * (worldHeight / viewHeight);

      x = x * scale;
      y = y * scale;

      x = -x;

      props.viewRef.current = [x, y, scale, viewWidth / viewHeight] as const;
    });
    return stop;
  }, [viewWidth, viewHeight]);

  return (
    <ReactResizeDetector
      handleWidth
      handleHeight
      onResize={(width, height) => {
        width = width || 700;
        height = height || 700;
        const pan = panRef.current!;
        setViewWidth(width);
        setViewHeight(height);

        let x = 0;
        let y = 0;

        if (width > height) {
          y = height * 0.5 * (-(width / height) + 1);
        } else {
          x = width * 0.5 * (-(height / width) + 1);
        }

        pan.setTransform(x, y, pan.state.scale, 0);
      }}
    >
      <div
        style={{
          position: "relative",
          flex: 1,
          height: "100%",
        }}
      >
        <TransformWrapper
          initialPositionX={viewWidth / 2}
          initialPositionY={viewHeight / 2}
          initialScale={viewWidth / worldWidth}
          minScale={0.01}
          maxScale={7}
          ref={panRef}
          limitToBounds={false}
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
                    let x = 0;
                    let y = 0;

                    let width = viewWidth;
                    let height = viewHeight;

                    if (width > height) {
                      y = height * 0.5 * (-(width / height) + 1);
                    } else {
                      x = width * 0.5 * (-(height / width) + 1);
                    }

                    panRef.current?.setTransform(
                      x,
                      y,
                      viewWidth / worldWidth,
                      1000
                    );
                  }}
                >
                  <GpsFixed />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => panRef.current!.zoomIn(undefined, 500)}
                >
                  <Add />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => panRef.current!.zoomOut(undefined, 500)}
                >
                  <Remove />
                </IconButton>
              </Stack>
            </div>
            <TransformComponent
              wrapperStyle={{
                width: viewWidth,
                height: viewHeight,
              }}
              contentStyle={{
                width: worldWidth,
                height: worldHeight,
              }}
            >
              <div
                style={{
                  width: worldWidth,
                  height: worldHeight,
                }}
              ></div>
            </TransformComponent>
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
        </TransformWrapper>
      </div>
    </ReactResizeDetector>
  );
};
