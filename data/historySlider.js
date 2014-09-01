var currentAds, format = d3.time.format("%a %b %d %Y");

function historySlider(allAds) { // should happen just once

	console.log('historySlider:'+allAds.length);

	// ============= TODO: move to adview.html ==================
	currentAds = allAds;
	window.ads = allAds;
	var ads = window.ads.slice();
	// ====================================================

	// setting up the position of the chart:
	var margin = {top: 50, right: 20, bottom: 20, left: 20},
	    width = parseInt(d3.select("#left").style("width"), 10) - (margin.left + margin.right +100),
	    height = 0,
	    barw = 5, // individual bar width
	    barg = 1; // gap between individual bars

	  // dynamic time format function:
	var customTimeFormat = d3.time.format.multi([
	    [".%L", function(d) { return d.getMilliseconds(); }],
	    [":%S", function(d) { return d.getSeconds(); }],
	    ["%I:%M", function(d) { return d.getMinutes(); }],
	    ["%I %p", function(d) { return d.getHours(); }],
	    ["%a %d", function(d) { return d.getDay() && d.getDate() != 1; }],
	    ["%b %d", function(d) { return d.getDate() != 1; }],
	    ["%B", function(d) { return d.getMonth(); }],
	    ["%Y", function() { return true; }]
	]);

	  // finding the first and last ad:
	  var minDate = d3.min(ads, function(d) { return d.found; }),
	      maxDate = d3.max(ads, function(d) { return d.found; });

	  // mapping the scales:
	  var xScale = d3.time.scale()
	            .domain([minDate, maxDate])
	            .range([0, width]);

	  // create an array of dates:
	  var map = ads.map( function(d) { return parseInt(xScale(d.found)) })
	  console.log(map);

	  // setup the histogram layout:
	  var histogram = d3.layout.histogram()
	                  .bins(60) // how many groups? (should be dynamic, based on the data)
	                  //.bins(width/(barw-barg)) // how many groups
	                  (map)
	  console.log(histogram);

	  // setup the x axis
	  var xAxis = d3.svg.axis()
	      .scale(xScale)
	      .tickFormat(customTimeFormat)
	      .ticks(7);

	  // position the SVG
	  var svg = d3.select("#svgcon").append("svg")
	      .attr("width", width + margin.left + margin.right)
	      .attr("height", height + margin.top + margin.bottom)
	    .append("g")
	      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	  // append the x axis
	  svg.append("g")
	     .attr("class", "x axis")
	     .attr("transform", "translate(0," + height + ")")
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
			.extent([maxDate-(maxDate-minDate)/4, maxDate]); // brushing the latest 1/4

		// add the brush
		var gBrush = svg.append("g")
			.attr("class", "brush")
			.call(brush)
			.call(brush.event);

		// set the height of the brush to that of the chart
		gBrush.selectAll("rect")
				.attr("height", 40)
				.attr("y", -40);


	function runFilter() {

		var s = brush.extent(), min = s[0], max = s[1];
		var tmpAds = dateFilter(min, max);
		if (!arraysEqual(currentAds, tmpAds))
			updateAdview( currentAds = tmpAds);
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

		var ads = window.ads;

		//console.log('dateFilter: '+ads.length+' ads, min='+formatDate(min)+', max='+formatDate(max));

		var filtered = [];
		for (var i=0, j = ads.length; i<j; i++) {

			//ads[i].filtered = false;

			if (ads[i].found < min || ads[i].found > max) {

				//console.log(i+') filtered: '+formatDate(ads[i].found));
				//ads[i].filtered = true;
			}
			else {

				filtered.push(ads[i]);
			}
		}
		console.log('filter: in='+ads.length+' out='+filtered.length);

		return filtered;
	}


	function brushstart() {

		//svg.classed("selecting", true);
	}

	function brushmove() {

		runFilter(); // NOTE: may cause perf problems...
	}

	function brushend() {

		var ext = d3.event.target.extent();
		if (ext[1]-ext[0] <= 1) return; // fix for gh #100
		//svg.classed("selecting", !d3.event.target.empty());
		runFilter();
	}

	function sortAdsPerDay() {

		var ads = window.ads.slice();

		var dateToCount = {}, d, days, days = [];

		for (var i=0; i < ads.length; i++) {

			ads[i].found = new Date(2014, 1+Math.floor(Math.random()*11), 1+Math.floor(Math.random()*30));
		  	d = new Date(ads[i].found), // TESTING ONLY *******
		  	//d = new Date(randomDate(new Date(2014, 5, 5), new Date())),
		  	//d = new Date(2014, 5, 5+Math.floor(Math.random()*5));
		  	day = getDay(d);

		  if (!dateToCount[day])
		  	dateToCount[day] = [];

		  dateToCount[day].push(ads[i]);
		}

		var i=0, min=new Date(2099, 5, 5), max=new Date(1);
		for (var key in dateToCount) {

		   if (dateToCount.hasOwnProperty(key))

				var obj = dateToCount[key], day = new Date(key);

				days.push({
					id : i++,
					date :  format(day),
					ads : obj,
					count : obj.length
				});

				if (day < min)
					min = day;
				if (day > max)
					max = day;
		}

		return days;
	}

	function getDay(dateObj) {

		var month = (dateObj.getUTCMonth() + 1);
		var day = (dateObj.getUTCDate());
		var year = dateObj.getUTCFullYear();
		return year + "/" + month + "/" + day;
	}

	function randomDate(start, end) {
	    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
	}

}// end historySlider



function log(m) { console.log(m); }
