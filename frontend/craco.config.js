module.exports = {
  // PostCSS is configured via the standalone postcss.config.js file in this
  // directory. CRACO 7 + CRA 5 pick it up automatically. Declaring PostCSS
  // plugins here as well caused a conflict where the two configs merged
  // incorrectly and Tailwind CSS directives stopped processing, leaving the
  // site completely unstyled. The standalone postcss.config.js with the
  // object-syntax `{ tailwindcss: {}, autoprefixer: {} }` is the correct
  // approach for this toolchain.
  jest: {
    configure: {
      transformIgnorePatterns: [
        '/node_modules/(?!(axios)/)',
      ],
    },
  },
  webpack: {
    configure: (webpackConfig, { env }) => {
      // Suppress noisy source-map-loader warnings from node_modules.
      webpackConfig.ignoreWarnings = [
        function ignoreSourcemapsloaderWarnings(warning) {
          return (
            warning.module &&
            warning.module.resource.includes('node_modules') &&
            warning.details &&
            warning.details.includes('source-map-loader')
          );
        },
      ];

      // In production emit source maps so `yarn analyze` (source-map-explorer)
      // can inspect chunk sizes. CRA defaults to 'source-map' in prod but only
      // when GENERATE_SOURCEMAP=true; we keep that default and don't override it
      // here — users who want to skip source maps can still set
      // GENERATE_SOURCEMAP=false in their CI env.

      // Give the Three.js lazy chunk a stable, human-readable name so bundle
      // analysis reports are easy to read (chunk will appear as
      // "three-viewer.chunk.js" instead of a hash).
      if (env === 'production') {
        const originalEntry = webpackConfig.optimization && webpackConfig.optimization.splitChunks;
        if (originalEntry) {
          webpackConfig.optimization.splitChunks = {
            ...originalEntry,
            cacheGroups: {
              ...(originalEntry.cacheGroups || {}),
              // Isolate Three.js and its React bindings into a dedicated async
              // chunk.  This chunk is ONLY requested when the user clicks the
              // "3D" tab on a Product Detail Page (React.lazy boundary in
              // ProductDetailPage.js).
              threeVendor: {
                test: /[\\/]node_modules[\\/](three|@react-three)[\\/]/,
                name: 'three-viewer',
                chunks: 'async',
                priority: 30,
                reuseExistingChunk: true,
              },
            },
          };
        }
      }

      return webpackConfig;
    },
  },
}
