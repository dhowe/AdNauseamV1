var gAds, gAdSets, gMin, gMax; // stateful

const margin = margin = { top: 50, right: 40, bottom: 20, left: 20 },
    format = d3.time.format("%a %b %d %Y"), MAX_NUM_AT_START = 400, MAX_PER_SET = 9,
    // TODO: need to verify that at least one full bar is showing
    customTimeFormat = d3.time.format.multi([
        [".%L", function(d)     { return d.getMilliseconds(); }],
        [":%S", function(d)     { return d.getSeconds(); }],
        ["%I:%M", function(d)   { return d.getMinutes(); }],
        ["%I %p", function(d)   { return d.getHours(); }],
        ["%a %d", function(d)   { return d.getDay() && d.getDate() != 1; }],
        ["%b %d", function(d)   { return d.getDate() != 1; }],
        ["%B", function(d)      { return d.getMonth(); }],
        ["%Y", function()       { return true; }]
]);

function createSlider() {

    console.log('Vault-UI.createSlider -------------');

    // clear all the old svg
    d3.select("g.parent").selectAll("*").remove();
    d3.select("svg").remove();

	// setting up the position of the chart
	var iconW = 100, width;
	
	try {
	
	   width = parseInt( d3.select("#stage").style("width") )
	        - (margin.left + margin.right + iconW);
    }
    catch (e) {
        
        throw Error("[D3] NO STAGE (page-not-ready?)");
    }

  	// finding the first and last ad
	var minDate = d3.min(gAds, function(d) { return d.foundTs; }),
		maxDate = d3.max(gAds, function(d) { return d.foundTs; });
		
   // mapping the scales
   var xScale = d3.time.scale()
        .domain([minDate, maxDate])
        .range([0, width]);

   // create an array of dates
   var map = gAds.map( function(d) { return parseInt(xScale(d.foundTs)) })

   // setup the histogram layout
   var histogram = d3.layout.histogram()
      .bins(120) // how many groups? [dyn] base on width
      //.bins(width/(barw-barg))     [dyn]
      (map)

   //log(histogram);

   // setup the x axis
   var xAxis = d3.svg.axis()
	      .scale(xScale)
	      .tickFormat(customTimeFormat)
	      .ticks(7); // [dyn]

   // position the SVG
   var svg = d3.select("#svgcon")
        .append("svg")
	    .attr("width", width + margin.left + margin.right)
	    .attr("height", /*height +*/ margin.top + margin.bottom)
	    .append("g")
	    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

   // append the x axis
   svg.append("g")                  // [ONCE]
       .attr("class", "x axis")
	     //.attr("transform", "translate(0," + height + ")")
       .call(xAxis);

   var barw = histogram[0].dx - 1; //relative width

   //Create groups for the bars
   var bars = svg.selectAll(".bar")
       .data(histogram)
       .enter()
       .append("g")

	// we could go with rectangular bars
	/*bars.append("rect")
       .attr("x", function(d) { return d.x })
       .attr("y", function(d) { return d.y*-3 - 1})
       .attr("width", barw )
       .attr("height", function(d) { if (d.y > 0) { return d.y*3 - 1 } else { return 0} })
       .attr("style", "fill: #000;stroke: #000;stroke-width: 2;")*/

	// or use lines which can also offer a stroke-dasharray
	bars.append("line")
       .attr("x1", function(d) { return d.x + barw/2 })
       .attr("y1", - 2 )
       .attr("x2", function(d) { return d.x + barw/2 })
       .attr("y2", function(d) { return d.y*-3 - 2})
       .attr("style", "stroke-width:" + barw + "; stroke-dasharray: 2,1; stroke: #ccc")

    var limitedMin = computeMinDateFor(gAds, minDate);

	// setup the brush
	var brush = d3.svg.brush()
		.x(xScale)
		 .extent([limitedMin, maxDate])
	    .on("brushstart", brushstart)
	   	.on("brush", 	 brushmove)
	    .on("brushend", brushend);

	// add the brush
	var gBrush = svg.append("g")
		.attr("class", "brush")
		.call(brush);
		//.call(brush.event); // triggers the filter ***

	// set the height of the brush to that of the chart
	gBrush.selectAll("rect")
		.attr("height", 49)
		.attr("y", -50);
    
    
    //console.log('min: '+limitedMin+' max: '+maxDate);

    gBrush.call(brush.event);
    
	// ---------------------------- functions ------------------------------

    function computeMinDateFor(ads, min) {
        
        if (ads && ads.length) { 
            ads.sort(byField('-foundTs'));
            var subset = ads.slice(0, MAX_NUM_AT_START);
            return subset[subset.length-1].foundTs;
        }
        return min;
    }
    
	function runFilter(ext) {  
        
        log('vault.js::runFilter');
        
        if (ext[0] === gMin && ext[1] == gMax)
            return;

		if (gMax - gMin <= 1) return; // fix for gh #100
	
	    gMin = ext[0], gMax = ext[1];
        	
		var filtered = dateFilter(gMin, gMax);
	    gAdSets = createAdSets(filtered); // store
		doLayout(gAdSets);
	}

    function createAdSets(ads) {
    
        console.log('Vault-UI.createAdSets: '+ads.length+'/'+ gAds.length+' ads');
    
        var ad, hash = {}, adsets = [];
    
        // set hidden val for each ad
        for (var i=0, j = ads.length; i<j; i++) {
    
            ad = ads[i];
            
            key = computeHashKey(ad); 
            
            if (!key) continue;
            
            if (!hash[key]) {
    
                // new: add a hash entry
                hash[key] = new AdSet(ad);
                adsets.push(hash[key]);
            }
            else {
    
                // dup: add as child
                hash[key].add(ad);
            }
        }
    
        // sort by foundTs and limit to MAX_PER_SET
        if (true) {
            
            for (var i=0, j = adsets.length; i<j; i++) {
                
                adsets[i].children.sort(byField('-foundTs'));
                adsets[i].children = adsets[i].children.splice(0, MAX_PER_SET);
            }
        }
        
        return adsets;
    }

	function dateFilter(min, max) {

		//log('dateFilter: '+ads.length+' all, min='+formatDate(min)+', max='+formatDate(max));

		var filtered = [];

		for (var i=0, j = gAds.length; i<j; i++) { // NOTE: always need to start from full-set (all) here

			if (!(gAds[i].foundTs < min || gAds[i].foundTs > max)) {

                filtered.push(gAds[i]);
			}
		}

		//log('date-filter: '+filtered.length +' / '+ gAds.length);

		return filtered;
	}

	function brushstart() { }

	function brushmove() {
//log('brushmove');
		//runFilter(d3.event.target.extent()); // NOTE: may cause perf problems...
	}

	function brushend() {
log('brushend');
		//svg.classed("selecting", !d3.event.target.empty());
		runFilter(d3.event.target.extent());
	}

	function randomDate(start, end) {

	    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
	}
}
