var MIN_WIDTH = 150, MAX_WIDTH = 450, GID = 0;

function AdGroup(ad) {
    
    this.children = [];
    this.index = 0;
    this.add(ad);
    this.gid = GID++;
}

AdGroup.prototype.id = function(i) {
    
    return this.child(i).id;
}

AdGroup.prototype.findChildById = function(id) {
    
    for (var i=0, j = this.children.length; i<j; i++) {
        
      if (this.children[i].id === id)
        return this.children[i];
    }

    return null;
}
AdGroup.prototype.child = function(i) {
    
    return this.children[(typeof i == 'undefined') ? this.index : i];
}

AdGroup.prototype.state = function(i) {
    
    var visitedTs = this.child(i).visitedTs;
    return (visitedTs == 0) ? 'pending' :
        (visitedTs  < 0 ? 'failed' : 'visited' );
}

AdGroup.prototype.type = function() {
    
    return this.children[0].contentType; // same-for-all
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
