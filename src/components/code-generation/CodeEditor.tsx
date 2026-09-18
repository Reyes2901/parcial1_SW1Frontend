import MonacoEditor from '@monaco-editor/react';

interface CodeEditorProps {
  path: string;
  value: string;
  language: string;
  onChange: (value: string | undefined) => void;
  readOnly?: boolean;
}

export function CodeEditor({ value, language, onChange, readOnly }: CodeEditorProps) {
  return (
    <MonacoEditor
      value={value}
      language={language}
      onChange={onChange}
      options={{
        fontSize: 13,
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        readOnly,
        theme: 'vs',
        padding: { top: 12, bottom: 12 },
      }}
    />
  );
}
