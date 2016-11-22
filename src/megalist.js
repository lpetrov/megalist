(function(scope, $) {
    /**
     * Internal/private helper method for doing 'assert's.
     *
     * @param val {boolean}
     * @param msg {String}
     */
    var assert = function(val, msg) {
        if (!val) {
            throw new Error(msg ? msg : "Assertion Failed.");
        }
    };


    var MEGALIST_DEFAULTS = {
        /**
         * Static, fixed width of the item when rendered (incl margin, padding, etc)
         */
        'itemWidth': false,

        /**
         * Static, fixed height of the item when rendered (incl margin, padding, etc)
         */
        'itemHeight': false,

        /**
         * Oredered list of item IDs
         */
        'items': false,

        /**
         * A Callback function, that receives 1 argument - itemID (string/int) and should return a DOM Object, HTML
         * String or a jQuery object that is the actual DOM node to be rendered/appended to the list.
         */
        'itemRenderFunction': false,

        /**
         * Optional jQuery/CSS selector of an object to be used for appending. Must be a child of the container.
         * Mainly used for hacking around table's markup and required DOM Tree where, the container would be marked as
         * scrollable area, but the tbody would be used for appending the items.
         */
        'appendTo': false,

        /**
         * Pass any PerfectScrollbar options here.
         */
        perfectScrollOptions: {},
    };

    /**
     * Helper variable, that create unique IDs by auto incrementing for every new MegaList that gets initialised.
     *
     * @type {number}
     */
    var listId = 0;

    /**
     * MegaList provides everything needed for efficient rendering of thousands of DOM nodes in a scrollable
     * (overflown) list or a grid.
     *
     * @param listContainer {String|jQuery|DOMNode} the container, which would be used to append list items
     * @param options {Object} see MEGALIST_DEFAULTS for defaults and available options.
     * @constructor
     */
    var MegaList = function (listContainer, options) {
        assert(options.itemRenderFunction, 'itemRenderFunction was not provided.');

        this.listId = listId++;

        this.$listContainer = $(listContainer);
        this.$listContainer.addClass("megaList");
        this.listContainer = this.$listContainer[0];

        var items = options.items;
        delete options.items;
        if (!items) {
            items = [];
        }
        this.items = items;

        this.options = $.extend({}, MEGALIST_DEFAULTS, options);

        if (this.options.appendTo) {
            this.$content = $(this.options.appendTo, this.$listContainer);
            this.container = this.$content[0];
        }

        this._wasRendered = false;
        this._isUserScroll = false;

        /**
         * A dynamic cache to be used as a width/height/numeric calculations
         *
         * @type {{}}
         * @private
         */
        this._calculated = {};

        /**
         * A map of IDs which are currently rendered (cached as a map, so that we can reduce access to the DOM)
         *
         * @type {Array}
         * @private
         */
        this._currentlyRendered = {};
    };

    /**
     * Internal method used for generating unique (per MegaList) instance namespace string. (not prepended with "."!)
     *
     * @returns {string}
     * @private
     */
    MegaList.prototype._generateEventNamespace = function() {
        return "megalist" + this.listId;
    };

    /**
     * Internal method that would be called when the MegaList renders to the DOM UI and is responsible for binding
     * the DOM events.
     *
     * @private
     */
    MegaList.prototype._bindEvents = function () {
        var self = this;
        $(window).bind("resize." + this._generateEventNamespace(), function() {
            self.resized();
        });

        $(document).bind('ps-scroll-y.ps' + this._generateEventNamespace(), function(e) {
            if (self._isUserScroll === true && self.$listContainer.is(e.target)) {
                self.trigger('onUserScroll', e);
                self._onScroll(e);
            }
        });
    };

    /**
     * Called when .destroy is triggered. Should unbind any DOM events added by this MegaList instance.
     *
     * @private
     */
    MegaList.prototype._unbindEvents = function () {
        $(window).unbind("resize." + this._generateEventNamespace());
        $(document).unbind('ps-scroll-y.ps' + this._generateEventNamespace());
    };

    /**
     * Add an item to the list.
     *
     * @param itemId {String}
     */
    MegaList.prototype.add = function (itemId) {
        this.batchAdd([itemId]);
    };

    /**
     * Remove and item from the list.
     *
     * @param itemId {String}
     */
    MegaList.prototype.remove = function (itemId) {
        this.batchRemove([itemId]);
    };

    /**
     * Optimised adding of entries, less DOM updates
     *
     * @param itemIdsArray {Array} Array of item IDs (Strings)
     */
    MegaList.prototype.batchAdd = function (itemIdsArray) {
        var self = this;
        itemIdsArray.forEach(function(itemId) {
            self.items.push(itemId);
        });

        if (this._wasRendered) {
            this._contentUpdated();
            this._applyDOMChanges();
        }
    };

    /**
     * Optimised removing of entries, less DOM updates
     *
     * @param itemIdsArray {Array} Array of item IDs (Strings)
     */
    MegaList.prototype.batchRemove = function (itemIdsArray) {
        var self = this;
        var requiresRerender = false;

        itemIdsArray.forEach(function(itemId) {
            var itemIndex = self.items.indexOf(itemId);
            if (itemIndex > -1) {
                if (self.isRendered(itemId)) {
                    requiresRerender = true;
                    self._currentlyRendered[itemId].remove();
                    delete self._currentlyRendered[itemId];

                }
                self.items.splice(itemIndex, 1);
            }
        });

        if (this._wasRendered) {
            this._contentUpdated();
        }

        if (requiresRerender) {
            this._repositionRenderedItems();
            this._applyDOMChanges();

        }
    };

    /**
     * Checks if an item exists in the list.
     *
     * @param itemId {String}
     * @returns {boolean}
     */
    MegaList.prototype.has = function (itemId) {
        return this.items.indexOf(itemId) > -1;
    };

    /**
     * Checks if an item is currently rendered.
     *
     * @param itemId {String}
     * @returns {boolean}
     */
    MegaList.prototype.isRendered = function (itemId) {
        return this._currentlyRendered[itemId] ? true : false;
    };

    /**
     * Should be called when the list container is resized.
     * This method would be automatically called on window resize, so no need to do that in the implementing code.
     */
    MegaList.prototype.resized = function () {
        this._calculated = {};
        this._contentUpdated(true);
        this._applyDOMChanges();

        // destroy PS if ALL items are visible
        if (
            this._calculated['visibleFirstItemNum'] === 0 &&
            this._calculated['visibleLastItemNum'] === this.items.length &&
            this._calculated['contentWidth'] <= this._calculated['scrollWidth'] &&
            this._calculated['contentHeight'] <= this._calculated['scrollHeight']
        ) {
            if (this._scrollIsInitialized === true) {
                this._scrollIsInitialized = false;
                Ps.destroy(this.listContainer);
            }
        }
        else {
            // not all items are visible after a resize, should we init PS?
            if (this._scrollIsInitialized === false) {
                Ps.initialize(this.listContainer, this.options.perfectScrollOptions);
                this._scrollIsInitialized = true;
            }
        }
        // all done, trigger a resize!
        $(this).trigger('resize');
    };


    /**
     * Same as jQuery(megaListInstance).bind('eventName', cb);
     *
     * @param eventName {String}
     * @param cb {Function}
     */
    MegaList.prototype.bind = function (eventName, cb) {
        $(this).bind(eventName, cb);
    };

    /**
     * Same as jQuery(megaListInstance).unbind('eventName', cb) and then .bind('eventName', cb);
     *
     * @param eventName {String}
     * @param cb {Function}
     */
    MegaList.prototype.rebind = function (eventName, cb) {
        if (eventName.indexOf(".") === -1) {
            console.error("MegaList.rebind called with eventName that does not have a namespace, which is an" +
                "anti-pattern");
            return;
        }
        $(this).unbind(eventName);
        $(this).bind(eventName, cb);
    };

    /**
     * Same as jQuery(megaListInstance).unbind('eventName', cb);
     * @param eventName {String}
     * @param cb {Function}
     */
    MegaList.prototype.unbind = function (eventName, cb) {
        $(this).unbind(eventName, cb);
    };

    /**
     * Same as jQuery(megaListInstance).trigger(...);
     */
    MegaList.prototype.trigger = function () {
        $(this).trigger.apply($(this), arguments);
    };


    /**
     * Force update the scrollable area.
     */
    MegaList.prototype.scrollUpdate = function() {
        if (this._scrollIsInitialized) {
            Ps.update(this.listContainer);
        }
    };

    /**
     * Scroll the scrollable area to a specific `posTop` or `posLeft`.
     * Passing undefined to `posTop` can be used to only scroll the area via `posLeft`
     *
     * @param posTop {Number|undefined}
     * @param posLeft {Number|undefined}
     */
    MegaList.prototype.scrollTo = function(posTop, posLeft) {
        this._calculated = {};

        if (posTop) {
            this.listContainer.scrollTop = posTop;
        }
        if (posLeft) {
            this.listContainer.scrollLeft = posLeft;
        }
        this.scrollUpdate();
        this._repositionRenderedItems();
        this._applyDOMChanges();
    };

    /**
     * Returns the current top position of the scrollable area
     *
     * @returns {number|*|Number|undefined}
     */
    MegaList.prototype.getScrollTop = function() {
        return this.listContainer.scrollTop;
    };

    /**
     * Returns the current left position of the scrollable area
     *
     * @returns {Number}
     */
    MegaList.prototype.getScrollLeft = function() {
        return this.listContainer.scrollLeft;
    };

    /**
     * Returns the scroll's height
     *
     * @returns {Number}
     */
    MegaList.prototype.getScrollHeight = function() {
        this._recalculate();
        return this._calculated['scrollHeight'];
    };

    /**
     * Returns the scroll's width
     *
     * @returns {Number}
     */
    MegaList.prototype.getScrollWidth = function() {
        this._recalculate();
        return this._calculated['scrollWidth'];
    };

    /**
     * Returns the total height of the list (incl. the overflown/not visible part).
     *
     * @returns {Number}
     */
    MegaList.prototype.getContentHeight = function() {
        this._recalculate();
        return this._calculated['contentHeight'];
    };

    /**
     * Returns the total width of the list (incl. the overflown/not visible part).
     * @returns {Number}
     */
    MegaList.prototype.getContentWidth = function() {
        this._recalculate();
        return this._calculated['contentWidth'];
    };

    /**
     * Returns true if the scrollable area is scrolled to top.
     *
     * @returns {boolean}
     */
    MegaList.prototype.isAtTop = function() {
        this._recalculate();
        return this._calculated['isAtTop'];
    };

    /**
     * Returns true if the scrollable area is scrolled to bottom.
     *
     * @returns {boolean}
     */
    MegaList.prototype.isAtBottom = function() {
        this._recalculate();
        return this._calculated['isAtTop'];
    };

    /**
     * Returns a percent, representing the scroll position X.
     *
     * @returns {Number}
     */
    MegaList.prototype.getScrolledPercentX = function() {
        this._recalculate();
        return this._calculated['scrolledPercentX'];
    };

    /**
     * Returns a percent, representing the scroll position Y.
     *
     * @returns {*}
     */
    MegaList.prototype.getScrolledPercentY = function() {
        this._recalculate();
        return this._calculated['scrolledPercentY'];
    };

    /**
     * Scroll the Y axis of the list to `posPerc`
     *
     * @param posPerc {Number} A percent in the format of 0.0 - 1.0
     */
    MegaList.prototype.scrollToPercentY = function(posPerc) {
        var targetPx = 100/this.getScrollHeight() * posPerc;
        if (this.listContainer.scrollTop !== targetPx) {
            this.listContainer.scrollTop = targetPx;
            this._isUserScroll = false;
            this.scrollUpdate();
            this._onScroll();
            this._isUserScroll = true;
        }
    };

    /**
     * Scroll to specific Y position.
     *
     * @param posY {Number}
     */
    MegaList.prototype.scrollToY = function(posY) {
        if (this.listContainer.scrollTop !== posY) {
            this.listContainer.scrollTop = posY;
            this._isUserScroll = false;
            this.scrollUpdate();
            this._onScroll();
            this._isUserScroll = true;
        }
    };

    /**
     * Scroll to specific DOM Node.
     * Warning: The DOM Node should be a child of the listContainer, otherwise you may notice weird behaviour of this
     * function.
     *
     * @param element {DOMNode}
     */
    MegaList.prototype.scrollToDomElement = function(element) {
        this.listContainer.scrollTop = element.offsetTop;
        this._isUserScroll = false;
        this.scrollUpdate();
        this._onScroll();
        this._isUserScroll = true;
    };

    /**
     * Scroll to specific `itemId`
     *
     * @param itemId {String}
     * @returns {boolean} true if found, false if not found.
     */
    MegaList.prototype.scrollToItem = function(itemId) {
        var elementIndex = this.items.indexOf(itemId);
        if (elementIndex === -1) {
            return false;
        }

        this.listContainer.scrollTop = elementIndex * this.options.itemHeight;
        this._isUserScroll = false;
        this.scrollUpdate();
        this._onScroll();
        this._isUserScroll = true;

        return true;
    };

    /**
     * Used in case you want to destroy the MegaList instance and its created DOM nodes
     */
    MegaList.prototype.destroy = function () {

        // destroy PS
        this._unbindEvents();

        this.items = [];
        this._wasRendered = false;
        Ps.destroy(this.listContainer);
    };


    /**
     * Often you may want to initialise the MegaList, but not render it immediately (e.g. some items are still loading
     * and waiting to be added to the MegaList). Thats why, this method should be called so that the initial rendering
     * of the internal DOM nodes is done.
     */
    MegaList.prototype.initialRender = function () {
        assert(this._wasRendered === false, 'This MegaList is already rendered');

        this._wasRendered = true;

        if (!this.$content) {
            this.$content = $('<div class="megaList-content"></div>');
            this.$content.css({
                'position': 'relative'
            });
            this.content = this.$content[0];

            this.$listContainer.append(this.$content);
        }

        // init PS
        Ps.initialize(this.listContainer, this.options.perfectScrollOptions);

        this._scrollIsInitialized = true;

        this._contentUpdated();
        this._applyDOMChanges();

        this.scrollUpdate();

        this._isUserScroll = true;

        // bind events
        this._bindEvents();
    };


    /**
     * Internal method to clear precalculated values.
     *
     * @param name {String}
     * @private
     */
    MegaList.prototype._clearCalculated = function(name) {
        // TODO: write down all dependencies in an array and then calculate dependencies and clear them
        if (name === "scrollWidth") {
            //TODO: clear related.
            // e.g. scrolledPercentX
        }
        delete this._calculated[name];
    };

    /**
     * Does recalculation of the internally precalculated values so that the DOM Re-paints are reduced to minimum,
     * while the user is scrolling up/down.
     * @private
     */
    MegaList.prototype._recalculate = function() {
        var $listContainer = this.$listContainer;
        var listContainer = this.listContainer;

        var calculated = this._calculated;

        // TODO: move all those IFs to a getter that would only calculate the requested values, not all of them!
        if (!calculated['scrollWidth']) {
            calculated['scrollWidth'] = $listContainer.innerWidth();
        }
        if (!calculated['scrollHeight']) {
            calculated['scrollHeight'] = $listContainer.innerHeight();
        }
        if (!calculated['contentWidth']) {
            var contentWidth = $listContainer.children(":first").outerWidth();
            if (contentWidth) {
                calculated['contentWidth'] = contentWidth;
            }
            else {
                // TODO: fixme
                calculated['contentWidth'] = this.options.itemWidth;
            }
        }
        if (!calculated['itemsPerRow']) {
            calculated['itemsPerRow'] = Math.max(
                1,
                Math.floor(
                    calculated['contentWidth'] / this.options.itemWidth
                )
            );
        }
        if (!calculated['contentHeight']) {
            calculated['contentHeight'] = Math.ceil(this.items.length / calculated['itemsPerRow']) * this.options.itemHeight;
        }
        if (!calculated['scrollLeft']) {
            calculated['scrollLeft'] = this.listContainer.scrollLeft;
        }
        if (!calculated['scrollTop']) {
            calculated['scrollTop'] = this.listContainer.scrollTop;
        }
        if (!calculated['scrolledPercentX']) {
            calculated['scrolledPercentX'] = 100/calculated['scrollWidth'] * calculated['scrollLeft'];
        }
        if (!calculated['scrolledPercentY']) {
            calculated['scrolledPercentY'] = 100/calculated['scrollHeight'] * calculated['scrollTop'];
        }
        if (!calculated['isAtTop']) {
            calculated['isAtTop'] = calculated['scrollTop'] === 0;
        }
        if (!calculated['isAtBottom']) {
            calculated['isAtBottom'] = this.listContainer.scrollTop === calculated['scrollHeight'];
        }
        if (!calculated['itemsPerPage']) {
            calculated['itemsPerPage'] = Math.ceil(
                calculated['scrollHeight'] / this.options.itemHeight
            ) * calculated['itemsPerRow'];
        }
        if (!calculated['visibleFirstItemNum']) {
            calculated['visibleFirstItemNum'] = Math.floor(
                Math.floor(calculated['scrollTop'] / this.options.itemHeight) * calculated['itemsPerRow']
            );
        }
        if (!calculated['visibleLastItemNum']) {
            calculated['visibleLastItemNum'] = Math.min(
                this.items.length,
                Math.ceil(
                    Math.ceil(calculated['scrollTop'] / this.options.itemHeight) *
                    calculated['itemsPerRow'] + calculated['itemsPerPage']
                )
            );
        }
    };

    /**
     * Internal method, that gets called when the MegaList's content gets updated (e.g. the internal list of item ids).
     *
     * @private
     */
    MegaList.prototype._contentUpdated = function(forced) {
        this._clearCalculated('contentWidth');
        this._clearCalculated('contentHeight');
        this._clearCalculated('visibleFirstItemNum');
        this._clearCalculated('visibleLastItemNum');

        if (this._wasRendered || forced) {
            this._recalculate();
            this.$content.height(this._calculated['contentHeight']);

            // scrolled out of the viewport if the last item in the list was removed? scroll back a little bit...
            if (this._calculated['scrollHeight'] + this._calculated['scrollTop'] > this._calculated['contentHeight']) {
                this.scrollToY(
                    this._calculated['contentHeight'] - this._calculated['scrollHeight']
                );
            }
        }
    };

    /**
     * Internal method, that get called when DOM changes should be done (e.g. render new items since they got in/out
     * of the viewport)
     * @private
     */
    MegaList.prototype._applyDOMChanges = function() {
        this._recalculate();

        var first = this._calculated['visibleFirstItemNum'];
        var last = this._calculated['visibleLastItemNum'];

        // remove items before the first visible item
        for(var i = 0; i<first; i++) {
            var id = this.items[i];
            if (this._currentlyRendered[id]) {
                this._currentlyRendered[id].remove();
                delete this._currentlyRendered[id];
            }
        }
        // remove items after the last visible item
        for(var i = last; i<this.items.length; i++) {
            var id = this.items[i];
            if (this._currentlyRendered[id]) {
                this._currentlyRendered[id].remove();
                delete this._currentlyRendered[id];
            }
        }

        // show items which are currently visible
        for(var i = first; i<last; i++) {
            var id = this.items[i];
            if (!this._currentlyRendered[id]) {
                var renderedNode = this.options.itemRenderFunction(id);
                var css = {
                    'position': 'absolute',
                    'top': (this.options.itemHeight * Math.floor(i/this._calculated['itemsPerRow']))
                };

                if (this._calculated['itemsPerRow'] > 1) {
                    css['left'] = (i % this._calculated['itemsPerRow']) * this.options.itemWidth;
                }

                renderedNode.css(css);
                renderedNode.data('id', id);

                this.$content.append(
                    renderedNode
                );

                this._currentlyRendered[id] = renderedNode;
            }
            else {
                this._repositionRenderedItem(id);
            }
        }
    };

    MegaList.prototype._repositionRenderedItem = function(itemId) {
        var self = this;
        var node = self._currentlyRendered[itemId];
        var itemPos = self.items.indexOf(itemId);

        var css = {
            'position': 'absolute',
            'top': (self.options.itemHeight * Math.floor(itemPos/self._calculated['itemsPerRow']))
        };

        if (self._calculated['itemsPerRow'] > 1) {
            css['left'] = (itemPos % self._calculated['itemsPerRow']) * self.options.itemWidth;
        }
        node.css(css);
    };

    /**
     * Internal method that *ONLY* repositions items, in case a call to `_applyDOMChanges` is NOT needed, but the
     * items in the list should be re-positioned.
     * Basically, a lightweight version of `_applyDOMChanges` that does NOT adds or removes DOM nodes.
     *
     * @private
     */
    MegaList.prototype._repositionRenderedItems = function() {
        var self = this;
        Object.keys(self._currentlyRendered).forEach(function(k) {
            self._repositionRenderedItem(k);
        });
    };

    /**
     * Internal method that gets called when the user scrolls.
     *
     * @param e {Event}
     * @private
     */
    MegaList.prototype._onScroll = function(e) {
        this._clearCalculated('scrollTop');
        this._clearCalculated('scrollLeft');
        this._clearCalculated('visibleFirstItemNum');
        this._clearCalculated('visibleLastItemNum');
        this._applyDOMChanges();
    };


    scope.MegaList = MegaList;
})(window, jQuery);
