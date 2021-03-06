/**
 * @fileOverview jquery-autocomplete, the jQuery Autocompleter
 * @author <a href="mailto:dylan@dyve.net">Dylan Verheul</a>
 * @version 2.4.4
 * @requires jQuery 1.6+
 * @license MIT | GPL | Apache 2.0, see LICENSE.txt
 * @see https://github.com/dyve/jquery-autocomplete
 */
(function($) {
    "use strict";

    /**
     * jQuery autocomplete plugin
     * @param {object|string} options
     * @returns (object} jQuery object
     */
    $.fn.autocomplete = function(options) {
        var url;
        if (arguments.length > 1) {
            url = options;
            options = arguments[1];
            options.url = url;
        } else if (typeof options === 'string') {
            url = options;
            options = { url: url };
        }
        var opts = $.extend({}, $.fn.autocomplete.defaults, options);
        return this.each(function() {
            var $this = $(this);
            $this.data('autocompleter', new $.Autocompleter(
                $this,
                $.meta ? $.extend({}, opts, $this.data()) : opts
            ));
        });
    };

    /**
     * Store default options
     * @type {object}
     */
    $.fn.autocomplete.defaults = {
        inputClass: 'acInput',
        loadingClass: 'acLoading',
        resultsClass: 'acResults',
        invertedClass: 'acInverted',
        selectClass: 'acSelect',
        queryParamName: 'q',
        extraParams: {},
        remoteDataType: false,
        lineSeparator: '\n',
        cellSeparator: '|',
        minChars: 2,
        maxItemsToShow: 10,
        delay: 400,
        useCache: true,
        maxCacheLength: 10,
        matchCase: false,
        matchInside: true,
        mustMatch: false,
        selectFirst: false,
        selectOnly: false,
        selectHover: false,
        showResult: null,
        preventDefaultReturn: 1,
        preventDefaultTab: 0,
        autoFill: false,
        filterResults: true,
        filter: true,
        sortResults: true,
        sortFunction: null,
        onItemSelect: null,
        onNoMatch: null,
        onFinish: null,
        matchStringConverter: null,
        beforeUseConverter: null,
        autoWidth: 'min-width',
        useDelimiter: false,
        delimiterChars: [ ',', '\r', '\n' ],
        selectionDelimiter: ", ",
        delimiterKeyCodes: [ 188 ], // Comma
        processData: null,
        onError: null,
        enabled: true,
        attachToParent: false,
    };

    /**
     * Sanitize result
     * @param {Object} result
     * @returns {Object} object with members value (String) and data (Object)
     * @private
     */
    var sanitizeResult = function(result) {
        var value, data;
        var type = typeof result;
        if (type === 'string') {
            value = result;
            data = {};
        } else if ($.isArray(result)) {
            value = result[0];
            data = result.slice(1);
        } else if (type === 'object') {
            value = result.value;
            data = result.data;
        }
        value = String(value);
        if (typeof data !== 'object') {
            data = {};
        }
        return {
            value: value,
            data: data
        };
    };

    /**
     * Sanitize integer
     * @param {mixed} value
     * @param {Object} options
     * @returns {Number} integer
     * @private
     */
    var sanitizeInteger = function(value, stdValue, options) {
        var num = parseInt(value, 10);
        options = options || {};
        if (isNaN(num) || (options.min && num < options.min)) {
            num = stdValue;
        }
        return num;
    };

    /**
     * Create partial url for a name/value pair
     */
    var makeUrlParam = function(name, value) {
        return [name, encodeURIComponent(value)].join('=');
    };

    /**
     * Build an url
     * @param {string} url Base url
     * @param {object} [params] Dictionary of parameters
     */
    var makeUrl = function(url, params) {
        var urlAppend = [];
        $.each(params, function(index, value) {
            urlAppend.push(makeUrlParam(index, value));
        });
        if (urlAppend.length) {
            url += url.indexOf('?') === -1 ? '?' : '&';
            url += urlAppend.join('&');
        }
        return url;
    };

    /**
     * Default sort filter
     * @param {object} a
     * @param {object} b
     * @param {boolean} matchCase
     * @returns {number}
     */
    var sortValueAlpha = function(a, b, matchCase) {
        a = String(a.value);
        b = String(b.value);
        if (!matchCase) {
            a = a.toLowerCase();
            b = b.toLowerCase();
        }
        if (a > b) {
            return 1;
        }
        if (a < b) {
            return -1;
        }
        return 0;
    };

    /**
     * Parse data received in text format
     * @param {string} text Plain text input
     * @param {string} lineSeparator String that separates lines
     * @param {string} cellSeparator String that separates cells
     * @returns {array} Array of autocomplete data objects
     */
    var plainTextParser = function(text, lineSeparator, cellSeparator) {
        var results = [];
        var i, j, data, line, value, lines;
        // Be nice, fix linebreaks before splitting on lineSeparator
        lines = String(text).replace('\r\n', '\n').split(lineSeparator);
        for (i = 0; i < lines.length; i++) {
            line = lines[i].split(cellSeparator);
            data = [];
            for (j = 0; j < line.length; j++) {
                data.push(decodeURIComponent(line[j]));
            }
            value = data.shift();
            results.push({ value: value, data: data });
        }
        return results;
    };

    /**
     * Autocompleter class
     * @param {object} $elem jQuery object with one input tag
     * @param {object} options Settings
     * @constructor
     */
    $.Autocompleter = function($elem, options) {

        /**
         * Assert parameters
         */
        if (!$elem || !($elem instanceof $) || $elem.length !== 1 ||
            !($elem.get(0).tagName.toUpperCase() !== 'INPUT' || $elem.get(0).tagName.toUpperCase() !== 'TEXTAREA')) {
            throw new Error('Invalid parameter for jquery.Autocompleter, jQuery object with one element with INPUT or TEXTAREA tag expected.');
        }

        /**
         * @constant Link to this instance
         * @type object
         * @private
         */
        var self = this;

        /**
         * @property {object} Options for this instance
         * @public
         */
        this.options = options;

        /**
         * @property object Cached data for this instance, ordered from most to least recently used
         * @private
         */
        this.cacheData_ = [];

        /**
         * @property {string} Class name to mark selected item
         * @private
         */
        this.selectClass_ = 'jquery-autocomplete-selected-item';

        /**
         * @property {number} Handler to activation timeout
         * @private
         */
        this.keyTimeout_ = null;

        /**
         * @property {number} Handler to finish timeout
         * @private
         */
        this.finishTimeout_ = null;

        /**
         * @property {number} Last key pressed in the input field (store for behavior)
         * @private
         */
        this.lastKeyPressed_ = null;

        /**
         * @property {string} Last value processed by the autocompleter
         * @private
         */
        this.lastProcessedValue_ = null;

        /**
         * @property {string} Last value selected by the user
         * @private
         */
        this.lastSelectedValue_ = null;

        /**
         * @property {boolean} Is this autocompleter active (showing results)?
         * @see showResults
         * @private
         */
        this.active_ = false;

        /**
         * @property {boolean} Is this autocompleter allowed to finish on blur?
         * @private
         */
        this.finishOnBlur_ = true;

        /**
         * Sanitize options
         */
        this.options.minChars = sanitizeInteger(this.options.minChars, $.fn.autocomplete.defaults.minChars, { min: 0 });
        this.options.maxItemsToShow = sanitizeInteger(this.options.maxItemsToShow, $.fn.autocomplete.defaults.maxItemsToShow, { min: 0 });
        this.options.maxCacheLength = sanitizeInteger(this.options.maxCacheLength, $.fn.autocomplete.defaults.maxCacheLength, { min: 1 });
        this.options.delay = sanitizeInteger(this.options.delay, $.fn.autocomplete.defaults.delay, { min: 0 });
        if (this.options.preventDefaultReturn != 2) {
            this.options.preventDefaultReturn = this.options.preventDefaultReturn ? 1 : 0;
        }
        if (this.options.preventDefaultTab != 2) {
            this.options.preventDefaultTab = this.options.preventDefaultTab ? 1 : 0;
        }

        /**
         * Init DOM elements repository
         */
        this.dom = {};

        /**
         * Store the input element we're attached to in the repository
         */
        this.dom.$elem = $elem;

        /**
         * Switch off the native autocomplete and add the input class
         */
        this.dom.$elem.attr('autocomplete', 'off').addClass(this.options.inputClass);

        /**
         * Create DOM element to hold results, and force absolute position
         */
        this.dom.$results = $('<div></div>').hide().addClass(this.options.resultsClass).css({
            position: 'absolute'
        });
        var parent = this.options.attachToParent
            ? this.dom.$elem.parent()
            : $('body');
        parent.append(this.dom.$results);

        /**
         * Attach keyboard monitoring to $elem
         */
        $elem.keydown(function(e) {
            self.lastKeyPressed_ = e.keyCode;

            // ctrl+space: activate the autocomplete window
            if (self.lastKeyPressed_ == 32 && e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
                self.activate();
                return;
            }

            // Ignore modifier keys.
            if (e.metaKey || e.ctrlKey || e.altKey)
                return;

            for (var i = 0; i < self.options.delimiterKeyCodes.length; i++) {
                if (self.lastKeyPressed_ === self.options.delimiterKeyCodes[i]) {
                    if (self.options.useDelimiter && self.active_) {
                        self.selectCurrent();
                    }
                    return;
                }
            }

            switch(self.lastKeyPressed_) {

                // ignore navigational & special keys
                case 35: // end
                case 36: // home
                case 16: // shift
                case 17: // ctrl
                case 18: // alt
                case 37: // left
                case 39: // right
                    break;

                case 38: // up
                    if (self.active_) {
                        e.preventDefault();
                        self.focusPrev();
                    } else {
                        break;
                    }
                    return false;

                case 40: // down
                    if (self.active_) {
                        e.preventDefault();
                        self.focusNext();
                    } else {
                        break;
                    }
                    return false;

                case 9: // tab
                    var $item = $('li.' + self.selectClass_, self.dom.$results);
                    if (self.active_) {
                        if ($item.length === 1) {
                            self.selectCurrent();
                            if (self.options.preventDefaultTab) {
                                e.preventDefault();
                                return false;
                            }
                        } else {
                            self.deactivate(true);
                        }
                    }
                    if (self.options.preventDefaultTab === 2) {
                        e.preventDefault();
                        return false;
                    }
                break;

                case 13: // return
                    var $item = $('li.' + self.selectClass_, self.dom.$results);
                    if (self.active_) {
                        if ($item.length === 1) {
                            self.selectCurrent();
                            if (self.options.preventDefaultReturn) {
                                e.preventDefault();
                                return false;
                            }
                        } else {
                            self.deactivate(true);
                        }
                    }
                    if (self.options.preventDefaultReturn === 2) {
                        e.preventDefault();
                        return false;
                    }
                break;

                case 27: // escape
                    if (self.active_) {
                        e.preventDefault();
                        self.deactivate(true);
                        return false;
                    }
                break;

                default:
                    self.activate();

            }
        });

        /**
         * Attach paste event listener because paste may occur much later then keydown or even without a keydown at all
         */
        $elem.on('paste', function() {
            self.activate();
        });

        /**
         * Finish on blur event
         * Use a timeout because instant blur gives race conditions
         */
        var onBlurFunction = function() {
            self.deactivate(true);
        }
        $elem.blur(function() {
            if (self.finishOnBlur_) {
                self.finishTimeout_ = setTimeout(onBlurFunction, 200);
            }
        });
        /**
         * Catch a race condition on form submit
         */
        $elem.parents('form').on('submit', onBlurFunction);

    };

    /**
     * Position output DOM elements
     * @private
     */
    $.Autocompleter.prototype.position = function() {
        var offset = this.options.attachToParent
            ? this.dom.$elem.position()
            : this.dom.$elem.offset();
        var height = this.dom.$results.outerHeight();
        var totalHeight = $(window).outerHeight() + $(window).scrollTop();
        var inputBottom = offset.top + this.dom.$elem.outerHeight();
        var bottomIfDown = inputBottom + height;
        // Set autocomplete results at the bottom of input
        var position = {top: inputBottom, left: offset.left};
        var acInverted = false;
        if (bottomIfDown > totalHeight) {
            // Try to set autocomplete results at the top of input
            var topIfUp = offset.top - height;
            if (topIfUp >= 0) {
                position.top = topIfUp;
                acInverted = true;
            }
        }
        this.dom.$results.css(position).toggleClass(this.options.invertedClass, acInverted);
    };

    /**
     * Read from cache
     * @private
     */
    $.Autocompleter.prototype.cacheRead = function(filter) {
        filter = String(filter);

        for (var i = 0; i < this.cacheData_.length; i++) {
            var cacheDataItem = this.cacheData_[i];
            if (cacheDataItem.filter !== filter) continue;
            this.cacheData_.splice(i, 1);
            this.cacheData_.unshift(cacheDataItem);
            return cacheDataItem.data;
        }

        return undefined;
    };

    /**
     * Write to cache
     * @private
     */
    $.Autocompleter.prototype.cacheWrite = function(filter, data) {
        if (!this.options.useCache) return false;
        filter = String(filter);

        for (var i = 0; i < this.cacheData_.length; i++) {
            var cacheDataItem = this.cacheData_[i];
            if (cacheDataItem.filter !== filter) continue;
            this.cacheData_.splice(i, 1);
            break;
        }
        this.cacheData_.unshift({ filter:filter, data:data });
        this.cacheData_.splice(this.options.maxCacheLength);

        return data;
    }

    /**
     * Flush cache
     * @public
     */
    $.Autocompleter.prototype.cacheFlush = function() {
        this.cacheData_ = [];
    };

    /**
     * Call hook
     * Note that all called hooks are passed the autocompleter object
     * @param {string} hook
     * @param data
     * @returns Result of called hook, false if hook is undefined
     */
    $.Autocompleter.prototype.callHook = function(hook, data) {
        var f = this.options[hook];
        if (f && $.isFunction(f)) {
            return f(data, this);
        }
        return false;
    };

    /**
     * Set timeout to activate autocompleter
     */
    $.Autocompleter.prototype.activate = function() {
        if (!this.options.enabled) return;
        var self = this;
        if (this.keyTimeout_) {
            clearTimeout(this.keyTimeout_);
        }
        this.keyTimeout_ = setTimeout(function() {
            self.activateNow();
        }, this.options.delay);
    };

    /**
     * Activate autocompleter immediately
     */
    $.Autocompleter.prototype.activateNow = function() {
        var value = this.beforeUseConverter(this.dom.$elem.val());
        if (value !== this.lastProcessedValue_ && value !== this.lastSelectedValue_) {
            this.fetchData(value);
        }
    };

    /**
     * Get autocomplete data for a given value
     * @param {string} value Value to base autocompletion on
     * @private
     */
    $.Autocompleter.prototype.fetchData = function(value) {
        var self = this;
        var processResults = function(results, filter) {
            if (self.options.processData) {
                results = self.options.processData(results);
            }
            self.showResults(self.filterResults(results, filter), filter);
        };
        this.lastProcessedValue_ = value;
        if (value.length < this.options.minChars) {
            processResults([], value);
        } else if (this.options.data) {
            processResults(this.options.data, value);
        } else {
            this.fetchRemoteData(value, function(remoteData) {
                processResults(remoteData, value);
            });
        }
    };

    /**
     * Get remote autocomplete data for a given value
     * @param {string} filter The filter to base remote data on
     * @param {function} callback The function to call after data retrieval
     * @private
     */
    $.Autocompleter.prototype.fetchRemoteData = function(filter, callback) {
        var data = this.cacheRead(filter);
        if (data) {
            callback(data);
        } else {
            var self = this;
            var dataType = self.options.remoteDataType === 'json' ? 'json' : 'text';
            var ajaxCallback = function(data) {
                var parsed = false;
                if (data !== false) {
                    parsed = self.parseRemoteData(data);
                    self.cacheWrite(filter, parsed);
                }
                self.dom.$elem.removeClass(self.options.loadingClass);
                callback(parsed);
            };
            this.dom.$elem.addClass(this.options.loadingClass);
            $.ajax({
                url: this.makeUrl(filter),
                success: ajaxCallback,
                error: function(jqXHR, textStatus, errorThrown) {
                    if($.isFunction(self.options.onError)) {
                        self.options.onError(jqXHR, textStatus, errorThrown);
                    } else {
                      ajaxCallback(false);
                    }
                },
                dataType: dataType
            });
        }
    };

    /**
     * Create or update an extra parameter for the remote request
     * @param {string} name Parameter name
     * @param {string} value Parameter value
     * @public
     */
    $.Autocompleter.prototype.setExtraParam = function(name, value) {
        var index = $.trim(String(name));
        if (index) {
            if (!this.options.extraParams) {
                this.options.extraParams = {};
            }
            if (this.options.extraParams[index] !== value) {
                this.options.extraParams[index] = value;
                this.cacheFlush();
            }
        }

        return this;
    };

    /**
     * Build the url for a remote request
     * If options.queryParamName === false, append query to url instead of using a GET parameter
     * @param {string} param The value parameter to pass to the backend
     * @returns {string} The finished url with parameters
     */
    $.Autocompleter.prototype.makeUrl = function(param) {
        var self = this;
        var url = this.options.url;
        var params = $.extend({}, this.options.extraParams);

        if (this.options.queryParamName === false) {
            url += encodeURIComponent(param);
        } else {
            params[this.options.queryParamName] = param;
        }

        return makeUrl(url, params);
    };

    /**
     * Parse data received from server
     * @param remoteData Data received from remote server
     * @returns {array} Parsed data
     */
    $.Autocompleter.prototype.parseRemoteData = function(remoteData) {
        var remoteDataType;
        var data = remoteData;
        if (this.options.remoteDataType === 'json') {
            remoteDataType = typeof(remoteData);
            switch (remoteDataType) {
                case 'object':
                    data = remoteData;
                    break;
                case 'string':
                    data = $.parseJSON(remoteData);
                    break;
                default:
                    throw new Error("Unexpected remote data type: " + remoteDataType);
            }
            return data;
        }
        return plainTextParser(data, this.options.lineSeparator, this.options.cellSeparator);
    };

    /**
     * Default filter for results
     * @param {Object} result
     * @param {String} filter
     * @returns {boolean} Include this result
     * @private
     */
    $.Autocompleter.prototype.defaultFilter = function(result, filter) {
        if (!result.value) {
            return false;
        }
        if (this.options.filterResults) {
            var pattern = this.matchStringConverter(filter);
            var testValue = this.matchStringConverter(result.value);
            if (!this.options.matchCase) {
                pattern = pattern.toLowerCase();
                testValue = testValue.toLowerCase();
            }
            var patternIndex = testValue.indexOf(pattern);
            if (this.options.matchInside) {
                return patternIndex > -1;
            } else {
                return patternIndex === 0;
            }
        }
        return true;
    };

    /**
     * Filter result
     * @param {Object} result
     * @param {String} filter
     * @returns {boolean} Include this result
     * @private
     */
    $.Autocompleter.prototype.filterResult = function(result, filter) {
        // No filter
        if (this.options.filter === false) {
            return true;
        }
        // Custom filter
        if ($.isFunction(this.options.filter)) {
            return this.options.filter(result, filter);
        }
        // Default filter
        return this.defaultFilter(result, filter);
    };

    /**
     * Filter results
     * @param results
     * @param filter
     */
    $.Autocompleter.prototype.filterResults = function(results, filter) {
        var filtered = [];
        var i, result;

        for (i = 0; i < results.length; i++) {
            result = sanitizeResult(results[i]);
            if (this.filterResult(result, filter)) {
                filtered.push(result);
            }
        }
        if (this.options.sortResults) {
            filtered = this.sortResults(filtered, filter);
        }
        if (this.options.maxItemsToShow > 0 && this.options.maxItemsToShow < filtered.length) {
            filtered.length = this.options.maxItemsToShow;
        }
        return filtered;
    };

    /**
     * Sort results
     * @param results
     * @param filter
     */
    $.Autocompleter.prototype.sortResults = function(results, filter) {
        var self = this;
        var sortFunction = this.options.sortFunction;
        if (!$.isFunction(sortFunction)) {
            sortFunction = function(a, b, f) {
                return sortValueAlpha(a, b, self.options.matchCase);
            };
        }
        results.sort(function(a, b) {
            return sortFunction(a, b, filter, self.options);
        });
        return results;
    };

    /**
     * Convert string before matching
     * @param s
     * @param a
     * @param b
     */
    $.Autocompleter.prototype.matchStringConverter = function(s, a, b) {
        var converter = this.options.matchStringConverter;
        if ($.isFunction(converter)) {
            s = converter(s, a, b);
        }
        return s;
    };

    /**
     * Convert string before use
     * @param {String} s
     */
    $.Autocompleter.prototype.beforeUseConverter = function(s) {
        s = this.getValue(s);
        var converter = this.options.beforeUseConverter;
        if ($.isFunction(converter)) {
            s = converter(s);
        }
        return s;
    };

    /**
     * Enable finish on blur event
     */
    $.Autocompleter.prototype.enableFinishOnBlur = function() {
        this.finishOnBlur_ = true;
    };

    /**
     * Disable finish on blur event
     */
    $.Autocompleter.prototype.disableFinishOnBlur = function() {
        this.finishOnBlur_ = false;
    };

    /**
     * Create a results item (LI element) from a result
     * @param result
     */
    $.Autocompleter.prototype.createItemFromResult = function(result) {
        var self = this;
        var $li = $('<li/>');
        $li.html(this.showResult(result.value, result.data));
        $li.data({value: result.value, data: result.data})
            .click(function() {
                self.selectItem($li);
            })
            .mousedown(self.disableFinishOnBlur)
            .mouseup(self.enableFinishOnBlur)
        ;
        return $li;
    };

    /**
     * Get all items from the results list
     * @param result
     */
    $.Autocompleter.prototype.getItems = function() {
        return $('>ul>li', this.dom.$results);
    };

    /**
     * Show all results
     * @param results
     * @param filter
     */
    $.Autocompleter.prototype.showResults = function(results, filter) {
        var numResults = results.length;
        var self = this;
        var $ul = $('<ul></ul>');
        var i, result, $li, autoWidth, first = false, $first = false;

        if (numResults) {
            for (i = 0; i < numResults; i++) {
                result = results[i];
                $li = this.createItemFromResult(result);
                $ul.append($li);
                if (first === false) {
                    first = String(result.value);
                    $first = $li;
                    $li.addClass(this.options.firstItemClass);
                }
                if (i === numResults - 1) {
                    $li.addClass(this.options.lastItemClass);
                }
            }

            this.dom.$results.html($ul).show();

            // Always recalculate position since window size or
            // input element location may have changed.
            this.position();
            if (this.options.autoWidth) {
                autoWidth = this.dom.$elem.outerWidth() - this.dom.$results.outerWidth() + this.dom.$results.width();
                this.dom.$results.css(this.options.autoWidth, autoWidth);
            }
            var ac = this;
            this.getItems().hover(
                function() {
                    if (!ac.options.selectHover) return;
                    self.focusItem(this);
                },
                function() { /* void */ }
            );
            if (this.autoFill(first, filter) || this.options.selectFirst || (this.options.selectOnly && numResults === 1)) {
                this.focusItem($first);
            }
            this.active_ = true;
        } else {
            this.hideResults();
            this.active_ = false;
        }
    };

    $.Autocompleter.prototype.showResult = function(value, data) {
        if ($.isFunction(this.options.showResult)) {
            return this.options.showResult(value, data);
        } else {
            return $('<p></p>').text(value).html();
        }
    };

    $.Autocompleter.prototype.autoFill = function(value, filter) {
        var lcValue, lcFilter, valueLength, filterLength;
        if (this.options.autoFill && this.lastKeyPressed_ !== 8) {
            lcValue = String(value).toLowerCase();
            lcFilter = String(filter).toLowerCase();
            valueLength = value.length;
            filterLength = filter.length;
            if (lcValue.substr(0, filterLength) === lcFilter) {
                var d = this.getDelimiterOffsets();
                var pad = d.start ? ' ' : ''; // if there is a preceding delimiter
                this.setValue( pad + value );
                var start = filterLength + d.start + pad.length;
                var end = valueLength + d.start + pad.length;
                this.selectRange(start, end);
                return true;
            }
        }
        return false;
    };

    $.Autocompleter.prototype.focusNext = function() {
        this.focusMove(+1);
    };

    $.Autocompleter.prototype.focusPrev = function() {
        this.focusMove(-1);
    };

    $.Autocompleter.prototype.focusMove = function(modifier) {
        var $items = this.getItems();
        modifier = sanitizeInteger(modifier, 0);
        if (modifier) {
            for (var i = 0; i < $items.length; i++) {
                if ($($items[i]).hasClass(this.selectClass_)) {
                    this.focusItem(i + modifier);
                    return;
                }
            }
        }
        this.focusItem(0);
    };

    $.Autocompleter.prototype.focusItem = function(item) {
        var $item, $items = this.getItems();
        if ($items.length) {
            $items.removeClass(this.selectClass_).removeClass(this.options.selectClass);
            if (typeof item === 'number') {
                if (item < 0) {
                    item = 0;
                } else if (item >= $items.length) {
                    item = $items.length - 1;
                }
                $item = $($items[item]);
            } else {
                $item = $(item);
            }
            if ($item) {
                $item.addClass(this.selectClass_).addClass(this.options.selectClass);

                // Scroll the item into view.

                var $view = this.dom.$results;

                // Bug: Border width calculation is wrong when top and bottom borders are different widths
                var borderTopWidth = ($view.outerHeight() - $view.innerHeight()) / 2;
                var scrollTop = $view.scrollTop();
                var itemTop = $item.offset().top - $view.offset().top + scrollTop - borderTopWidth;

                if (itemTop < scrollTop) {
                    scrollTop = itemTop;
                } else {
                    var viewHeight = $view.innerHeight();
                    var scrollBottom = scrollTop + viewHeight;
                    var itemHeight = $item.outerHeight();
                    var itemBottom = itemTop + itemHeight;
                    if (itemBottom >= scrollBottom) {
                        scrollTop = itemBottom - viewHeight;
                    }
                }

                $view.scrollTop(scrollTop);
            }
        }
    };

    $.Autocompleter.prototype.selectCurrent = function() {
        var $item = $('li.' + this.selectClass_, this.dom.$results);
        if ($item.length === 1) {
            this.selectItem($item);
        } else {
            this.deactivate(false);
        }
    };

    $.Autocompleter.prototype.selectItem = function($li) {
        var value = $li.data('value');
        var data = $li.data('data');
        var displayValue = this.displayValue(value, data);
        var processedDisplayValue = this.beforeUseConverter(displayValue);
        this.lastProcessedValue_ = processedDisplayValue;
        this.lastSelectedValue_ = processedDisplayValue;
        var d = this.getDelimiterOffsets();
        if ( this.options.useDelimiter ) {
            displayValue += this.options.selectionDelimiter;
        }
        this.setValue(displayValue);
        this.setCaret(d.start + displayValue.length);
        this.callHook('onItemSelect', { value: value, data: data });
        this.deactivate(true);
        this.dom.$elem.focus();
    };

    $.Autocompleter.prototype.displayValue = function(value, data) {
        if ($.isFunction(this.options.displayValue)) {
            return this.options.displayValue(value, data);
        }
        return value;
    };

    $.Autocompleter.prototype.hideResults = function() {
        this.dom.$results.hide();
    };

    $.Autocompleter.prototype.deactivate = function(finish) {
        if (this.finishTimeout_) {
            clearTimeout(this.finishTimeout_);
        }
        if (this.keyTimeout_) {
            clearTimeout(this.keyTimeout_);
        }
        if (finish) {
            if (this.lastProcessedValue_ !== this.lastSelectedValue_) {
                if (this.options.mustMatch) {
                    this.setValue('');
                }
                this.callHook('onNoMatch');
            }
            if (this.active_) {
                this.callHook('onFinish');
            }
            this.lastKeyPressed_ = null;
            this.lastProcessedValue_ = null;
            this.lastSelectedValue_ = null;
            this.active_ = false;
        }
        this.hideResults();
    };

    $.Autocompleter.prototype.selectRange = function(start, end) {
        var input = this.dom.$elem.get(0);
        if (input.setSelectionRange) {
            input.focus();
            input.setSelectionRange(start, end);
        } else if (input.createTextRange) {
            var range = input.createTextRange();
            range.collapse(true);
            range.moveEnd('character', end);
            range.moveStart('character', start);
            range.select();
        }
    };

    /**
     * Move caret to position
     * @param {Number} pos
     */
    $.Autocompleter.prototype.setCaret = function(pos) {
        this.selectRange(pos, pos);
    };

    /**
     * Get caret position
     */
    $.Autocompleter.prototype.getCaret = function() {
        var $elem = this.dom.$elem;
        var elem = $elem[0];
        var val, selection, range, start, end, stored_range;
        if (elem.createTextRange) { // IE
            selection = document.selection;
            if (elem.tagName.toLowerCase() != 'textarea') {
                val = $elem.val();
                range = selection.createRange().duplicate();
                range.moveEnd('character', val.length);
                if (range.text === '') {
                    start = val.length;
                } else {
                    start = val.lastIndexOf(range.text);
                }
                range = selection.createRange().duplicate();
                range.moveStart('character', -val.length);
                end = range.text.length;
            } else {
                range = selection.createRange();
                stored_range = range.duplicate();
                stored_range.moveToElementText(elem);
                stored_range.setEndPoint('EndToEnd', range);
                start = stored_range.text.length - range.text.length;
                end = start + range.text.length;
            }
        } else {
            start = $elem[0].selectionStart;
            end = $elem[0].selectionEnd;
        }
        return {
            start: start,
            end: end
        };
    };

    /**
     * Set the value that is currently being autocompleted
     * @param {String} value
     */
    $.Autocompleter.prototype.setValue = function(value) {
        if ( this.options.useDelimiter ) {
            // set the substring between the current delimiters
            var val = this.dom.$elem.val();
            var d = this.getDelimiterOffsets();
            var preVal = val.substring(0, d.start);
            var postVal = val.substring(d.end);
            value = preVal + value + postVal;
        }
        this.dom.$elem.val(value);
    };

    /**
     * Get the value currently being autocompleted
     * @param {String} value
     */
    $.Autocompleter.prototype.getValue = function(value) {
        if ( this.options.useDelimiter ) {
            var d = this.getDelimiterOffsets();
            return value.substring(d.start, d.end).trim();
        } else {
            return value;
        }
    };

    /**
     * Get the offsets of the value currently being autocompleted
     */
    $.Autocompleter.prototype.getDelimiterOffsets = function() {
        var val = this.dom.$elem.val();
        if ( this.options.useDelimiter ) {
            var caret = this.getCaret().start;
            for (var start = caret; start > 0; start--) {
                if ($.inArray(val.charAt(start - 1), this.options.delimiterChars) != -1)
                    break;
            }
            for (var end = caret; end < val.length; end++) {
                if ($.inArray(val.charAt(end), this.options.delimiterChars) != -1)
                    break;
            }
        } else {
            start = 0;
            end = val.length;
        }
        return {
            start: start,
            end: end
        };
    };

})(jQuery);
