// Ambient declarations so TypeScript accepts side-effect imports of global
// stylesheets (the bundler handles the actual loading). CSS Modules
// (`*.module.css`) keep their own, more specific typings from Next.
declare module '*.css';
