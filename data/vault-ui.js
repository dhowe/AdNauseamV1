var xAxis, all, format = d3.time.format("%a %b %d %Y");
var inspectorData, inspectorIdx, animatorId, pack, container, animateMs=2000;
var zoomStyle, zoomIdx = 0, resizing = false, zooms = [ 100, /*75,*/ 50, 25, 12.5, 6.25 ];

function createSlider(ads) { // should happen just once

	var all = ads.slice();
	
	console.log("createSlider(once-only): "+ads.length);
	//sliderCreated = true;

	// setting up the position of the chart:
	var margin = { top: 50, right: 40, bottom: 20, left: 20 },
	    width = parseInt(d3.select("#left").style("width"), 10)
	    - (margin.left + margin.right +100),
	    barw = 3, // individual bar width
	    barg = 1; // gap between individual bars

	// dynamic time format function:
	var customTimeFormat = d3.time.format.multi([
	    [".%L", function(d) 	{ return d.getMilliseconds(); }],
	    [":%S", function(d) 	{ return d.getSeconds(); }],
	    ["%I:%M", function(d) 	{ return d.getMinutes(); }],
	    ["%I %p", function(d) 	{ return d.getHours(); }],
	    ["%a %d", function(d) 	{ return d.getDay() && d.getDate() != 1; }],
	    ["%b %d", function(d) 	{ return d.getDate() != 1; }],
	    ["%B", function(d) 		{ return d.getMonth(); }],
	    ["%Y", function() 		{ return true; }]
	]);

  	// finding the first and last ad:
	var minDate = d3.min(ads, function(d) { return d.foundTs; }),
		maxDate = d3.max(ads, function(d) { return d.foundTs; });

   // mapping the scales:
   var xScale = d3.time.scale()
	            .domain([minDate, maxDate])
	            .range([0, width]);

   // create an array of dates:
   var map = ads.map( function(d) { return parseInt(xScale(d.foundTs)) })

   // setup the histogram layout:
   var histogram = d3.layout.histogram()
      .bins(120) // how many groups? (should be dynamic, based on the data)
      //.bins(width/(barw-barg))
      (map)

   //log(histogram);

   // setup the x axis
   xAxis = d3.svg.axis()
	      .scale(xScale)
	      .tickFormat(customTimeFormat)
	      .ticks(7);

   // position the SVG
   var svg = d3.select("#svgcon").append("svg")
	    .attr("width", width + margin.left + margin.right)
	    .attr("height", /*height +*/ margin.top + margin.bottom)
	    .append("g")
	    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

   // append the x axis
   svg.append("g")
       .attr("class", "x axis")
	     //.attr("transform", "translate(0," + height + ")")
       .call(xAxis);

   var barw = histogram[0].dx-1; //relative width (it's the same on)

   //Create groups for the bars
   var bars = svg.selectAll(".bar")
       .data(histogram)
       .enter()
       .append("g")

	// we could go with rectangular bars
	bars.append("rect")
       .attr("x", function(d) { return d.x })
       .attr("y", function(d) { return d.y*-3 - 1})
       .attr("width", barw )
       .attr("height", function(d) { if (d.y > 0) { return d.y*3 - 1 } else { return 0} })
       .attr("style", "fill: #000;stroke: #000;stroke-width: 2;")

	// or use lines which can also offer a stroke-dasharray
	bars.append("line")
       .attr("x1", function(d) { return d.x + barw/2 })
       .attr("y1", - 2 )
       .attr("x2", function(d) { return d.x + barw/2 })
       .attr("y2", function(d) { return d.y*-3 - 2})
       .attr("style", "stroke-width:" + barw + "; stroke-dasharray: 2,1; stroke: #ccc")

	// setup the brush
	var brush = d3.svg.brush()
		.x(xScale)
		.extent([minDate, maxDate])
	    .on("brushstart", brushstart)
	   	.on("brush", 	 brushmove)
	    .on("brushend", brushend);

	// add the brush
	var gBrush = svg.append("g")
		.attr("class", "brush")
		.call(brush)
		.call(brush.event); // triggers the filter

	// set the height of the brush to that of the chart
	gBrush.selectAll("rect")
		.attr("height", 39)
		.attr("y", -40);

	// ---------------------------- functions ------------------------------

	function runFilter(ext) {

		var tmpAds, min = ext[0], max =ext[1];
		if (max - min <= 1) return; // fix for gh #100
		tmpAds = dateFilter(min, max);
		if (!arraysEqual(ads, tmpAds))
			createHtml(ads = tmpAds);
	}

	function arraysEqual(a, b) {

		a.sort();
		b.sort();

		if (a === b)
			return true;

		if (a == null || b == null)
			return false;

		if (a.length != b.length)
			return false;

		// If you don't care about the order of the elements inside
		// the array, you should sort both arrays here.

		for (var i = 0; i < a.length; ++i) {

			if (a[i] !== b[i])
				return false;
		}
		return true;
	}

	function dateFilter(min, max) {

		//log('dateFilter: '+ads.length+' ads, min='+formatDate(min)+', max='+formatDate(max));

		var filtered = [], ads = all.slice(); // need to start from full-set here
		
		for (var i=0, j = ads.length; i<j; i++) {

			//ads[i].filtered = false;

			if (ads[i].foundTs < min || ads[i].foundTs > max) {

				//log('ad#'+ads[i].id+' filtered: '+formatDate(ads[i].foundTs));
			}
			else {

				filtered.push(ads[i]);
			}
		}
		log('filter: in='+ads.length+' out='+filtered.length);

		return filtered;
	}


	function brushstart() {

		//svg.classed("selecting", true);
	}

	function brushmove() {

		runFilter(d3.event.target.extent()); // NOTE: may cause perf problems...
	}

	function brushend() {

		//svg.classed("selecting", !d3.event.target.empty());
		runFilter(d3.event.target.extent());
	}

	function randomDate(start, end) {
	    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
	}
}


function log(m) { console.log(m); }
