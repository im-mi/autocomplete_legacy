$(function(){
var autocompleteLegacyDelay = parseInt($("meta[name=autocomplete_legacy_delay]").attr("content"), 10);
if (isNaN(autocompleteLegacyDelay))
	autocompleteLegacyDelay = 300;
var autocompleteLegacySelectFirst = Boolean($("meta[name=autocomplete_legacy_select_first]").length);

$("[name=search], .autocomplete_tags, #edit_pool_tag").autocomplete(
	base_href + "/api/internal/autocomplete_legacy", {
	delay: autocompleteLegacyDelay,
	minChars: 1,
	matchInside: false,

	// The maximum number of results to request from the server.
	// The server may decide to provide more or less than this amount (see main.php).
	// Remove this line to use whatever limit the server decides.
	// extraParams: { limit: 20 },

	// The maximum number of results to display, regardless of how many are provided by the server.
	maxItemsToShow: 1000,

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

	selectFirst: autocompleteLegacySelectFirst,
	preventDefaultReturn: 1,
	preventDefaultTab: 1,

	useDelimiter: true,
	delimiterChars: [
		" ", "\r", "\n", "\t",
		"\xA0" // Non-breaking space
	],
	delimiterKeyCodes: [],
	selectionDelimiter: " ",
	sortResults: false, // The results are sorted by the server
	cellSeparator: " ",
	queryParamName: "s",

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
		s = s && s.charAt(0) === "-" ? s.substr(1) : s;
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
		var filterResult = ac.defaultFilter(result, filter);
		// Adjust the result to match the sign of the original search query.
		if (searchQuery && searchQuery.charAt(0) === "-")
			result.value = "-" + result.value;
		return filterResult;
	};
})($(this).data("autocompleter"));});
});