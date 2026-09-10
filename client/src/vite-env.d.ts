/// <reference types="vite/client" />

declare const __BUILD_DATE__: string;

declare module "*.md?raw" {
  const content: string;
  export default content;
}
