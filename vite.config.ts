import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as {
  version: string;
};

// Above this size (minified), the build fails: keeps the card light for HACS users.
const MAX_BUNDLE_BYTES = 60_000;

// Bundled dependencies whose licenses (BSD) require the notice in binary redistributions.
const BUNDLED_LICENSES = ['lit'];

const licenseBanner = [
  '/*! Formula One Summary Card v' + pkg.version + ' | MIT License | (c) HappyManuDev',
  ' * https://github.com/HappyManuDev/Formula-one-summary-card',
  ...BUNDLED_LICENSES.flatMap((name) => [
    ' *',
    ` * Includes ${name}:`,
    ...readFileSync(new URL(`./node_modules/${name}/LICENSE`, import.meta.url), 'utf-8')
      .trim()
      .split(/\r?\n/)
      .map((line) => ` * ${line}`.trimEnd()),
  ]),
  ' */',
].join('\n');

export default defineConfig({
  define: {
    __VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    target: 'es2020',
    minify: 'terser',
    sourcemap: false,
    lib: {
      entry: 'src/formula-one-summary-card.ts',
      formats: ['es'],
      fileName: () => 'formula-one-summary-card.js',
    },
    rollupOptions: {
      output: {
        // HACS installs a single file: never split into chunks.
        codeSplitting: false,
        banner: licenseBanner,
      },
    },
  },
  plugins: [
    {
      name: 'bundle-size-budget',
      generateBundle(_options, bundle) {
        for (const file of Object.values(bundle)) {
          if (file.type === 'chunk' && file.code.length > MAX_BUNDLE_BYTES) {
            this.error(
              `${file.fileName} is ${file.code.length} bytes, budget is ${MAX_BUNDLE_BYTES} bytes`,
            );
          }
        }
      },
    },
  ],
});
