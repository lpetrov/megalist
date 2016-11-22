describe("Basic test", function() {
    var $container;
    var itemIds = [];
    beforeEach(function() {
        $container = Fixtures.DOM.basicContainer();
        itemIds = Fixtures.randomItemIds(50);
        $(document.body).append($container);
    });
    afterEach(function() {
        if ($container && $container.size() > 0) {
            $container.remove();
        }
        itemIds = [];
    });

    it('basic initialisation and core functionality of a list', function() {
        $container.css({
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
        $container.css({
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

        $container.css({
            'height': 90
        });


        megaList.resized();
        expect($('.container .item').size()).to.eql(1);
    });

    it('basic initialisation and core functionality of a grid', function() {
        $container.css({
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
        $container.css({
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

        $container.css({
            'height': 90
        });


        megaList.resized();
        expect($('.container .item').size()).to.eql(2);

        megaList.scrollToY(40);
        expect($('.container .item').size()).to.eql(4);
    });
});
