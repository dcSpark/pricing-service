import typescriptIsTransformer from "typescript-is/lib/transform-inline/transformer";
import path from "path";

const {
  NODE_ENV = "production",
} = process.env;

module.exports = {
  entry: "./src/index.ts",
  //watch: NODE_ENV === "production",
  mode: NODE_ENV,
  target: "node",
  output: {
    path: path.resolve(__dirname, "build"),
    filename: "index.js"
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  module: {
      rules: [
        {
          use: {
            loader: "ts-loader",
            options: {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              getCustomTransformers: (program: any) => ({
                before: [typescriptIsTransformer(program)],
              }),
            },
          },
          exclude: /node_modules/,
        }
      ]
    }
};