/**
 * Basic data generators for usage in MegaList examples
 */

var FakeDataGenerator = function() {
    this.index = 0;
};

FakeDataGenerator.prototype.next = function() {
    return this.index++;
};
