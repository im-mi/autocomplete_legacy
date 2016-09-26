<?php

class LegacyAutoCompleteTheme extends Themelet {
	public function build_legacy_autocomplete(Page $page) {
		global $config;
		$base_href = get_base_href();
		// TODO: AJAX test and fallback.

		$autocomplete_legacy_delay = $config->get_int("autocomplete_legacy_delay");
		$page->add_html_header("<meta name='autocomplete_legacy_delay' content='$autocomplete_legacy_delay'>");
		if ($config->get_bool("autocomplete_legacy_select_first"))
			$page->add_html_header("<meta name='autocomplete_legacy_select_first' content=''>");

		$page->add_html_header("<script src='$base_href/ext/autocomplete_legacy/lib/jquery.autocomplete.js' type='text/javascript'></script>");
		$page->add_html_header("<link rel='stylesheet' type='text/css' href='$base_href/ext/autocomplete_legacy/lib/jquery.autocomplete.css' />");
	}
}
