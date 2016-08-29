$(function(){
	var isNegative = false;
	
	$('[name=search],.autocomplete_tags').autocomplete(base_href + '/api/internal/autocomplete_legacy', {
		//extraParams: {limit: 10},
		queryParamName: 's',
		minChars: 1,
		delay: 0,
		useCache: false,
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
		beforeUseConverter: function(s) {
			isNegative = s[0] === '-';
			return isNegative ? s.substr(1) : s;
		},
		processData: function(results) {
			if (isNegative) {
				for (var i = 0; i < results.length; i++)
					results[i].value = "-" + results[i].value;
			}
			return results;
		},
		matchStringConverter: function(s, a, b) {
			return s[0] === '-' ? s.substr(1) : s;
		}
	});
});
