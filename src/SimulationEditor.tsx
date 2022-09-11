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

  let shaderErrors = [];
  if (props.shaderError) {
    let startOffset = 0;
    let type;

    if (props.shaderError.includes("//CUSTOM_COMPUTE_CODE_START")) {
      type = "COMPUTE";
    } else if (props.shaderError.includes("//CUSTOM_RENDER_CODE_START")) {
      type = "RENDER";
    } else {
      throw new Error("Unknown shader error");
    }

    {
      const [start, stop] = balancedMatch(props.code, type);
      const otherCodeStart = props.code.substring(0, start);
      const otherCodeStop = props.code.substring(stop, props.code.length);

      for (const line of (otherCodeStart + otherCodeStop).split("\n")) {
        if (line.includes(type)) {
          break;
        }
        startOffset--;
      }
    }

    const lines = props.shaderError.split("\n");
    for (const line of lines) {
      if (line.includes("//CUSTOM_" + type + "_CODE_START")) {
        break;
      }
      startOffset++;
    }
    const done = new Set<string>();
    for (const line of lines) {
      if (line.includes("ERROR: ")) {
        const match = line.match(/ERROR: (\d+):(\d+):(.+)/);
        if (match) {
          const colNumber = parseInt(match[1], 10);
          const lineNumber = parseInt(match[2], 10);
          const message = match[3];
          if (
            colNumber >= 0 &&
            lineNumber >= 0 &&
            message &&
            !done.has(message)
          ) {
            shaderErrors.push({
              line: lineNumber - startOffset,
              column: colNumber,
              message,
            });

            done.add(message);
          }
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
