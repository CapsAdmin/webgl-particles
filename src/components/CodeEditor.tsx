import Editor, { Monaco } from "@monaco-editor/react";
import { editor, MarkerSeverity } from "monaco-editor";
import { registerGLSL } from "../other/GLSLLanguage";
import ReactResizeDetector from "react-resize-detector";
import { useEffect, useRef } from "react";
export const CodeEditor = (props: {
  code: string;
  onChange: (code: string) => void;
  language: string;
  errors?: Array<{ line: number; column: number; message: string }>;
}) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco>();

  useEffect(() => {
    if (!props.errors) return;
    const editor = editorRef.current;
    if (!editor) return;

    const model = editor.getModel();
    if (!model) return;

    const monaco = monacoRef.current;
    if (!monaco) return;

    const markers = props.errors.map((error) => {
      return {
        severity: MarkerSeverity.Error,
        startLineNumber: error.line - 1,
        startColumn: error.column + 1,
        endLineNumber: error.line - 1,
        endColumn: error.column + 100,
        message: error.message,
      };
    });
    monaco.editor.setModelMarkers(model, "errors", markers);
  }, [props.errors]);

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
            monacoRef.current = monaco;
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
