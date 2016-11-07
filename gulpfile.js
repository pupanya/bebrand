'use strict';

const browserSync = require('browser-sync').create();
const debug = require('debug');
const del = require('del');
const gulp = require('gulp');
const spritesmith = require('gulp.spritesmith');
const sourcemaps = require('gulp-sourcemaps');
const stylus = require('gulp-stylus');
const path = require('path');
const ignore = require('gulp-ignore');
const gulpIf = require('gulp-if');
const merge = require('merge-stream');
const newer = require('gulp-newer');
const notify = require('gulp-notify');
const combiner = require('stream-combiner2').obj;
const resolver = require('stylus').resolver;
const imagemin = require('gulp-imagemin');

const isDevelopment = !process.env.NODE_ENV || process.env.NIDE_ENV == 'development';

function lazyRequireTask(taskName, path, options){
    options = options || {};
    options.taskName = taskName;
    gulp.task(taskName, function(callback){
        let task = require(path).call(this, options);
        return task(callback);
    });
}

// CLEAN
gulp.task('clean:public', function(){
    return del('public');
});

gulp.task('clean:tmp', function(){
    return del('tmp');
});

gulp.task('clean', gulp.parallel('clean:public', 'clean:tmp'));

// ASSETS
gulp.task('assets:html', function(){
    return gulp.src('frontend/assets/*.{html,htm}', {since: gulp.lastRun('assets:html')})
        .pipe(newer('public'))
        .pipe(gulp.dest('public'));
});

gulp.task('assets', gulp.parallel('assets:html'));

// STYLES
gulp.task('styles:backgroundimages', function(){
    return gulp.src('frontend/styles/images/bg_*.{png,jpeg,jpg,svg}')
        // .pipe(debug())
         .pipe(imagemin())
        // .pipe(debug())
        .pipe(gulp.dest('public/styles/images'))
});

gulp.task('styles:sprite', function() {
    let spriteData = gulp.src(['frontend/assets/img/*.*', '!frontend/assets/img/bg_*.*'])
        //.pipe(ignore.exclude('bg-*'))
        .pipe(spritesmith({
            imgName: 'sprite.png',
            cssName: 'sprite.styl',
            cssFormat: 'stylus',
            algorithm: 'binary-tree',
            cssTemplate: 'stylus.template.mustache',
            cssVarMap: function(sprite) {
                sprite.name = 's-' + sprite.name
            }
        }));
    let imgStream = spriteData.img
        .pipe(gulp.dest('public/styles'));
    let cssStream = spriteData.css
        .pipe(gulp.dest('tmp'));
    return merge(imgStream, cssStream);
});

gulp.task('styles:styl', function(){
    return combiner(
        gulp.src('frontend/styles/index.styl'),
        gulpIf(isDevelopment, sourcemaps.init()),
        stylus({
            import: process.cwd() + '\\tmp\\sprite',
            define: {
                url: resolver()
            }
        }),    
        gulpIf(isDevelopment, sourcemaps.write()),
        gulp.dest('public/styles')
    ).on('error', notify.onError());
});

gulp.task('styles', gulp.parallel(gulp.series('styles:sprite', 'styles:styl'), 'styles:backgroundimages'));

// WATCH
gulp.task('watch', function(){
    gulp.watch(['frontend/styles/*.styl','tmp/*.styl'], gulp.series('styles:styl'));
    gulp.watch('frontend/assets/*.{html,htm}', gulp.series('assets:html'));
})

// BUILD
gulp.task('build', gulp.series('clean', gulp.parallel('assets', 'styles')));

gulp.task('serve', function(){
    browserSync.init({
        server: 'public'
    });
    browserSync.watch('public/**/*.*')
        .on('change', browserSync.reload);
});

gulp.task('dev', gulp.series('build', gulp.parallel('watch', 'serve')));