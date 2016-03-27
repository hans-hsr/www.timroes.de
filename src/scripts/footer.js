const $ = require('jquery/dist/jquery.min');

$(() => {
	const footer = $('.postbottom');
	const fixedFooter = footer.clone(true);

	fixedFooter.addClass('fixed').appendTo(document.body);

	const $window = $(window);
	let lastScrollTop = null;
	let footerHidden = false;

	$window.on('load', () => {
		lastScrollTop = $window.scrollTop();
	});

	$window.on('scroll', function(ev) {
		const scrollTop = $window.scrollTop();
		const bottomOfWindow = scrollTop + $window.height();
		const footerBottom = footer.offset().top + footer.outerHeight();

		if (bottomOfWindow  >= footerBottom) {
			fixedFooter.addClass('detached');
		} else {
			fixedFooter.removeClass('detached');
		}

		if (lastScrollTop !== null) {
			if (lastScrollTop < scrollTop) {
				if (!footerHidden) {
					fixedFooter.addClass('hidden');
					footerHidden = true;
				}
			} else {
				if (footerHidden) {
					fixedFooter.removeClass('hidden');
					footerHidden = false;
				}
			}
		}

		lastScrollTop = scrollTop;

	});
});
