<?php
/*
 * Name: Autocomplete (Legacy)
 * Author: im-mi <im.mi.mail.mi@gmail.com>
 * Description: Adds the legacy autocomplete to search & tagging.
 */

class LegacyAutoComplete extends Extension {
	public function get_priority() {return 30;} // before Home

	public function onPageRequest(PageRequestEvent $event) {
		global $page;
		$this->theme->build_legacy_autocomplete($page);
	}
}
