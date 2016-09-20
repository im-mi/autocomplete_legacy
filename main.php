<?php

/*
 * Name: Autocomplete (Legacy)
 * Author: im-mi <im.mi.mail.mi@gmail.com>
 * License: GPLv2
 * Description: Adds the legacy autocomplete to search & tagging.
 * Documentation:
 *   Based on the original autocomplete system and the tag_edit
 *   extension by various authors (<a href="mailto:webmaster@shishnet.org">Shish</a>,
 *   <a href="mailto:dakutree@codeanimu.net">Daku</a>, etc.).
 */
class LegacyAutoComplete extends Extension {
	public function get_priority() { return 30; } // before Home

	public function onPageRequest(PageRequestEvent $event) {
		global $page, $database;

		if ($event->page_matches("api/internal/autocomplete_legacy")) {
			if (!isset($_GET["s"])) return;

			$SQLarr = array("search" => $_GET["s"] . "%");

			$max_limit = 20;
			$limit = isset($_GET["limit"]) ? int_escape($_GET["limit"]) : $max_limit;
			$limit = clamp($limit, 0, $max_limit);

			$limitSQL = "LIMIT $limit";

			$cache_key = "autocomplete-" . strtolower($_GET["s"]) . "-$limit";
			$res = null;
			$database->cache->get($cache_key);
			if (!$res) {
				$res = $database->get_pairs($database->scoreql_to_sql("
					SELECT tag, count
					FROM tags
					WHERE SCORE_STRNORM(tag) LIKE SCORE_STRNORM(:search)
						AND count > 0
					ORDER BY count DESC
					$limitSQL
				"), $SQLarr);
				$database->cache->set($cache_key, $res, 600);
			}

			$page->set_mode("data");
			$page->set_type("text/plain");
			$res = array_map(
				function($value, $key) {
					return $key . ' ' . $value;
				},
				array_values($res),
				array_keys($res));
			$page->set_data(implode("\n", $res));
		}

		$this->theme->build_legacy_autocomplete($page);
	}
}