import path from "path";
import TerserPlugin from "terser-webpack-plugin";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  mode: "production",
  entry: {
    "react-express": [
      "./client/state.js",
      "./client/suspense.js",
      "./client/router.js",
      "./client/vdom.js",
      "./client/hooks.js",
      "./client/forms.js",
      "./client/context.js",
      "./client/lifecycle.js",
      "./client/hmr.js",
      "./client/reactive-state.js",
      "./client/store.js",
      "./client/error-boundary.js",
    ],
  },
  output: {
    filename: "[name].bundle.js",
    path: path.resolve(__dirname, "dist"),
    clean: true,
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          format: {
            comments: false,
          },
          compress: {
            drop_console: true,
            drop_debugger: true,
            pure_funcs: ["console.log"],
          },
          mangle: {
            reserved: ["ReactExpress"],
          },
        },
        extractComments: false,
      }),
    ],
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"],
          },
        },
      },
    ],
  },
};
