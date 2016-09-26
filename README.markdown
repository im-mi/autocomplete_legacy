# Autocomplete (Legacy)

This is an extension for [Shimmie](https://github.com/shish/shimmie2/) with the goal of providing an updated autocomplete window more like the old one (not using [Tag-it!](http://aehlke.github.io/tag-it/)). It uses [jquery-autocomplete](https://github.com/dyve/jquery-autocomplete), like the old autocomplete, albeit with modifications.

It also has additional features:
- Show and sort tags by their usage counts
- Autocomplete negative tags
- Support multi-line text inputs
- Show more results in less area (make the window fixed-size and scrollable)
- Work with fixed-position input fields (attach directly to the parent element)
- Have better performance (limit the number of results, have a cache system that actually works)
- ... and more.

Note that many of these features can be adjusted in the board config or by modifying script.js, style.css, or main.php.

# Licence

All code is released under the [GNU GPL Version 2](http://www.gnu.org/licenses/gpl-2.0.html) unless mentioned otherwise.