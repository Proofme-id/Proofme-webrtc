/* eslint-disable @typescript-eslint/no-var-requires */
const webpack = require("webpack");
const path = require("path");
const fs = require("fs-extra");
const DtsBundlePlugin = require("./webpack-plugins/DtsBundlePlugin");

module.exports = (env) => {
    env = env || {};
    let mode = env.MODE || "development";

    // Define shared module definition
    let module = {
        rules: [
            {
                test: /\.tsx?$/,
                use: "ts-loader",
                exclude: /node_modules/
            }
        ]
    };

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
    fs.readdirSync("node_modules")
        .filter(function (x) {
            return [".bin"].indexOf(x) === -1;
        })
        .forEach(function (mod) {
            externals[mod] = "commonjs " + mod;
        }
        );

    return [
        // Node
        {
            target: "node",
            entry: "./src/index.ts",
            module,
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
                path: path.resolve(__dirname, "dist/node")
            },
            externals
        },
        // Web
        {
            target: "web",
            entry: "./src/index.ts",
            module,
            resolve,
            mode,
            stats: "errors-only",
            devtool: mode == "development" ? "inline-source-map" : "source-map",
            plugins: [
                new DtsBundlePlugin("proofmeid-webrtc-web", "../dist/web/proofmeid-webrtc-web.d.ts"),
                new webpack.DefinePlugin({
                    "process.env": {
                        TARGET: "'node'"
                    }
                })
            ],
            output: {
                libraryTarget: "umd",
                library: "ProofmeId",
                filename: "proofmeid-webrtc-web.js",
                path: path.resolve(__dirname, "dist/web")
            },
            externals
        }
    ]
}
