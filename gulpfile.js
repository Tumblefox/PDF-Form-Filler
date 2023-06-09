const gulp = require('gulp');
const imagemin = require('gulp-imagemin');
var nunjucksRender = require('gulp-nunjucks-render');
var sass = require('gulp-sass')(require('sass'));

sass.compiler = require('node-sass');

gulp.task('compileTemplates', function() {
  return gulp.src([
    'src/template/**/*.njk',
    '!src/template/**/_*/',
    '!src/template/**/_*/**/*',
  ])
    .pipe(nunjucksRender({
      path: ['src/template/']
    }))
    .pipe(gulp.dest('./'));
});

gulp.task('compileStyles', function () {
  return gulp.src('src/style/**/*.scss')
    .pipe(sass().on('error', sass.logError))
    .pipe(gulp.dest('./css'));
});
gulp.task('copyStyles', function () {
  return gulp.src('src/style/**/*.css')
    .pipe(gulp.dest('./css'));
});

gulp.task('processScripts', function() {
  return gulp.src('src/script/*.js')
  .pipe(gulp.dest('./js'))
});

gulp.task('processImages', function() {
  return gulp.src('src/images/*')
    .pipe(imagemin())
    .pipe(gulp.dest('./img'))
});

gulp.task('copyImages', function() {
  return gulp.src('src/images/*')
    .pipe(gulp.dest('./img'))
});

gulp.task('default', gulp.series(
  [
    'compileTemplates',
    'compileStyles',
    'copyStyles',
    'processScripts',
    'copyImages'
  ]
));

gulp.task('watch', function() {
  gulp.watch('src/template/**/*.njk', gulp.series('compileTemplates'));
  gulp.watch('src/style/**/*.scss', gulp.series('compileStyles'));
  gulp.watch('src/style/**/*.css', gulp.series('copyStyles'));
  gulp.watch('src/script/**/*.js', gulp.series('processScripts'));
});
