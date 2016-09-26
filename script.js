$(function(){
$('[name=search], .autocomplete_tags, #edit_pool_tag').autocomplete(
	base_href + '/api/internal/autocomplete_legacy', {
	delay: 0,
	minChars: 1,
	matchInside: false,

	// The maximum number of results to request from the server.
	// The server may decide to provide more or less than this amount (see main.php).
	// Remove this line to use whatever limit the server decides.
	extraParams: { limit: 20 },

	// The maximum number of results to display, regardless of how many are provided by the server.
	maxItemsToShow: 300,

	// Determines how the autocomplete window is sized horizontally.
	// Possible values:
	//   width: Use a fixed-width
	//   min-width: Use a minimum width but no maximum width
	//   null: Determine width automatically
	autoWidth: "width",
	// Whether to attach the autocomplete window to the parent of the input field.
	// Enabling this allows the autocomplete window to follow fixed elements, but
	// may cause issues because it will inherit styles.
	attachToParent: true,

	selectFirst: true,
	preventDefaultReturn: 1,
	preventDefaultTab: 1,

	useDelimiter: true,
	delimiterChars: [
		" ", "\r", "\n", "\t",
		"\xA0" // Non-breaking space
	],
	delimiterKeyCodes: [ 48 ],
	selectionDelimiter: " ",
	sortResults: false, // The results are sorted by the server
	cellSeparator: ' ',
	queryParamName: 's',

	showResult: function(value, data) {
		return $("<div>")
			.append($("<span>", { text:value, class:"acTagName" }))
			.append($("<span>", { text:data, class:"acTagCount" }))
			.html();
	},
}).each(function() { (function(ac) {
	var searchQuery;

	var normalizeSearchQuery = function(s) {
		s = s ? s : "";
		s = s.trim();
		s = s && s[0] === '-' ? s.substr(1) : s;
		return s;
	}

	ac.options.beforeUseConverter = function(s) {
		//
		// Here, search queries are normalized before being submitted to the server.
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
})($(this).data("autocompleter"));});
});