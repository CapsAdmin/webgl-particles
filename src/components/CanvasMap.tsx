import { Add, GpsFixed, Remove } from "@mui/icons-material";
import { ButtonGroup, IconButton, Stack, Typography } from "@mui/material";
import { RefObject, useEffect, useRef, useState } from "react";
import {
  ReactZoomPanPinchRef,
  TransformComponent,
  TransformWrapper,
} from "react-zoom-pan-pinch";
import ReactResizeDetector from "react-resize-detector";

export type MapView = { get: () => readonly [number, number, number, number] };

export const CanvasMap = (props: {
  canvasRef: RefObject<HTMLCanvasElement>;
  viewRef: RefObject<MapView>;
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

  return (
    <ReactResizeDetector
      handleWidth
      handleHeight
      onResize={(width, height) => {
        setViewWidth(width || 700);
        setViewHeight(height || 700);
        panRef.current?.centerView(undefined, 0);
      }}
    >
      <div style={{ position: "relative", flex: 1, height: "100vh" }}>
        <TransformWrapper
          initialPositionX={0}
          initialPositionY={0}
          initialScale={viewWidth / worldWidth}
          minScale={0.05}
          maxScale={5}
          limitToBounds={false}
        >
          {(pan) => {
            panRef.current = pan;
            // yikes
            (props.viewRef.current as any) = {
              get: () => {
                const scale = pan.state.scale;

                let x = -(pan.state.positionX - viewWidth / 2) / worldWidth;
                let y = -(pan.state.positionY - viewHeight / 2) / worldHeight;
                x = x * (1 / scale);
                y = y * (1 / scale);

                x = x * 2 - 1;
                y = y * 2 - 1;

                x = x * (worldWidth / viewWidth);
                y = y * (worldHeight / viewHeight);

                x = x * scale;
                y = y * scale;

                x = -x;

                return [x, y, scale, viewWidth / viewHeight] as const;
              },
            };

            return (
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
                      onClick={() => pan.resetTransform(1000)}
                    >
                      <GpsFixed />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => pan.zoomIn(undefined, 500)}
                    >
                      <Add />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => pan.zoomOut(undefined, 500)}
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
                      background:
                        "radial-gradient(circle, rgba(10,10,10,1) 0%, rgba(0,0,0,1) 50%) ",
                    }}
                  ></div>
                </TransformComponent>
                <canvas
                  width={renderWidth}
                  height={renderHeight}
                  ref={props.canvasRef}
                  style={{
                    objectFit: "contain",
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
            );
          }}
        </TransformWrapper>
      </div>
    </ReactResizeDetector>
  );
};
