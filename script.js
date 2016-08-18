$(function(){
	$('[name=search],.autocomplete_tags').autocomplete(base_href + '/api/internal/tag_list/complete', {
		//extraParams: {limit: 10},
		queryParamName: 's',
		minChars: 1,
		delay: 0,
		useCache: true,
		maxCacheLength: 10,
		matchInside: false,
		selectFirst: false,
		selectOnly: false,
		preventDefaultReturn: 1,
		preventDefaultTab: 1,
		useDelimiter: true,
		delimiterChar : " ",
		delimiterKeyCode : 48
	});
});
