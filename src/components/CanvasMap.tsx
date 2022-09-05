import { Add, GpsFixed, Remove } from "@mui/icons-material";
import { ButtonGroup, IconButton, Stack, Typography } from "@mui/material";
import { RefObject, useEffect } from "react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";

export type MapView = { get: () => readonly [number, number, number] };

export const CanvasMap = (props: {
  canvasRef: RefObject<HTMLCanvasElement>;
  viewRef: RefObject<MapView>;
  error?: string;
  viewSize: number;
  worldScale: number;
}) => {
  const viewSize = props.viewSize;
  const worldSize = viewSize * props.worldScale;

  useEffect(() => {
    (props.viewRef.current as any) = null;
  }, [worldSize]);
  return (
    <div style={{ position: "relative", width: viewSize, height: viewSize }}>
      <TransformWrapper
        initialPositionX={0}
        initialPositionY={0}
        initialScale={viewSize / worldSize}
        minScale={0.05}
        maxScale={5}
        limitToBounds={false}
      >
        {(pan) => {
          if (!props.viewRef.current) {
            (props.viewRef.current as any) = {
              get: () => {
                const scale = pan.state.scale;

                let x = -(pan.state.positionX - viewSize / 2) / worldSize;
                let y = -(pan.state.positionY - viewSize / 2) / worldSize;
                x = x * (1 / scale);
                y = y * (1 / scale);

                x = x * 2 - 1;
                y = y * 2 - 1;

                x = x * (worldSize / viewSize);
                y = y * (worldSize / viewSize);

                x = x * scale;
                y = y * scale;

                x = -x;

                return [x, y, scale] as const;
              },
            };
          }

          return (
            <>
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
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
                  <ButtonGroup orientation="vertical" variant="contained">
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
                  </ButtonGroup>
                </Stack>
              </div>
              <TransformComponent
                wrapperStyle={{
                  width: viewSize,
                  height: viewSize,
                }}
                contentStyle={{
                  width: worldSize,
                  height: worldSize,
                }}
              >
                <div
                  style={{
                    width: worldSize,
                    height: worldSize,
                    background:
                      "radial-gradient(circle, rgba(10,10,10,1) 0%, rgba(0,0,0,1) 50%) ",
                  }}
                ></div>
              </TransformComponent>
              <canvas
                width={viewSize}
                height={viewSize}
                ref={props.canvasRef}
                style={{
                  pointerEvents: "none",
                  position: "absolute",
                  zIndex: 10,
                  top: 0,
                  left: 0,
                }}
              />
            </>
          );
        }}
      </TransformWrapper>

      <Typography
        align="left"
        style={{
          wordWrap: "break-word",
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          backgroundColor: "black",
          zIndex: 100,
        }}
        color="error"
      >
        {props.error}
      </Typography>
    </div>
  );
};
