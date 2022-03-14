import dts from "dts-bundle";

function DtsBundlePlugin(name, outputPath) {
    this.name = name;
    this.outputPath = outputPath;
}

DtsBundlePlugin.prototype.apply = function (compiler) {
    compiler.hooks.done.tap(
        {
            name: "DtsBundlePlugin"
        },
        () => {

            dts.bundle({
                name: this.name,
                main: "./build/index.d.ts",
                out: this.outputPath,
                removeSource: false,
                exclude: /index.d.ts/g,
                outputAsModuleFolder: true // to use npm in-package typings
            });
        }
    );
};

export default DtsBundlePlugin;
