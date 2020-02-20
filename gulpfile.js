const fs = require('fs');
const nodeFtp = require('ftp');
const dotenv = require('dotenv');
const gulp = require('gulp');
const sass = require('gulp-sass');
const log = require('fancy-log');
const cleanCss = require('gulp-clean-css');
const notifier = require('node-notifier');
sass.compiler = require('node-sass');
dotenv.config();

const sassPaths = ['./node_modules'];

const srcPath = 'content/designs/';
const uploadPath = `/portals/${process.env.PORTAL}/${srcPath}`;

log('OPENING CONNECTION', process.env.HOST);
const c = new nodeFtp();
c.connect({
    host:        process.env.HOST,
    port:        3200,
    user:        process.env.USERNAME,
    password:    process.env.PASSWORD,
    secure:      'control',
    connTimeout: 20000,
});
c.on('greeting', function(msg) {
    log(msg);
});
c.on('ready', function() {
    c.list(function(err, list) {
        if (err) throw err;
        log('CONNECTION READY!');
        notifier.notify({
            title: 'CONNECTION READY!',
            message: 'Now you can change files'
        });
    });
});
// c.destroy();
gulp.task('default', gulp.parallel(watchCommomFiles, watchScss));
gulp.task('watchScss', watchScss);
gulp.task('watchCommomFiles', watchCommomFiles);


process.on("uncaughtException", function (err) {
    log('err uncaught Exception  : ', err);
});

function watchScss() {
    const watcherScss = gulp.watch([`${srcPath}**/*.scss`]);
    return watcherScss.on('change', obj => {
        return scss(obj);
    });
}

function watchCommomFiles() {
    const watcherCommom = gulp.watch([`${srcPath}**/*.html`, `${srcPath}**/*.js`, `${srcPath}**/*.css`]);
    return watcherCommom.on('change', obj => {
        return commomFiles(obj);
    });
}

function scss(obj) {
    log('SCSS COMPILING:', obj);
    return gulp
        .src(obj, {base: srcPath})
        .pipe(sass({includePaths: sassPaths}))
        .pipe(sass().on('error', sass.logError))
        .pipe(cleanCss({
            level: {
                2: {
                    all: true,
                }
            }
        }))
        .pipe(gulp.dest(srcPath));
}

function commomFiles(obj) {
    return gulp
        .src([obj, `!./**/*.scss`], {base: srcPath, allowEmpty: true})
        .pipe(gulp.dest(file => {
            uploadFile(file);
            return srcPath;
        }, {overwrite: false, override: false}))
}

function logFile (err, data) {
    /* If an error exists, show it, otherwise show the file */
    err ? Function("error","throw error")(err) : log(JSON.stringify(data.toString('utf8')).substr(0, 30) + ' . . .');
}

function uploadFile(file) {
    const filePath = file.history[file.history.length-1].replace(`${file.cwd}/${srcPath}`, '');
    const uploadTo = (uploadPath + filePath).replace(file.basename, '');

    fs.readFile(file.path, logFile);
    log('>>>>>> UPLOADING: ', file.basename, '>>>>>>', uploadTo);
    c.put(file.path, uploadTo + '/' + file.basename, err => {
        if (err) {
            log.error(`ERROR: ${err}`);
        } else {
            log('UPLOAD FINISHED!');
            notifier.notify({
                title: 'UPLOAD FINISHED!',
                message: file.basename
            });
        }
    });
    return file;
}