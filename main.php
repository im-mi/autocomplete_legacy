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

	public function onInitExt(InitExtEvent $event) {
		global $config;
		$config->set_default_int("autocomplete_legacy_delay", 300);
		$config->set_default_int("autocomplete_legacy_max_results", 20);
		$config->set_default_bool("autocomplete_legacy_select_first", true);
	}

	public function onSetupBuilding(SetupBuildingEvent $event) {
		$sb = new SetupBlock("Autocomplete (Legacy)");
		$sb->add_int_option("autocomplete_legacy_delay", "Delay: ");
		$sb->add_label("ms");
		$sb->add_int_option("autocomplete_legacy_max_results", "<br/>Max Results: ");
		$sb->add_bool_option("autocomplete_legacy_select_first", "<br/>Select First: ");
		$event->panel->add_block($sb);
	}

	public function onPageRequest(PageRequestEvent $event) {
		global $page, $database, $config;

		if ($event->page_matches("api/internal/autocomplete_legacy")) {
			if (!isset($_GET["s"])) return;
			$search = $_GET["s"];

			$SQLarr = array("search" => $search . "%");

			$max_limit = $config->get_int("autocomplete_legacy_max_results");
			$limit = isset($_GET["limit"]) ? int_escape($_GET["limit"]) : $max_limit;
			$limit = clamp($limit, 0, $max_limit);

			$cache_key = "autocomplete-legacy-" . strtolower($search) . "-$limit";
			$res = $database->cache->get($cache_key);
			if ($res === false) {
				$res = $database->get_pairs($database->scoreql_to_sql("
					SELECT tag, count
					FROM tags
					WHERE SCORE_STRNORM(tag) LIKE SCORE_STRNORM(:search)
						AND count > 0
					ORDER BY count DESC
					LIMIT $limit
				"), $SQLarr);

				$text_res = "";
				foreach ($res as $key => $value)
					$text_res .= "$key $value\n";
				$res = $text_res;

				$database->cache->set($cache_key, $res, 600);
			}

			$page->set_mode("data");
			$page->set_type("text/plain");
			$page->set_data($res);
		}

		$this->theme->build_legacy_autocomplete($page);
	}
}