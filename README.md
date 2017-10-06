# MegaList [![Build Status](https://travis-ci.org/lpetrov/megalist.svg?branch=master)](https://travis-ci.org/lpetrov/megalist)

## Examples
Check out the [examples](https://github.com/lpetrov/megalist/tree/master/examples) directory.

## Description
MegaList is a very simple but powerful utility for rendering very large lists, without cluttering the DOM with thousands
of DOM nodes.

Every dynamic web app, sooner or later would end up rendering tons of stuff in the DOM Tree, which makes its traversal,
updating slow and very complicated/painful for developers.

This is why we'd developed a very minimalistic utility that uses [perfect-scrollbar](https://github.com/noraesae/perfect-scrollbar)
and adds the so called "virtual", "delayed" or "lazy" rendering.
Basically, the MegaList would *only* render the DOM nodes which are currently in the scrollable viewport. E.g. if your
app needs to render 10 000 of rows (we call those *items*), by using MegaList, out of the box, it would only render the
needed/displayed rows while the user scrolls. Which depending on the height of the items and the container, may reduce
the number of rendered rows from 10 000 to only 10-20-30.

Mean while, in theory this is a really straight forward problem that can be solved manually with your own code, there
are a lot of edge cases that can/would trigger a DOM repaint or reflow 
(more info: [What forces layout/reflow](https://gist.github.com/paulirish/5d52fb081b3570c81e3a)). This is why, we did
researched all currently available scrolling libraries and picked [perfect-scrollbar](https://github.com/noraesae/perfect-scrollbar)
and then simply added a layer of caching and clever math, so that the reflow/repaint/layout is kept at minimum.

## Dependencies
* [jQuery](https://jquery.com/)
* [perfect-scrollbar](https://github.com/noraesae/perfect-scrollbar)


## Supported browsers
* IE 11+
* Chrome 50+ (may work on older versions)
* Firefox 48+ (may work on older versions)

## Setup
1. Ensure jQuery is loaded on your page (at least v2.0).
2. Include perfect-scrollbar (js and css files) in your html file.
3. Include MegaList's megalist.js file
4. Create a container div that contains your list (the containter should have a `position: relative`, `width` and 
`height` set):
```<div id="exampleContainer"></div>```
5. Initialise your MegaList instance and pass `itemWidth` and `itemHeight` (all items in your list should have a static,
predefined width and height!):
```
var megaList = new MegaList($('#exampleContainer'), {
    itemWidth: 120,
    itemHeight: 120,
    itemRenderFunction: function(id) {
        return $('<div class="item highlight-' + (id % 2) + '">Item #' + (id + 1)+ '</div>');
    }
});
```


6. Pass a 'itemRenderFunction' option that returns a valid DOM Node or a HTML string. This function would be called
every time when the MegaList needs to render a item from your list. To identify different nodes, the MegaList would pass
an `id`, which is the same ID which is used when adding items in the MegaList.

7. Since MegaList does not care on the actual content of your list, you need to only pass IDs of the items, by doing:
```
megaList.batchAdd([1,2,3]);
```

8. When you are ready, just call: ```megaList.initialRender();``` and the required DOM nodes would be rendered in 
`#exampleContainer` and Perfect Scrollbar initialised (no need to manually manage the initialisation of PS).

## Features
* **List view**  
  MegaList does calculations and if it can fit only 1 item per row, it would position all items in your list as a list.
  
* **Grid view**  
  If the width of the container is at least x2 of the item width, MegaList would render your items in a grid.
  
* **Resizeable container**  
  In case your app allows the user to resize the actuall UI, MegaList allows you to trigger a resize on the list and
  visible items, by simply calling `megaList.resized();`.
  Note: When the window is resized, the .resized() method would be automatically called, so if your UI does a 
  `$(window).trigger('resize')` you may not need to call that method at all. It would work automatically.
  
* **Cleanup**  
  `megaList.destroy()` when called, would clean up all dom nodes, event handlers, etc so that you can free up even more
  memory/DOM nodes if the UI related to the scrollable list is not currently visible/needed at the moment.
  
* **Dynamic adding/removing of items**  
  MegaList is meant to be dynamic, so you can add/remove "items" anytime you want/need to. And to make things even more
  faster/efficient, we are having a `megaList.batchAdd([list of string ids, ...])` and `megaList.batchRemove([ids, ...])`
  that would add all "items" in a batch and only try to trigger 1 repaint/re-render of the list and calculations.

* **Minimum DOM updates, even for really long lists, with high frequency updates in UIs**  
  MegaList, since v0.2, added support for dynamic updates of listed items.
  
  This feature works best for UIs which list tons of data and have very high frequency updates.
   
  Developers can easily, do that by simply:
  1. Whenever a property of an item (e.g. title, size, icon, etc) that requires a DOM update for the specific list item 
  is an updated in your app, you need to call `megaList.itemUpdated(itemId)` and thats all, **do NOT update any DOM nodes
  at this point**.
  2. Pass a`itemUpdatedFunction(nodeId, domNode)` callback to `MegaList.options`.
  That callback function would be called every time when a DOM update is required.
  
  Basically, once steps 1 and 2 are done, your app would automatically ONLY update DOM
  when needed (e.g. in the view port). Any update, that is needed for an itme which is
  not visible in the viewport, would be scheduled for later, when the item is now visible. 

  A simple demo can be found in: [examples/basic-list-item-updated.html](examples/basic-list-item-updated.html)
  
* **API**  
  MegaList supports manual scrolling that can be controlled by your JS code, look at the `MegaList.prototype.*` for more
  info and docs.
  

## Contributing
**Bug fixes** and **new features** can be proposed using [pull requests](https://github.com/lpetrov/megalist/pulls).
Please read the [contribution guidelines](https://github.com/lpetrov/megalist/blob/master/CONTRIBUTING.md) before submitting a pull request.

## Support
This project is actively maintained, but there is no official support channel.  
However, you are free to submit [issues, questions or feature requests](https://github.com/lpetrov/megalist/issues), which
whenever we or other developers like can answer or submit a PR.

## License
Released under the [MIT license](http://www.opensource.org/licenses/MIT).
