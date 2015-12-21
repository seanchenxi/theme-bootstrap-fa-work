String.prototype.trim = String.prototype.trim || function () {
        // Trim off any whitespace from the front and back
        return this.replace(/^\s+|\s+$/g, '');
    };

String.prototype.contains = String.prototype.contains || function () {
        return String.prototype.indexOf.apply(this, arguments) !== -1;
    };


if (!String.prototype.endsWith) {
    Object.defineProperty(String.prototype, 'endsWith', {
        value: function (searchString, position) {
            var subjectString = this.toString();
            if (position === undefined || position > subjectString.length) {
                position = subjectString.length;
            }
            position -= searchString.length;
            var lastIndex = subjectString.indexOf(searchString, position);
            return lastIndex !== -1 && lastIndex === position;
        }
    });
}

if (!String.prototype.startsWith) {
    Object.defineProperty(String.prototype, 'startsWith', {
        enumerable: false,
        configurable: false,
        writable: false,
        value: function (searchString, position) {
            position = position || 0;
            return this.lastIndexOf(searchString, position) === position;
        }
    });
}


var fs = require('fs'),

    writeFilePath = 'less/variables.gss.less',
    allKeys = {},

    walk = function (dir, done) {
        fs.readdir(dir, function (error, list) {
            if (error) {
                return done(error);
            }

            var i = 0;

            (function next() {
                var file = list[i++];

                if (!file) {
                    return done(null);
                }

                file = dir + '/' + file;

                fs.stat(file, function (error, stat) {

                    if (stat && stat.isDirectory()) {
                        walk(file, function (error) {
                            next();
                        });
                    } else {
                        // do stuff to file here
                        //console.log(file);
                        if(!file.contains("variables.less") &&
                            !file.contains("theme.less") && !file.contains("mixin")){
                            findVariable(file, function (){
                                //console.log(file + " - done.");
                            });
                        }
                        next();
                    }
                });
            })();
        });
    },

    readVariables = function (data) {

        var importPath = 'bootstrap/less/variables.less';

        try {
            fs.unlinkSync(writeFilePath);
        } catch (e) {
            console.log(e);
        }

        var lines = data.split('\n'),
            result = [];

        lines.forEach(function (line) {
            line = line.trim();
            if (line.startsWith("@")) {
                var lessVarName = line.split(":")[0];
                var gssVarName = lessVarName.substring(1).replace(/-/g, '_').toUpperCase();
                result.push("GSS_" + gssVarName + ": " + lessVarName + ";");
            } else if(line.startsWith("//")){
                var comment = line.replace(/\/\/(=|#)*/ig, "/**") + " **/";
                result.push(comment);
            } else{
                result.push(line);
            }
        });

        result.forEach(function (item, index) {
            if (index < 1) {
                fs.appendFileSync(writeFilePath, "@import \"" + importPath + "\";\n#GSS{\n");
            }

            fs.appendFileSync(writeFilePath, item + "\n");

            if (index + 1 >= result.length) {
                fs.appendFileSync(writeFilePath, "}");
            }
        });
    },

    findVariable = function (file, done) {
        fs.readFile(file, 'UTF-8', function (err, data) {
            if (err) throw err;

            var lines = data.split('\n'),
                result = {}, resultMap = {};
            lines.forEach(function (line, index) {
                line = line.trim();
                var start = line.indexOf("darken(@");
                if(start < 0){
                    start = line.indexOf("lighten(@");
                }
                if(start > -1){
                    var value = line.substring(start);
                    var name = value.replace(/\s+|\)|;/ig, "").replace(/\(@|,|\.|-/ig, "_").replace("%", "PCT").toUpperCase();
                    if(!allKeys[name]){
                        result[name] = value;
                        allKeys[name] = true;
                    }
                    resultMap[name] = resultMap[name] || [];
                    resultMap[name].push(index);
                }
            });

            var keys = Object.keys(result);
            keys.forEach(function (key, index) {
                if (index < 1) {
                    fs.appendFileSync(writeFilePath, "\n//"+file+"\n.GSS-EXTRA{\n");
                }

                if(result.hasOwnProperty(key)){
                    fs.appendFileSync(writeFilePath, "GSS_" + key + ": " + result[key] + " //"+file + ":" + resultMap[key]+"\n");
                }

                if (index + 1 >= keys.length) {
                    fs.appendFileSync(writeFilePath, "}");
                }
            });

            done();
        });
    };

fs.readFile('less/bootstrap/less/variables.less', 'UTF-8', function (err, data) {
    if (err) throw err;
    readVariables(data);
});

walk('bower_components/bootstrap/less/', function(){
    console.log('done');
});