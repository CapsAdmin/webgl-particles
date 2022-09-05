import Editor from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { registerGLSL } from "../other/GLSLLanguage";
import ReactResizeDetector from "react-resize-detector";
import { useRef } from "react";
export const CodeEditor = (props: {
  code: string;
  onChange: (code: string) => void;
  language: string;
}) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  return (
    <ReactResizeDetector
      handleWidth
      handleHeight
      onResize={(width, height) => {
        const editor = editorRef.current;
        if (editor) {
          editor.layout({ width: width || 512, height: height || 512 });
        }
      }}
    >
      <div
        style={{
          margin: -12,
          height: "calc(100% + 24px)",
          display: "flex",
        }}
      >
        <Editor
          options={{
            minimap: {
              enabled: false,
            },
            glyphMargin: false,
            folding: true,
            lineNumbers: "on",
            lineDecorationsWidth: 0,
            lineNumbersMinChars: 3,
          }}
          beforeMount={(monaco) => {
            monaco.editor.defineTheme("myCustomTheme", {
              base: "vs-dark",
              inherit: true,
              colors: {
                "editor.background": "#ff000000",
              },
              rules: [],
            });
          }}
          onMount={(editor, monaco) => {
            editorRef.current = editor;
            registerGLSL(monaco);
          }}
          theme="myCustomTheme"
          language={props.language}
          value={props.code}
          onChange={(str) => {
            if (str) {
              props.onChange(str);
            }
          }}
        />
      </div>
    </ReactResizeDetector>
  );
};
