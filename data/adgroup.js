const MIN_WIDTH = 150, MAX_WIDTH = 450;

function AdGroup(ad) {
    
    this.children = [];
    this.index = 0;
    this.add(ad);
}

/*
 * returns 'visited' if any are visited,
 *      'failed' if all are failed or pending,
 *      'pending' if all are pending.
 */
AdGroup.prototype.groupState = function() {
    
    var failed, visited = this.visitedCount();
    if (visited) return 'visited';
    
    failed = this.failedCount();

    return failed ? 'failed' : 'pending';
}

AdGroup.prototype.state = function(i) {
    
    var visitedTs = this.children[i].visitedTs;
    return (visitedTs == 0) ? 'pending' :
        (visitedTs  < 0 ? 'failed' : 'visited' );
}

AdGroup.prototype.failedCount = function() {
    
    return this.children.filter(function(d) {
        return d.visitedTs < 0;
    }).length;
}

AdGroup.prototype.visitedCount = function() {
    
    return this.children.filter(function(d) {
        return d.visitedTs > 0;
    }).length;
}

AdGroup.prototype.count = function() {
    
    return this.children.length;
}
    
AdGroup.prototype.add = function(ad) {
    
     ad && this.children.push(ad);
}

AdGroup.prototype.child = function(i) {
    
     return this.children[i];
}