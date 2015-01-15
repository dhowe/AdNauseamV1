var TEXT_MINW = 150, TEXT_MAXW = 450, MAX_PER_SET = 9;

var gids = [];
function createAdSets(ads) {

    console.log('createAdSets()');

    var ad, hash = {}, adsets = [];

    // set hidden val for each ad
    for (var i=0, j = ads.length; i<j; i++) {

        ad = ads[i];
        
        key = computeHashKey(ad); 
        
        if (!key) continue;
        
        if (!hash[key]) {

            // new: add a hash entry
            hash[key] = new AdSet(ad);
            gids.push(hash[key].gid);
            adsets.push(hash[key]);
        }
        else {

            // dup: add as child
            hash[key].add(ad);
        }
    }

    // sort by foundTs and limit to MAX_PER_SET
    if (false) {
        
        for (var i=0, j = adsets.length; i<j; i++) {
            
            adsets[i].children.sort(byField('-foundTs'));
            adsets[i].children = adsets[i].children.splice(0, MAX_PER_SET);
            /*for (var k=0, l = adsets[i].children.length; k<l; k++)
                console.log(adsets[i].children[k].foundTs);
            console.log("");*/
        }
    }
    
    //console.log(gids.sort());
    return adsets;
}

function AdSet(ad) { 

    this.gid = Math.abs(createGid(ad));
    //this.ts = +new Date();
    //console.log('create AdSet#'+this.gid);
    this.children = [];
    this.index = 0;
    this.add(ad);
}

AdSet.prototype.id = function(i) {
    
    return this.child(i).id;
}

AdSet.prototype.findChildById = function(id) {
    
    for (var i=0, j = this.children.length; i<j; i++) {
        
      if (this.children[i].id === id)
        return i;
    }

    return -1;
}

AdSet.prototype.child = function(i) {
    
    return this.children[(typeof i == 'undefined') ? this.index : i];
}

AdSet.prototype.state = function(i) {
    
    var visitedTs = this.child(i).visitedTs;
    return (visitedTs == 0) ? 'pending' :
        (visitedTs  < 0 ? 'failed' : 'visited' );
}

AdSet.prototype.type = function() {
    
    return this.children[0].contentType; // same-for-all
}

AdSet.prototype.failedCount = function() {
    
    return this.children.filter(function(d) {
        return d.visitedTs < 0;
    }).length;
}

AdSet.prototype.visitedCount = function() {
    
    return this.children.filter(function(d) {
        return d.visitedTs > 0;
    }).length;
}

AdSet.prototype.count = function() {
    
    return this.children.length;
}
    
AdSet.prototype.add = function(ad) {
          
     ad && this.children.push(ad);
}

function createGid(ad) {
    
    var hash = 0, key = computeHashKey(ad);
    
    for (var i = 0; i < key.length; i++) {
        var code = key.charCodeAt(i);
        hash = ((hash<<5)-hash) + code;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
}

/*
 * returns 'visited' if any are visited,
 *      'failed' if all are failed or pending,
 *      'pending' if all are pending.
 */
AdSet.prototype.groupState = function() {
    
    var failed, visited = this.visitedCount();
    
    if (visited) return 'visited';
    
    failed = this.failedCount();

    return failed ? 'failed' : 'pending';
}


//AdSet.createAdSets = createAdSets;
//(typeof exports != 'undefined') && (exports.AdSet = AdSet);

