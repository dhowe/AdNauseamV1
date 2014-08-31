/*
 NEXT:
	Bars should be as wide as possible
	Add a couple of fake dates as ends of slider range??? but dont change count
	Implement and check clearAds()
 */
var currentAds, format = d3.time.format("%a %b %d %Y");

function historySlider(allAds) { // should happen just once

	//console.log('historySlider:'+allAds.length);

	// ============= TODO: move to adview.html ==================
	currentAds = allAds;

	// TMP: remove!!!
	for (var i=0; i < allAds.length; i++)
		allAds[i].found = new Date(2014, 5, 5+Math.floor(Math.random()*5));

	window.ads = allAds;
	var ads = window.ads.slice();
	// ====================================================

	var margin = {top: 0, right: 130, bottom: 0, left: 20},
	    width =  parseInt(d3.select("#left").style("width"), 10) - margin.left - margin.right,
	    height = 50 - margin.top - margin.bottom;

  	var amountFn = function(d) { return d.count },
  		dateFn = function(d) { return format.parse(d.date) }

  	var padding = 0;
  	var ts = d3.time.scale();
  	//ts.ticks(d3.time.minute, 15);
  	var x = ts.range([padding, width-padding])

  	var y = d3.scale.linear()
    	.range([10, height-20])

	var brush = d3.svg.brush()
	    .x(x)
	    .extent([x.invert(padding), x.invert(width-padding)])
	    .on("brushstart", brushstart)
	    .on("brush", brushmove)
	    .on("brushend", brushend);

	// No need for this one:
	// var arc = d3.svg.arc()
	//     .outerRadius(height / 2)
	//     .startAngle(0)
	//     .endAngle(function(d, i) { return i ? -Math.PI : Math.PI; });

	var svg = d3.select("#svgcon").append("svg")
	    .attr("width", width + margin.left + margin.right)
	    .attr("height", height + margin.top + margin.bottom)
	  	.append("g").attr("transform", "translate(" + margin.left + ","+margin.top + ")");

	//var axis = d3.svg.axis().scale(ts)
	var axis = d3.svg.axis().scale(x).tickSize(50).tickSubdivide(true);
	    //.tickValues([x.invert(10),x.invert(200),x.invert(400)]);
	    //.tickValues([1, 2, 3, 5, 8, 13, 21]);

	svg.append("g")
		.attr("class", "axis")
    	.attr("transform", "translate(0,30)")
    	.call(axis);

	// a single div to hold tooltip info for rects
	var tt = d3.select("body").append("div")
    	.attr("class", "tooltip")
    	.style("opacity", 0);

	var brushg = svg.append("g")
	    .attr("class", "brush")
	    .call(brush);

	// define the handles
	brushg.selectAll(".resize rect")
			.attr("height", height)
			.attr("width", 2)
			.attr("x", 0)
			.attr("fill", "#ccc")
			.attr("stroke-width",0)
			.attr("style", "visibility: visible");

	// set the height of the draggable scope
	brushg.selectAll("rect.extent")
			.attr("height", height)

	// these ones only for getting a wider hit area
	brushg.selectAll(".resize").append("rect")
				.attr("width", 10)
				.attr("x", -5)
				.attr("height", height )
				.attr("style", "visibility: hidden");

	//brushg.on("mousedown", function(){  });


	// Shadow ---------------------------------------

	var defs = svg.append("defs");

	var filter = defs.append("filter")
			.attr("id", "drop-shadow")

	filter.append("feGaussianBlur")
			.attr("in", "SourceAlpha")
			.attr("stdDeviation", 0)
			.attr("result", "blur");

	filter.append("feOffset")
			.attr("in", "blur")
			.attr("dx", 1)
			.attr("dy", 0)
			.attr("result", "offsetBlur");

	var feMerge = filter.append("feMerge");

	feMerge.append("feMergeNode")
			.attr("in", "offsetBlur")
	feMerge.append("feMergeNode")
			.attr("in", "SourceGraphic");

// End Shadow -----------------------------------

	// refreshSlider(ads);

	var data = sortAdsPerDay();

  	var ext = d3.extent(data, dateFn);
  	x.domain(ext);
  	y.domain(d3.extent(data, amountFn));

	//console.log('min='+ext[0]+' max='+ext[1]);

	var rects = svg.append("g")
		.attr("class", "bars")
		.selectAll("rect")
	    .data(data)
	    .enter().append("rect")
	  	.on("mouseover", function(d) {

	  		// create tooltip for history slider

			tt.html(d.date+"<br/>"+d.count+" Ad(s) found")
	    		.style("left", (d3.event.pageX) + "px")
	    		.style("top", (d3.event.pageY - 28) + "px");

			tt.transition()
	    		.duration(200)
	    		.style("opacity", .9);
		})
        .on("mouseout", function(d) {

        	// remove tooltip for history slider

            tt.transition()
                .duration(500)
                .style("opacity", 0)
        })
	  	.attr({
		  width: 5,
		  height: function(d) { return y(amountFn(d)) },
		  x: function(d) { return x( dateFn(d) ) },
		  y: 10
	});

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
