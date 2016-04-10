import {indexData} from '../handlebarData';

export default function(gulp, paths, _, watch, pipelines) {

	gulp.task('index', ['resources'], () => {
		return gulp.src(paths.sources.index)
			.pipe(pipelines.handlebars(indexData()))
			.pipe(pipelines.html())
			.pipe(_.rename({
				extname: '.html'
			}))
			.pipe(gulp.dest(paths.build))
			.pipe(_.connect.reload());
	});

	watch([
		paths.content.posts,
		paths.sources.index,
		paths.sources.templates
	], ['index']);

	return {
		build: 'index'
	};
}
