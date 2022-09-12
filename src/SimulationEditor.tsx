import {
  Card,
  Drawer,
  MenuItem,
  Select,
  Switch,
  Typography,
} from "@mui/material";
import { Stack } from "@mui/system";
import { useState } from "react";
import { CodeEditor } from "./components/CodeEditor";
import { ParticleStateTable } from "./components/ParticleStateTable";
import { defaultExample } from "./examples/default";
import { hunar432ParticleLifeExample } from "./examples/hunar4321-particle-life";
import { orbitsExample } from "./examples/orbits";
import { PseudoPhysics } from "./examples/pseduo-physics";
import { templateExample } from "./examples/template";
import { balancedMatch } from "./Simulation";

const key = "webgl-particles-code";

let initialConfig = defaultExample;
if (localStorage.getItem(key)) {
  try {
    const str = localStorage.getItem(key);
    if (typeof str == "string") {
      initialConfig = str;
    }
  } catch (err) {
    console.error(err);
  }
}

export const useSimulationCode = () => {
  const [code, setCode] = useState(initialConfig);

  const saveCode = (newCode: Partial<string>) => {
    setCode(newCode);
    localStorage.setItem(key, newCode);
  };

  return [code, saveCode] as const;
};

const presets = {
  default: defaultExample,
  template: templateExample,
  "pseudo physics": PseudoPhysics,
  orbits: orbitsExample,
  "hunar432's particle-life": hunar432ParticleLifeExample,
};

export const ConifgEditor = (props: {
  onClose: () => void;
  show: boolean;
  code: string;
  setCode: (code: string) => void;
  shaderError?: string;
  particleCount: number;
  setParticleStateFunction: (
    f?: (i: number, state: Float32Array[]) => void
  ) => void;
}) => {
  const [preset, setPreset] = useState("default");

  let shaderErrors: Array<{ line: number; column: number; message: string }> =
    [];
  if (props.shaderError) {
    const errorLines = props.shaderError.split("\n");
    const shaderLines = props.code.split("\n");

    for (let i = 0; i < errorLines.length; i++) {
      const errorLine = errorLines[i];

      if (errorLine.includes("^^^ ERROR: ")) {
        const message = errorLine.match(/ERROR: \d+:\d+: (.+)/)?.[1];
        const lineAbove = errorLines[i - 2].match(/\d+: (.+)/)?.[1];
        if (message && lineAbove) {
          for (let j = 0; j < shaderLines.length; j++) {
            const shaderLine = shaderLines[j];
            if (shaderLine == lineAbove) {
              shaderErrors.push({
                line: j + 2,
                column: 0,
                message,
              });
            }
          }
        } else {
          shaderErrors.push({
            line: 0,
            column: shaderLines[0].length,
            message: errorLine,
          });
        }
      }
    }
  }

  return (
    <>
      <Drawer anchor={"left"} open={props.show} onClose={props.onClose}>
        <Card
          variant="outlined"
          style={{
            flex: 1,
            display: "flex",
            width: "calc(min(100vw - 40px, 800px))",
          }}
        >
          <Stack flex={1} spacing={1}>
            <Select defaultValue={preset} label="presets">
              {Object.entries(presets).map(([key, value]) => (
                <MenuItem
                  onClick={() => {
                    setPreset(key);
                    props.setCode(value);
                  }}
                  key={key}
                  value={key}
                >
                  {key}
                </MenuItem>
              ))}
            </Select>

            <div style={{ height: "100%" }}>
              <CodeEditor
                errors={shaderErrors}
                language="glsl"
                code={props.code || ""}
                onChange={(code) => {
                  props.setCode(code);
                }}
              />
            </div>
          </Stack>
        </Card>
      </Drawer>
    </>
  );
};
