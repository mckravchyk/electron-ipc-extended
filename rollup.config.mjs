/* eslint-disable import/no-extraneous-dependencies, import/no-default-export */

// Using rollup-plugin-typescript2 rather than the official one as there are problems
// with generating type declarations
// https://github.com/rollup/plugins/issues/105
// https://github.com/rollup/plugins/issues/247
//
// import typescript from '@rollup/plugin-typescript'
import typescript from 'rollup-plugin-typescript2';

import pkg from './package.json' assert { type: 'json' };

// rollup-plugin-banner does not work anymore and the default banner will do since there are no
// minified builds.
const createBanner = (lines) => `/**\n${lines.map((l) => ` * ${l}\n`).join('')} */`;

const cYear = 2023;

const banner = createBanner([
  `${pkg.name} v${pkg.version}`,
  `Copyright (c) ${cYear} ${pkg.author}`,
  `License: ${pkg.license}`,
]);

const defaults = {
  input: 'src/index.ts',
  external: [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
  ],
};

export default [
  // Common JS build
  {
    ...defaults,
    output: {
      file: pkg.main,
      format: 'cjs',
      banner,
    },
    plugins: [
      typescript(),
    ],
  },

  // ESM build + type declarations
  {
    ...defaults,
    output: {
      file: pkg.module,
      format: 'es',
      banner,
    },
    plugins: [
      typescript({
        tsconfig: 'tsconfig.json',
        tsconfigOverride: {
          compilerOptions: {
            declaration: true,
            declarationDir: './dist/types',
          },
          exclude: ['./test', './examples'],
        },
        useTsconfigDeclarationDir: true,
      }),
    ],
  },
];
