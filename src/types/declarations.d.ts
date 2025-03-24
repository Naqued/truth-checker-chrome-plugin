// Ensure the chrome namespace is available
/// <reference types="chrome" />

// For CSS modules
declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

// For static assets
declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.svg' {
  const content: string;
  export default content;
} 