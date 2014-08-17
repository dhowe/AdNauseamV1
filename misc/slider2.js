$(document).ready(slider);

var format = d3.time.format("%a %b %d %Y")

function sortAdsPerDay(ads) {

	var dateToCount = {}, d, days, days = [];
	
	for (var i=0; i < ads.length; i++) {
		
	  //d = new Date(ads[i].found), // TESTING ONLY
	  d = new Date(randomDate(new Date(2014, 5, 5), new Date())), 
	  	day = getDay(d);
	  //log(i+') checking: '+day + ' :: '+d);
	  
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
	
	//log('min = '+formatDate(min));
	//log('max = '+formatDate(max));

	return days;
}

// NEXT: start using actual date (figure out date-format funcs)

function slider() {

	var data = sortAdsPerDay(ads); 
	/*log(data[0]);

	var datax = [
	  { "id": 3, "date": "Sun May 05 2013", "count": 12000},
	  { "id": 1, "date": "Mon May 13 2013", "count": 2000},
	  { "id": 2, "date": "Thu Jun 06 2013", "count": 17000},
	  { "id": 4, "date": "Thu May 09 2013", "count": 15000},
	  { "id": 5, "date": "Mon Jun 01 2013", "count": 16000},
	  { "id": 6, "date": "Sun May 04 2013", "count": 1000},
	  { "id": 7, "date": "Mon May 23 2013", "count": 22000},
	  { "id": 8, "date": "Thu Jun 16 2013", "count": 27000},
	  { "id": 9, "date": "Thu May 29 2013", "count": 15500},
	  { "id": 0, "date": "Mon Jun 31 2013", "count": 16050}
	]
	log(data[0]);
	for (var i=0; i < data.length; i++) 
	  log(i+") "+data[i].date+" -> "+data[i].count);*/
	
	var margin = { top: 0, right: 130, bottom: 0, left: 20 },
	    width =  parseInt(d3.select("#left").style("width"), 10) - margin.left - margin.right,
	    height = 50 - margin.top - margin.bottom;

	//var data = JSONData.slice()
  	var amountFn = function(d) { return d.count }
  	var dateFn = function(d) { return format.parse(d.date) }
  	
  	var x = d3.time.scale()
   		.range([0, width])
    	.domain(d3.extent(data, dateFn))

  	var y = d3.scale.linear()
    	.range([10, height-20])
    	.domain(d3.extent(data, amountFn))
  
	var svg = d3.select("#stats").append("svg")
	    .attr("width", width + margin.left + margin.right)
	    .attr("height", height + margin.top + margin.bottom)
		.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")")
		//.style("filter", "url(#drop-shadow)");
		
 	/*svg.selectAll("rect").data(data).enter()
   		.append("svg:rect")
		.attr('class', 'bars')
		.attr({
		  width: 5,
		  height: function(d) { return y(amountFn(d)) },
		  x: function(d) { return x( dateFn(d) ) },
		  y: 10
	});*/
	
	var rect = svg.append('g')
		.attr('class', 'bars')
		.selectAll('rect')
	    .data(data)
	  .enter().append('rect').attr({
		  width: 5,
		  height: function(d) { return y(amountFn(d)) },
		  x: function(d) { return x( dateFn(d) ) },
		  y: 10
	})
	  
	var brush = d3.svg.brush()
			.x(x)
			.extent([.3, .5])
			.on("brushstart", brushstart)
			.on("brush", 	 brushmove)
			.on("brushend", brushend);
			
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

	//these ones only for getting a widder hit area
	brushg.selectAll(".resize").append("rect")
				.attr("width", 10)
				.attr("x", -5)
				.attr("height", height )
				.attr("style", "visibility: hidden"); 
				
	brushstart();
	brushmove();

	function brushstart() {
	  svg.classed("selecting", true);
	}

	function brushmove() {
	  var s = brush.extent();
	  rect.classed("selected", function(d) { return s[0] <= d && d <= s[1]; });
	}

	function brushend() {
	  svg.classed("selecting", !d3.event.target.empty());
	}	
	
	
	// define black drop shadow
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

function log(m) { console.log(m); }
