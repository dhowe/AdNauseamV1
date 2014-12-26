const MIN_WIDTH = 150, MAX_WIDTH = 450;

function AdDisplay(ad) {
    
    this.children = [];
    this.index = 0;
    this.add(ad);
}

AdDisplay.prototype.visited = function() {

    var numv = 0;
    for (var i=0, j = this.children.length; i<j; i++) {

        if (this.children[i].visitedTs > 0) {
            //console.log('Found visited: #'+ads[i].id);
            numv++;
        }
    }
    return numv;
}

AdDisplay.prototype.count = function() {
    
    return this.children.length;
}
    
AdDisplay.prototype.add = function(ad) {
    
     ad && this.children.push(ad);
}

AdDisplay.prototype.child = function(i) {
    
     return this.children[i];
}