import {postData} from '../handlebarData';
import posts from '../data/posts';
import merge from 'merge-stream';
import runSequence from 'run-sequence';
import Git from 'nodegit';

const git = Git.Repository.open('.');

function loadGitHistory(post) {
	let repo, walker, historyCommits = [];

	const compileHistory = function(commits) {
		let previousCommitSha;
		if (historyCommits.length > 0) {
			previousCommitSha = historyCommits[historyCommits.length - 1].commit.sha();
			if (commits.length === 1 && commits[0].commit.sha() === previousCommitSha) {
				return historyCommits;
			}
		}

		commits.forEach(function(entry) {
			historyCommits.push(entry);
		});

		previousCommitSha = historyCommits[historyCommits.length - 1].commit.sha();

		walker = repo.createRevWalk();
		walker.push(previousCommitSha);
		walker.sorting(Git.Revwalk.SORT.Time);

		return walker.fileHistoryWalk(post.file, 1000)
			.then(compileHistory);
	};

	return git.then(r => {
			repo = r;
			return repo.getMasterCommit();
		}).then(commit => {
			walker = repo.createRevWalk();
			walker.push(commit.sha());
			walker.sorting(Git.Revwalk.SORT.Time);

			return walker.fileHistoryWalk(post.file, 1000);
		}).then(compileHistory).then(history => {
			post.history = history.map(entry => {
				const commit = entry.commit;
				return {
					sha: commit.sha().substr(0, 6),
					sha_full: commit.sha(),
					message: commit.message(),
					date: commit.date()
				};
			});
			return post;
		});
}

export default function(gulp, paths, _, watch, pipelines) {

	const mtimes = {};

	/**
	 * If buildAll is true all posts will be build. Otherwise only posts where
	 * the actual markdown file has changed will be build.
	 */
	function buildPosts(buildAll) {
		const postPromises = posts().filter(post => {
			// Filter out posts that haven't been modified since last run of this task
			return buildAll || !mtimes[post.id] || !post.mtime.isSame(mtimes[post.id]);
		}).map(loadGitHistory);

		// Once all asynchronous loading tasks have finished...
		return Promise.all(postPromises)
				.then((posts) => {
					// Once all asynchronous tasks has been finished, start building the posts
					const streams = posts.map(post => {
						mtimes[post.id] = post.mtime;
						_.util.log(`Building output for post '${_.util.colors.cyan(post.id)}'...`);
						return gulp.src(paths.sources.index)
								.pipe(pipelines.handlebars(postData(post)))
								.pipe(_.rename(post.url + '/index.html'))
								.pipe(pipelines.html());
					});

					// If there is at least one stream, merge all streams together into one
					// convert this to a promise and return it (so gulp knows when this task finished)
					if (streams.length > 0) {
						return new Promise((resolve, reject) => {
							const mergedStream = merge(...streams)
							.pipe(gulp.dest(paths.build))
							.pipe(_.connect.reload())
							.on('end', resolve)
							.on('error', reject);
						});
					}

				});
	}

	gulp.task('posts', ['resources'], (done) => {
		runSequence('posts-no-deps', done);
	});

	// Task that will rebuild all posts (without any dependet tasks, like resources).
	gulp.task('posts-no-deps', buildPosts.bind(null, true));

	// Task that will rebuild only the posts where the content files has changed.
	gulp.task('posts-content-changed', buildPosts.bind(null, false))

	watch([
		paths.sources.index,
		paths.sources.templates,
	], ['posts-no-deps']);

	watch([
		paths.content.posts,
		paths.content.authors
	], ['posts-content-changed']);

	return {
		build: 'posts'
	};

}
