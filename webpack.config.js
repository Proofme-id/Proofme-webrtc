import webpack from "webpack";
import DtsBundlePlugin from "./webpack-plugins/DtsBundlePlugin.js";
import path from "path";
import fs from "fs";
import { AngularWebpackPlugin } from "@ngtools/webpack";

export default (env) => {
    env = env || {};
    let mode = env.MODE || "development";

    // Define shared resolve definition
    let resolve = {
        extensions: [".tsx", ".ts", ".js"],
        fallback: { crypto: false }
    };

    // Make sure all node_modules are marked as external
    // for node builds. This is needed because otherwise
    // they would be included in the single file output.
    // This greatly confuses node libraries...
    let externals = {};
    fs.readdirSync("node_modules").filter((x) => {
        return [".bin"].indexOf(x) === -1;
    }).forEach((mod) => {
        externals[mod] = "commonjs " + mod;
    });
    externals["@koush/wrtc"] = "commonjs @koush/wrtc";

    return [
        // Node
        {
            target: "node",
            entry: "./src/index.ts",
            module: {
                rules: [
                    {
                        test: /\.tsx?$/,
                        use: "ts-loader",
                        exclude: /node_modules/
                    },
                ]
            },
            resolve,
            mode,
            stats: "errors-only",
            devtool: mode == "development" ? "inline-source-map" : "source-map",
            plugins: [
                new DtsBundlePlugin("proofmeid-webrtc-node", "../dist/node/proofmeid-webrtc-node.d.ts"),
                new webpack.DefinePlugin({
                    "process.env": {
                        TARGET: "'node'"
                    }
                })
            ],
            output: {
                libraryTarget: "umd",
                library: "ProofmeId",
                filename: "proofmeid-webrtc-node.js",
                path: path.resolve("dist/node")
            },
            externals
        },
        // Web
        {
            target: "web",
            entry: "./src/index.ts",
            module: {
                rules: [
                    {
                        test: /\.[jt]sx?$/,
                        exclude: /node_modules/,
                        use: [
                            { loader: "babel-loader" },
                            {
                                loader: "@ngtools/webpack",
                                options: {
                                    directTemplateLoading: false,
                                }
                            },
                            { loader: "@angular-devkit/build-optimizer/webpack-loader" }
                        ]
                    }
                ]
            },
            resolve,
            mode,
            stats: "errors-only",
            devtool: mode == "development" ? "inline-source-map" : "source-map",
            plugins: [
                new DtsBundlePlugin("proofmeid-webrtc-web", "../dist/web/proofmeid-webrtc-web.d.ts"),
                new AngularWebpackPlugin({
                    tsconfig: "tsconfig.json",
                    jitMode: false,
                }),
            ],
            output: {
                libraryTarget: "umd",
                library: "ProofmeId",
                filename: "proofmeid-webrtc-web.js",
                path: path.resolve("dist/web")
            },
            externals
        }
    ]
}