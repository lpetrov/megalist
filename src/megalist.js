(function(scope, $) {
    var assert = function(val, msg) {
        if (!val) {
            throw new Error(msg ? msg : "Assertio Failed.");
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

        'appendTo': false,

        /**
         * Pass any PerfectScrollbar options here.
         */
        perfectScrollOptions: {},
    };

    var listId = 0;
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

    MegaList.prototype._unbindEvents = function () {
        $(window).unbind("resize." + this._generateEventNamespace());
        $(document).unbind('ps-scroll-y.ps' + this._generateEventNamespace());
    };

    MegaList.prototype.add = function (itemId) {
        this.batchAdd([itemId]);
    };

    MegaList.prototype.remove = function (itemId) {
        this.batchRemove([itemId]);
    };

    /* optimised adding of entries, less DOM updates */
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

    /* optimised removing of entries, less DOM updates */
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

    MegaList.prototype.has = function (itemId) {
        return this.items.indexOf(itemId) > -1;
    };

    MegaList.prototype.isRendered = function (itemId) {
        return this._currentlyRendered[itemId] ? true : false;
    };

    /**
     * Should be called when the list container is resized.
     * This method would be automatically called on window resize.
     */
    MegaList.prototype.resized = function () {
        // all done, trigger a resize!
        $(this).trigger('resize');
    };

    // MegaList.on/bind/rebind(
    //     eventName {
    //     "itemAdded",
    //         "itemRemoved",
    //         "reconfigured" (changedOptions incl old/new value),
    //     "resize",
    //         "userScroll",
    //         "scroll"
    // }
    // );

    MegaList.prototype.bind = function (eventName, cb) {
        $(this).bind(eventName, cb);
    };

    MegaList.prototype.rebind = function (eventName, cb) {
        if (eventName.indexOf(".") === -1) {
            console.error("MegaList.rebind called with eventName that does not have a namespace, which is an" +
                "anti-pattern");
            return;
        }
        $(this).unbind(eventName);
        $(this).bind(eventName, cb);
    };

    MegaList.prototype.unbind = function (eventName, cb) {
        $(this).unbind(eventName, cb);
    };

    MegaList.prototype.trigger = function () {
        $(this).trigger.apply($(this), arguments);
    };


    MegaList.prototype.scrollUpdate = function() {
        Ps.update(this.listContainer);
    };

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

    MegaList.prototype.getScrollTop = function() {
        return this.listContainer.scrollTop;
    };

    MegaList.prototype.getScrollLeft = function() {
        return this.listContainer.scrollLeft;
    };

    MegaList.prototype.getScrollHeight = function() {
        this._recalculate();
        return this._calculated['scrollHeight'];
    };

    MegaList.prototype.getScrollWidth = function() {
        this._recalculate();
        return this._calculated['scrollWidth'];
    };

    MegaList.prototype.getContentHeight = function() {
        this._recalculate();
        return this._calculated['contentHeight'];
    };

    MegaList.prototype.getContentWidth = function() {
        this._recalculate();
        return this._calculated['contentWidth'];
    };

    MegaList.prototype.isAtTop = function() {
        this._recalculate();
        return this._calculated['isAtTop'];
    };

    MegaList.prototype.isAtBottom = function() {
        this._recalculate();
        return this._calculated['isAtTop'];
    };

    MegaList.prototype.getScrolledPercentX = function() {
        this._recalculate();
        return this._calculated['scrolledPercentX'];
    };

    MegaList.prototype.getScrolledPercentY = function() {
        this._recalculate();
        return this._calculated['scrolledPercentY'];
    };

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
    MegaList.prototype.scrollToY = function(posY) {
        if (this.listContainer.scrollTop !== posY) {
            this.listContainer.scrollTop = posY;
            this._isUserScroll = false;
            this.scrollUpdate();
            this._onScroll();
            this._isUserScroll = true;
        }
    };

    MegaList.prototype.scrollToDomElement = function(element) {
        this.listContainer.scrollTop = element.offsetTop;
        this._isUserScroll = false;
        this.scrollUpdate();
        this._onScroll();
        this._isUserScroll = true;
    };

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

    /* used in case you want to destroy the MegaList instance and its created DOM nodes */
    MegaList.prototype.destroy = function () {

        // destroy PS
        this._unbindEvents();

        this.items = [];
        this._wasRendered = false;
        Ps.destroy(this.listContainer);
    };


    /* called to render the initial/required DOM elements */
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

        this._contentUpdated();
        this._applyDOMChanges();

        this.scrollUpdate();

        this._isUserScroll = true;

        // bind events
        this._bindEvents();
    };


    MegaList.prototype._clearCalculated = function(name) {
        // TODO: write down all dependencies in an array and then calculate dependencies and clear them
        if (name === "scrollWidth") {
            //TODO: clear related.
            // e.g. scrolledPercentX
        }
        delete this._calculated[name];
    };

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
            calculated['itemsPerRow'] = Math.floor(
                calculated['contentWidth'] / this.options.itemWidth
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

    MegaList.prototype._contentUpdated = function() {
        this._clearCalculated('contentWidth');
        this._clearCalculated('contentHeight');
        this._clearCalculated('visibleFirstItemNum');
        this._clearCalculated('visibleLastItemNum');

        if (this._wasRendered) {
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
        }
    };

    MegaList.prototype._repositionRenderedItems = function() {
        var self = this;
        Object.keys(self._currentlyRendered).forEach(function(k) {
            var node = self._currentlyRendered[k];
            var itemId = node.data('id');
            var itemPos = self.items.indexOf(itemId);

            var css = {
                'position': 'absolute',
                'top': (self.options.itemHeight * Math.floor(itemPos/self._calculated['itemsPerRow']))
            };

            if (self._calculated['itemsPerRow'] > 1) {
                css['left'] = (itemPos % self._calculated['itemsPerRow']) * self.options.itemWidth;
            }
            node.css(css);
        });
    };

    MegaList.prototype._onScroll = function(e) {
        this._clearCalculated('scrollTop');
        this._clearCalculated('scrollLeft');
        this._clearCalculated('visibleFirstItemNum');
        this._clearCalculated('visibleLastItemNum');
        this._applyDOMChanges();
    };


    scope.MegaList = MegaList;
})(window, jQuery);
