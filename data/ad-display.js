const MIN_WIDTH = 150, MAX_WIDTH = 450;

function AdDisplay(ad) {
    
    this.children = [];
    this.index = 0;
    this.add(ad);
}

AdDisplay.prototype.add = function(ad) {
    
     ad && this.children.push(ad);
}