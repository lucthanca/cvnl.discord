interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY: string;
}

declare module '*.json' {
  const value: any;
  export default value;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}