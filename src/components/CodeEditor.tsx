import Editor from "@monaco-editor/react";
import { registerGLSL } from "../other/GLSLLanguage";
export const CodeEditor = (props: {
  code: string;
  onChange: (code: string) => void;
  language: string;
}) => {
  return (
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
      onMount={(editor, monaco) => {
        registerGLSL(monaco);
      }}
      theme="vs-dark"
      height={1024}
      language={props.language}
      value={props.code}
      onChange={(str) => {
        if (str) {
          props.onChange(str);
        }
      }}
    />
  );
};
