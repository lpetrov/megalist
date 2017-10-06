var Fixtures = window.Fixtures || {};
Fixtures.DOM = window.Fixtures.DOM || {};

Fixtures.randomItemIds = function(megaList, totalNumberOfItemIds) {
    if (!totalNumberOfItemIds && $.isNumeric(megaList)) {
        totalNumberOfItemIds = megaList;
        megaList = false;
    }
    var r = [];
    for (var i = 0; i < totalNumberOfItemIds; i++) {
        r.push(i + 1);
    }

    if (megaList && megaList.batchAdd) {
        megaList.batchAdd(r);
        return r;
    }
    else {
        return r;
    }
};

Fixtures.DOM.basicContainer = function() {
    var $container = $('<div class="container"></div>');
    $container.css({
        'position': 'relative'
    });

    return $container[0];
};

Fixtures.DOM.itemDOMNodeGeneratorCallback = function(id) {
    return $('<div class="item" data-id="' + id + '">Item #' + id + '</div>')[0];
};
