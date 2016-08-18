<?php

class LegacyAutoCompleteTheme extends Themelet {
	public function build_legacy_autocomplete(Page $page) {
		$base_href = get_base_href();
		// TODO: AJAX test and fallback.

		$page->add_html_header("<script src='$base_href/ext/autocomplete_legacy/lib/jquery.autocomplete.js' type='text/javascript'></script>");
		$page->add_html_header("<link rel='stylesheet' type='text/css' href='$base_href/ext/autocomplete_legacy/lib/jquery.autocomplete.css' />");
	}
}
