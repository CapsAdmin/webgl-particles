import { useEffect, useState } from "react";
import { createSimulation } from "./Simulation";

const useSimulation = (canvas: HTMLCanvasElement | null) => {
  useEffect(() => {
    if (!canvas) return;
    return createSimulation(canvas);
  }, [canvas]);
};

function App() {
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(
    null
  );
  useSimulation(canvasElement);
  return (
    <canvas
      ref={(e) => {
        setCanvasElement(e);
      }}
      style={{
        backgroundColor: "black",
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
      }}
    />
  );
}

export default App;
