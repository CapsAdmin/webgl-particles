import { Slider } from "@mui/material";
import { useState } from "react";

const lerp = (a: number, b: number, t: number) => {
  return a * (1 - t) + b * t;
};

const lerpBetweenPoints = (numbers: number[], t: number) => {
  // interpolate between variable numbers, t is 0 to 1 and output is the result
  // t = 0 would be the first index
  // t = 1 would be the last index

  let len = numbers.length;

  // find the index of the first number
  const index = Math.floor(t * len - 1);
  // find the index of the second number
  const index2 = Math.min(index + 1, len - 1);
  // find the t value between the two numbers
  const t2 = (t * len) % 1;
  // interpolate between the two numbers
  return lerp(numbers[index], numbers[index2], t2);
};

const valueToIndex = (value: number, steps: number[]) => {
  for (let step of steps) {
    if (value <= step) {
      const index = steps.indexOf(step);
      if (index == 0) {
        return 1;
      }
      const prevIdnex = index - 1;
      const max = steps[steps.length - 1];
      let a = steps[prevIdnex] / max;
      let b = step / max;
      return index + a / b;
    }
  }
  return 1;
};

export const ExponentialSlider = (props: {
  steps: Array<{ label: string; value: number }>;
  onChange: (num: number) => void;
  value: number;
}) => {
  const [val, setVal] = useState(
    valueToIndex(
      props.value,
      props.steps.map((s) => s.value)
    )
  );
  return (
    <Slider
      marks={props.steps.map(({ label }, i) => ({
        value: i + 1,
        label,
      }))}
      valueLabelDisplay="auto"
      min={1}
      max={props.steps.length}
      step={0.00001}
      value={val}
      valueLabelFormat={(f) => {
        let num = (f as number) / props.steps.length;
        return lerpBetweenPoints(
          props.steps.map(({ value }) => value),
          num
        ).toFixed(0);
      }}
      onChange={(event, f) => {
        let num = (f as number) / props.steps.length;
        let val = lerpBetweenPoints(
          props.steps.map(({ value }) => value),
          num
        );
        props.onChange(val);
        setVal(f as number);
      }}
    ></Slider>
  );
};
