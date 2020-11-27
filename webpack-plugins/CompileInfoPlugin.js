function CompileInfoPlugin(compilationName, callback) {
    this.callback = callback;
    this.compilationName = compilationName;
    this.name = "AfterCompilePlugin";
}

CompileInfoPlugin.prototype.apply = function(compiler) {
    compiler.hooks.done.tap(
        {
            name: this.name
        },
        (tap) => {
            this.callback();
            console.log(`${ this.compilationName }: done!`);
        }
    );

    compiler.hooks.watchRun.tap(
        {
            name: this.name
        },
        (tap) => {
            console.log(`${ this.compilationName }: building...`);
        }
    );
}

module.exports = CompileInfoPlugin;