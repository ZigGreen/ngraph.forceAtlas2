var gulp = require('gulp')
    , browserify = require('browserify')
    , exorcist = require('exorcist')
    , path = require('path')
    , source = require("vinyl-source-stream")
    , uglify = require('gulp-uglify')
    , watchify = require('watchify')
    , gutil = require('gulp-util')
    ;


var publicDir = './dist'
    , workDir = './'
    , bundleName = 'index.js'
    , bundleMainPath = [workDir, bundleName].join('/')
    , mapfileName = bundleName + '.map'
    , mapfilePath = path.join(publicDir, mapfileName)
    , sourceRoot = "file://" + __dirname
    ;


function handleError() {
    return function (err) {
        gutil.log(gutil.colors.red(err));
    };
}


gulp.task('browserify', function () {

    return browserify({debug: false, standalone: 'app'})
        .add(bundleMainPath)
        .bundle()
        .pipe(source(bundleName))
        .pipe(gulp.dest(publicDir));

});
gulp.task('uglify', ['browserify'], function () {
    return gulp.src(path.join(publicDir, bundleName))
        .pipe(uglify())
        .pipe(gulp.dest(publicDir))
});

gulp.task('watch_browserify', function () {
    var bundler, rebundle;
    bundler = browserify(bundleMainPath, {
        basedir: __dirname,
        debug: true,
        cache: {}, // required for watchify
        packageCache: {}, // required for watchify
        fullPaths: true // required to be true only for watchify
    });

    bundler = watchify(bundler);



    rebundle = function () {
        //noinspection JSUnresolvedFunction
        var stream = bundler.bundle();
        stream.on('error', handleError('Browserify'));
        gutil.log(gutil.colors.cyan("start bundle"));
        var result = stream
            .pipe(exorcist(mapfilePath, mapfileName, sourceRoot))
            .pipe(source(bundleName))
            .pipe(gulp.dest(publicDir));

        result.once('end', function () {
            gutil.log(gutil.colors.cyan("complete bundle"));
        });
    };

    bundler.on('update', rebundle);
    return rebundle();

});


gulp.task('default', ['uglify']);