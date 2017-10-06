describe("Basic test", function() {
    var $container;
    var itemIds = [];
    beforeEach(function() {
        $container = Fixtures.DOM.basicContainer();
        itemIds = Fixtures.randomItemIds(50);
        $(document.body).append($container);
    });
    afterEach(function() {
        if ($container && $($container).size() > 0) {
            $($container).remove();
        }
        itemIds = [];
    });

    it('basic initialisation and core functionality of a list', function() {
        $($container).css({
            'width': 320,
            'height': 320
        });

        var megaList = new MegaList($container, {
            itemWidth: 320,
            itemHeight: 90,
            itemRenderFunction: Fixtures.DOM.itemDOMNodeGeneratorCallback
        });

        Fixtures.randomItemIds(megaList, 20);

        // render
        megaList.initialRender();

        expect($('.container').size()).to.eql(1);
        expect($('.container').outerWidth()).to.eql(320);
        expect($('.container').outerHeight()).to.eql(320);
        expect($('.container .item').size()).to.eql(4);

        megaList.scrollToY(40);
        expect($('.container .item').size()).to.eql(5);

        megaList.scrollToY(30);
        expect($('.container .item').size()).to.eql(5);

        megaList.scrollToY(0);
        expect($('.container .item').size()).to.eql(4);

        expect(megaList._calculated['itemsPerRow']).to.eql(1);
    });


    it('list resized', function() {
        $($container).css({
            'width': 320,
            'height': 320
        });

        var megaList = new MegaList($container, {
            itemWidth: 320,
            itemHeight: 90,
            itemRenderFunction: Fixtures.DOM.itemDOMNodeGeneratorCallback
        });

        Fixtures.randomItemIds(megaList, 20);

        // render
        megaList.initialRender();

        expect($('.container').size()).to.eql(1);
        expect($('.container').outerWidth()).to.eql(320);
        expect($('.container').outerHeight()).to.eql(320);
        expect($('.container .item').size()).to.eql(4);

        $($container).css({
            'height': 90
        });


        megaList.resized();
        expect($('.container .item').size()).to.eql(1);
    });

    it('basic initialisation and core functionality of a grid', function() {
        $($container).css({
            'width': 640,
            'height': 320
        });

        var megaList = new MegaList($container, {
            itemWidth: 320,
            itemHeight: 90,
            itemRenderFunction: Fixtures.DOM.itemDOMNodeGeneratorCallback
        });

        Fixtures.randomItemIds(megaList, 20);

        // render
        megaList.initialRender();

        expect(megaList._calculated['itemsPerRow']).to.eql(2);

        expect($('.container').size()).to.eql(1);
        expect($('.container').outerWidth()).to.eql(640);
        expect($('.container').outerHeight()).to.eql(320);
        expect($('.container .item').size()).to.eql(8);

        megaList.scrollToY(40);
        expect($('.container .item').size()).to.eql(10);

        megaList.scrollToY(30);
        expect($('.container .item').size()).to.eql(10);

        megaList.scrollToY(0);
        expect($('.container .item').size()).to.eql(8);
    });

    it('grid resized', function() {
        $($container).css({
            'width': 640,
            'height': 320
        });

        var megaList = new MegaList($container, {
            itemWidth: 320,
            itemHeight: 90,
            itemRenderFunction: Fixtures.DOM.itemDOMNodeGeneratorCallback
        });

        Fixtures.randomItemIds(megaList, 20);

        // render
        megaList.initialRender();

        expect($('.container').size()).to.eql(1);
        expect($('.container').outerWidth()).to.eql(640);
        expect($('.container').outerHeight()).to.eql(320);
        expect($('.container .item').size()).to.eql(8);

        $($container).css({
            'height': 90
        });


        megaList.resized();
        expect($('.container .item').size()).to.eql(2);

        megaList.scrollToY(40);
        expect($('.container .item').size()).to.eql(4);
    });
    it('itemUpdated functionality', function() {
        // some mockups
        var itemUpdatedCalls = {};
        var storage = {};

        $($container).css({
            'width': 640,
            'height': 320
        });

        // init MegaList
        var megaList = new MegaList($container, {
            itemWidth: 320,
            itemHeight: 90,
            itemRenderFunction: function(id) {
                // append storage[id] data to the innerText for later comparison
                var node = Fixtures.DOM.itemDOMNodeGeneratorCallback(id);
                node.innerText = "Item #" + id + ", " + storage[id];
                return node;
            },
            itemUpdatedFunction: function(id, node) {
                // a mockup of a the itemUpdatedFunction that would update the DOM node when called from MegaList
                itemUpdatedCalls[id] = node;
                node.innerText = "Item #" + id + ", " + storage[id];
            }
        });


        // generate some itemIds
        var ids = Fixtures.randomItemIds(megaList, 20);
        // fill in the local "db" (mockup), with initial data, e.g. zeros
        ids.forEach(function(id) {
            storage[id] = 0;
        });

        // render
        megaList.initialRender();

        // ensure that the initial render was done correctly
        expect($('.container').size()).to.eql(1);
        expect($('.container').outerWidth()).to.eql(640);
        expect($('.container').outerHeight()).to.eql(320);
        expect($('.container .item').size()).to.eql(8);

        $($container).css({
            'height': 90
        });


        // ensure that resizing (dynamic rendering of only visible in the viewport stuff) works correctly
        megaList.resized();
        expect($('.container .item').size()).to.eql(2);

        // ensure that the lastId from the list is not rendered
        var idsKeys = Object.keys(storage);
        var lastId = idsKeys[idsKeys.length - 1];
        expect($('.container .item[data-id="' + lastId + '"]').size()).to.eql(0);

        // test that scrollToY works
        megaList.scrollToY(40);
        expect($('.container .item').size()).to.eql(4);

        // ensure itemUpdated was never called yet for item with id `lastId`
        expect(itemUpdatedCalls[lastId]).to.eql(undefined);


        // scroll to force showing the lastId
        megaList.scrollToY(9999);

        // check that its shown
        expect(megaList.isRendered(lastId)).to.eql(true);

        // ensure that no itemUpdate call was made for lastId yet and the data is the initial one
        expect($('.container .item[data-id="' + lastId + '"]').size()).to.eql(1);
        expect($('.container .item[data-id="' + lastId + '"]').text()).to.eql("Item #20, 0");
        expect(itemUpdatedCalls[lastId]).to.eql(undefined);

        // update the storage mockup with new data for `lastId`
        storage[lastId] = 123;

        // tell MegaList that this item was updated
        megaList.itemUpdated(lastId);

        // ensure that the DOM was correctly updated
        expect($('.container .item[data-id="' + lastId + '"]').text()).to.eql("Item #20, 123");
        expect(itemUpdatedCalls[lastId]).to.eql($('.container .item[data-id="' + lastId + '"]')[0]);
        expect(Object.keys(itemUpdatedCalls).length).to.eql(1);

        // now test that items, that are not in the viewport would NOT get updated until needed
        var firstId = idsKeys[0];
        storage[firstId] = 321;
        megaList.itemUpdated(firstId);
        expect(Object.keys(itemUpdatedCalls).length).to.eql(1);
        expect($('.container .item[data-id="' + firstId + '"]').size()).to.eql(0);

        // now scroll to the first item to check that the firstItem would correctly get updated
        megaList.scrollToY(0);
        expect(megaList.isRendered(firstId)).to.eql(true);
        expect(Object.keys(itemUpdatedCalls).length).to.eql(1);
        expect($('.container .item[data-id="' + firstId + '"]').size()).to.eql(1);
        expect($('.container .item[data-id="' + firstId + '"]').text()).to.eql("Item #1, 321");
    });
});
