import React, { useRef, useEffect } from "react";
import * as monaco from "monaco-editor";

// @ts-ignore
self.MonacoEnvironment = {
  getWorkerUrl: function (_moduleId: any, label: string) {
    if (label === "json") {
      return "./json.worker.bundle.js";
    }
    if (label === "css" || label === "scss" || label === "less") {
      return "./css.worker.bundle.js";
    }
    if (label === "html" || label === "handlebars" || label === "razor") {
      return "./html.worker.bundle.js";
    }
    if (label === "typescript" || label === "javascript") {
      return "./ts.worker.bundle.js";
    }
    return "./editor.worker.bundle.js";
  },
};

export const Editor = (props: {
  value: string;
  onChange: (val: string) => void;
}) => {
  const divEl = useRef<HTMLDivElement>(null);
  let editor: monaco.editor.IStandaloneCodeEditor;
  useEffect(() => {
    if (divEl.current) {
      editor = monaco.editor.create(divEl.current, {
        theme: "vs-dark",
        minimap: { enabled: false },
        value: props.value,
        language: "typescript",

        glyphMargin: false,
        folding: false,
        lineNumbers: "off",
        lineDecorationsWidth: 0,
        lineNumbersMinChars: 0,
      });

      editor.onDidChangeModelContent((e) => {
        props.onChange(editor.getValue());
      });
    }
    return () => {
      editor.dispose();
    };
  }, []);
  return (
    <div
      style={{ width: "100%", height: "100%", position: "relative" }}
      ref={divEl}
    ></div>
  );
};
