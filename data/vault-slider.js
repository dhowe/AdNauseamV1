 /*global log, d3, byField, doLayout, createAdSets, computeStats */

var gAds, gAdSets, gMin, gMax; // stateful

const margin = { top: 50, right: 40, bottom: 20, left: 20 },
    format = d3.time.format("%a %b %d %Y"), MaxStartNum = 400;

// TODO: need to verify that at least one full bar is showing
const customTimeFormat = d3.time.format.multi([
        [".%L", function(d)     { return d.getMilliseconds(); }],
        [":%S", function(d)     { return d.getSeconds(); }],
        ["%I:%M", function(d)   { return d.getMinutes(); }],
        ["%I %p", function(d)   { return d.getHours(); }],
        ["%a %d", function(d)   { return d.getDay() && d.getDate() != 1; }],
        ["%b %d", function(d)   { return d.getDate() != 1; }],
        ["%B", function(d)      { return d.getMonth(); }],
        ["%Y", function()       { return true; }]
]);

function createSlider(relayout) {

    //log('Vault-Slider.createSlider: '+gAds.length);
    
    if (!gAds) return;

    // clear all the old svg
    d3.select("g.parent").selectAll("*").remove();
    d3.select("svg").remove();

	// setting up the position of the chart
	var iconW = 100, width;
	
	try {
	
	   width = parseInt( d3.select("#stage").style("width") ) - 
	       (margin.left + margin.right + iconW);
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
   var map = gAds.map( function(d) { return parseInt(xScale(d.foundTs)); });

   // setup the histogram layout
   var histogram = d3.layout.histogram()
      .bins(120) // how many groups? [dyn] base on width
      //.bins(width/(barw-barg))     [dyn]
      (map);

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
       .call(xAxis);

   var barw = histogram[0].dx - 1; //relative width

   // Create groups for the bars
   var bars = svg.selectAll(".bar")
       .data(histogram)
       .enter()
       .append("g");

	bars.append("line")
       .attr("x1", function(d) { return d.x + barw/2; })
       .attr("y1", - 2 )
       .attr("x2", function(d) { return d.x + barw/2; })
       .attr("y2", function(d) { return d.y*-3 - 2; })
       .attr("style", "stroke-width:" + barw + "; stroke-dasharray: 2,1; stroke: #ccc");

	// setup the brush
	var bExtent = [ computeMinDateFor(gAds, minDate), maxDate ],
        brush = d3.svg.brush()
		.x(xScale)
		.extent(bExtent)
	    .on("brushend", brushend);

	// add the brush
	var gBrush = svg.append("g")
		.attr("class", "brush")
		.call(brush);

	// set the height of the brush to that of the chart
	gBrush.selectAll("rect")
		.attr("height", 49)
		.attr("y", -50);
    
    // cases: 1) no-gAdSets=first time, 2) filter+layout, 3) only-slider
    var fSets = runFilter(bExtent);
    if (relayout) 
        doLayout(fSets);
    else
        computeStats(fSets);      

    
	// ---------------------------- functions ------------------------------
	
    
    // this is called on a brushend and on createSlider
	function runFilter(ext) {
        
        //log('vault.js::runFilter: '+ext[0]+","+ext[1]);
        
        //if (ext[0] !== gMin || ext[1] !== gMax) { // dont rebuild

	    gMin = ext[0], gMax = ext[1];
	    
        if (gMax - gMin <= 1) return; // fix for gh #100
        	
		var filtered = dateFilter(gMin, gMax);
		
		// only create the adsets once, else filter
		if (!gAdSets) 
            return (gAdSets = createAdSets(filtered));
		else 
            return filterAdSets(filtered);            
	}

    function filterAdSets(ads) {

        //log('vault-slider.filterAdSets: '+ads.length+'/'+ gAds.length+' ads');
        
        var sets = [];
        for (var i=0, j = ads.length; i<j; i++) {
    
            for (var k=0, l = gAdSets.length; k<l; k++) {
                
                if (gAdSets[k].childIdxForId(ads[i].id) > -1) {
                    
                    if (sets.indexOf(gAdSets[k]) < 0)
                        sets.push(gAdSets[k]);
                }
            }
        }
        
        return sets;
    }

    function computeMinDateFor(ads, min) {
        
        if (ads && ads.length) { 
            
            ads.sort(byField('-foundTs')); // or slice?
            var subset = ads.slice(0, MaxStartNum);
            return subset[subset.length-1].foundTs;
        }
        return min;
    }
    
	function dateFilter(min, max) {

		//log('dateFilter: min='+min+', max='+max);

		var filtered = [];

		for (var i=0, j = gAds.length; i<j; i++) { // NOTE: always need to start from full-set (all) here

			if (!(gAds[i].foundTs < min || gAds[i].foundTs > max)) {

                filtered.push(gAds[i]);
			}
		}

		return filtered;
	}

	function brushstart() { }

	function brushmove() { }

	function brushend() {

        doLayout(runFilter(d3.event.target.extent()));
	}
}
