import { Map } from "leaflet";
import "leaflet/dist/leaflet.css";
import { MutableRefObject, RefObject, useRef } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Typography } from "@mui/material";

export type MapView = { get: () => readonly [number, number, number] };

export const CanvasMap = (props: {
  canvasRef: RefObject<HTMLCanvasElement>;
  viewRef: RefObject<MapView>;
  error?: string;
}) => {
  const mapRef = useRef<Map | null>(null);
  console.log(props.error, "!!!!");
  return (
    <div style={{ position: "relative" }}>
      <MapContainer
        attributionControl={false}
        ref={(map) => {
          if (!map) return;

          props.viewRef.current = {
            get: () => {
              const div = (map as any)._proxy as HTMLDivElement;
              if (!div) return [0, 0, 1] as const;

              const matrix = window.getComputedStyle(div).transform;
              if (!matrix) return [0, 0, 1] as const;
              const match = matrix.match(/matrix\((.*?),/);
              if (!match) return [0, 0, 1] as const;
              const val = parseFloat(match[1]);

              let mapZoom = (val * 1) / 131072; // map.getZoom()

              let zoomScale = 0.2;
              let zoom = Math.pow(mapZoom, zoomScale);
              let x =
                -map.getCenter().lng * 800 * Math.pow(zoom, 1 / zoomScale);
              let y =
                -map.getCenter().lat * 800 * Math.pow(zoom, 1 / zoomScale);

              return [x, y, zoom] as const;
            },
          };
        }}
        center={[0, 0]}
        zoom={112}
        scrollWheelZoom={true}
        style={{ height: 512, width: 512 }}
      >
        <TileLayer
          zIndex={-1}
          opacity={0}
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <canvas
          width={512}
          height={512}
          ref={props.canvasRef}
          style={{
            backgroundColor: "black",
            position: "absolute",
            zIndex: 10,
          }}
        />
      </MapContainer>
      <Typography
        align="left"
        style={{
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
