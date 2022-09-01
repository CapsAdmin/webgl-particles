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
    <div style={{ display: "flex", flexDirection: "column" }}>
      <canvas
        ref={(e) => {
          setCanvasElement(e);
        }}
        style={{
          backgroundColor: "black",
        }}
      />
    </div>
  );
}

export default App;
