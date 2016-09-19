$(function(){
	var normalizeSearchQuery = function(s) {
		s = s ? s : "";
		s = s.trim();
		s = s && s[0] === '-' ? s.substr(1) : s;
		return s;
	}

	$('[name=search],.autocomplete_tags').autocomplete(base_href + '/api/internal/autocomplete_legacy', {
		//extraParams: {limit: 10},
		queryParamName: 's',
		minChars: 1,
		delay: 0,
		useCache: true,
		maxCacheLength: 10,
		matchInside: false,
		selectFirst: true,
		selectOnly: false,
		preventDefaultReturn: 1,
		preventDefaultTab: 1,
		useDelimiter: true,
		delimiterChar: " ",
		delimiterKeyCode: 48,
		sortResults: false,
		cellSeparator: ' ',
		showResult: function(value, data) {
			var root = $('<div></div>');
			$('<span></span>', { text: value, class:"acTagName" }).appendTo(root);
			$('<span></span>', { text: data, class:"acTagCount" }).appendTo(root);
			return root.html();
		},
	}).each(function() {
		var ac = $(this).data("autocompleter");

		var searchQuery;

		ac.options.beforeUseConverter = function(s) {
			//
			// Here search queries are normalized before being submitted to the server.
			// Additionally, the original search query is recorded for later use.
			//
			searchQuery = s;
			return normalizeSearchQuery(s);
		};

		ac.options.filter = function(result, filter) {
			if (!result.value) return false;
			if (!ac.options.filterResults) return true;

			var pattern = normalizeSearchQuery(filter);
			var testValue = normalizeSearchQuery(result.value);
			if (!ac.options.matchCase) {
				pattern = pattern.toLowerCase();
				testValue = testValue.toLowerCase();
			}
			var patternIndex = testValue.indexOf(pattern);

			// Adjust the result to match the sign of the original search query.
			if (searchQuery && searchQuery.trim()[0] === '-')
				result.value = "-" + result.value;

			if (ac.options.matchInside) {
				return patternIndex > -1;
			} else {
				return patternIndex === 0;
			}
		};
	});
});