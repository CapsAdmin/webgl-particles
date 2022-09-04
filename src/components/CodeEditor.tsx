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
        folding: false,
        lineNumbers: "off",
        lineDecorationsWidth: 0,
        lineNumbersMinChars: 0,
      }}
      onMount={(editor, monaco) => {
        registerGLSL(monaco);
      }}
      theme="vs-dark"
      height={256}
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
