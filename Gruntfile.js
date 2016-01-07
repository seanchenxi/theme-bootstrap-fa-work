module.exports = function (grunt) {

    require('load-grunt-tasks')(grunt);

    var fs = require('fs');
    var path = require('path');
    var configBridge = grunt.file.readJSON('./bower_components/bootstrap/grunt/configBridge.json', { encoding: 'utf8' });

    Object.keys(configBridge.paths).forEach(function (key) {
        configBridge.paths[key].forEach(function (val, i, arr) {
            arr[i] = path.join('./bower_components/bootstrap/docs/assets', val);
        });
    });

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        clean:{
            dist: ['.work', 'dist'],
            bower: ['bower_components']
        },

        symlink: {
            options: {
                overwrite: true
            },
            runtime: {
                src: 'node_modules',
                dest: '.work/bootstrap/node_modules'
            }
        },

        copy: {
            work: {
                files: [
                    {
                        expand: true,
                        cwd:'bower_components/',
                        src: [
                            'font-awesome/less/**/*',
                            'bootstrap/{,grunt,less,js}/**/{,*}.{bower*,less,js,json,yml,jshintrc,css*}'
                        ],
                        dest: '.work/'
                    },
                    {
                        expand: true,
                        cwd:'less/',
                        src: ['font-awesome/**/*', 'bootstrap/**/*'],
                        dest: '.work/'
                    },
                    {
                        expand: true,
                        cwd:'less/',
                        src: ['extra-theme.less'],
                        dest: '.work/bootstrap/less/'
                    }
                ]
            },
            bootstrapDist:{
                files:[
                    {expand: true, cwd:'.work/bootstrap/dist/', src:'css/bootstrap.*', dest: 'dist/'}
                ]
            },
            fonts: {
                files:[
                    {expand: true, cwd:'bower_components/font-awesome/', src:'fonts/*', dest: 'dist/'}
                ]
            }
        },

        less: {
            fa: {
                options: {
                    strictMath: true,
                    sourceMap: true,
                    outputSourceFiles: true,
                    sourceMapURL: 'font-awesome.css.map',
                    sourceMapFilename: 'dist/css/font-awesome.css.map'
                },
                src: '.work/font-awesome/less/font-awesome.less',
                dest: 'dist/css/font-awesome.css'
            },
            gss: {
                options: {
                    outputSourceFiles: true
                },
                src: 'less/variables.gss.less',
                dest: 'dist/css/variables.gss.css'
            }
        },

        autoprefixer: {
            options: {
                browsers: configBridge.config.autoprefixerBrowsers
            },
            core: {
                options: {
                    map: true
                },
                src: 'dist/css/<%= pkg.name %>.css'
            },
            fa: {
                options: {
                    map: true
                },
                src: 'dist/css/font-awesome.css'
            }
        },

        csslint: {
            options: {
                csslintrc: 'bower_components/bootstrap/less/.csslintrc'
            },
            dist: [
                'dist/css/font-awesome.css'
            ]
        },

        cssmin: {
            options: {
                compatibility: 'ie8',
                keepSpecialComments: '*',
                sourceMap: true,
                advanced: false
            },
            core: {
                src: 'dist/css/<%= pkg.name %>.css',
                dest: 'dist/css/<%= pkg.name %>.min.css'
            },
            fa: {
                src: 'dist/css/font-awesome.css',
                dest: 'dist/css/font-awesome.min.css'
            }
        },

        csscomb: {
            options: {
                config: 'bower_components/bootstrap/less/.csscomb.json'
            },
            fa: {
                expand: true,
                cwd: 'dist/css/',
                src: ['font-awesome.css'],
                dest: 'dist/css/'
            }
        }
    });

    grunt.registerTask('to-gss-vars', function () {
        var targetFile = "dist/css/variables.gss";
        var done = this.async();
        try{
            fs.unlinkSync(targetFile);
        }catch (e){
        }
        fs.readFile("dist/css/variables.gss.css", 'UTF-8', function (err, data) {
            if (err) throw err;
            var lines = data.split('\n'), result = [];
            lines.forEach(function (line) {
                line = line.replace(/^\s+|\s+$/g, '');
                if (line.length > 0 && line.indexOf("GSS_") > -1) {
                    var gssDef = line.replace("GSS_", "@def ");
                    if(line.indexOf("#") > 0 || line.indexOf("rgb") > 0
                        || line.indexOf("COLOR") > -1){
                        gssDef = gssDef.replace("@def ", "@def C_");
                    }else if(line.indexOf("px;") > 0 || line.indexOf("em;") > 0
                        || line.indexOf("%;") > 0 || line.indexOf("pt;") > 0){
                        gssDef = gssDef.replace("@def ", "@def S_");
                    }
                    result.push(gssDef);
                }else if(line.indexOf("/**") > -1){
                    result.push(line);
                }
            });

            var maxLength = 0;
            result.forEach(function (item) {
                if(item.indexOf("/**") < 0){
                    maxLength = Math.max(maxLength, item.split(":")[0].length);
                }
            });

            result.forEach(function (item, index) {
                if(index < 1){
                    fs.appendFileSync(targetFile, "@provide 'theme-variables';\n");
                }
                if(item.indexOf("/**") < 0){
                    var nbSpace = maxLength - item.split(":")[0].length;
                    var space = [" "];
                    for(var i = 0; i < nbSpace; i++){
                        space.push(" ");
                    }
                    fs.appendFileSync(targetFile, item.replace(":", space.join("")) + "\n");
                }else{
                    fs.appendFileSync(targetFile, item + "\n");
                }

            });

            done();
        });
    });

    grunt.registerTask('grunt-bootstrap', function () {
        var done = this.async();
        grunt.util.spawn({
            grunt: true,
            args: ['clean:dist', 'dist-css'],
            opts: {
                cwd: '.work/bootstrap'
            }
        }, function (err, result, code) {
            console.log(result.stdout);
            done();
        });
    });

    grunt.registerTask('bower-install', 'install the backend and frontend dependencies', function() {
        var exec = require('child_process').exec;
        var cb = this.async();
        exec('bower install', {cwd: './'}, function(err, stdout, stderr) {
            console.log(stdout);
            cb();
        });
    });

    grunt.registerTask('gss', ['less:gss', 'to-gss-vars']);

    grunt.registerTask('install', ['clean:bower', 'bower-install']);

    grunt.registerTask('compile-bootstrap', ['symlink:runtime', 'grunt-bootstrap', 'copy:bootstrapDist']);

    grunt.registerTask('compile-fa', ['less:fa', 'autoprefixer:fa', 'csscomb:fa', 'cssmin:fa', 'copy:fonts']);

    grunt.registerTask('dist', ['copy:work', 'compile-bootstrap', 'compile-fa']);

    grunt.registerTask('default', ['clean:dist', 'dist', 'gss']);


};