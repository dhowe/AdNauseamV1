$(document).ready(slider);

function slider() {
	var data = d3.range(800).map(Math.random);

	var margin = {top: 0, right: 130, bottom: 0, left: 20},
	    width =  parseInt(d3.select("#left").style("width"), 10) - margin.left - margin.right,
	    height = 50 - margin.top - margin.bottom;

	var x = d3.scale.linear()
	    .range([0, width]);

	var y = d3.random.normal(height / 2, height / 8);

	var brush = d3.svg.brush()
	    .x(x)
	    .extent([.3, .5])
	    .on("brushstart", brushstart)
	    .on("brush", brushmove)
	    .on("brushend", brushend);

	var arc = d3.svg.arc()
	    .outerRadius(height / 2)
	    .startAngle(0)
	    .endAngle(function(d, i) { return i ? -Math.PI : Math.PI; });

	var svg = d3.select("#stats").append("svg")
	    .attr("width", width + margin.left + margin.right)
	    .attr("height", height + margin.top + margin.bottom)
	  .append("g")
	    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	svg.append("g")
	    .attr("class", "x axis")
	    .attr("transform", "translate(0," + height + ")")
	    .call(d3.svg.axis().scale(x).orient("bottom"));

	var rect = svg.append("g").selectAll("rect")
	    .data(data)
	  .enter().append("rect")
			.attr("x", function(d) { return x(d) })
			.attr("y", function(d) { return y(d) })
			.attr("width", 2)
			.attr("height", function(d) { return height - y(d) })

	var brushg = svg.append("g")
	    .attr("class", "brush")
	    .call(brush);

	brushg.selectAll(".resize").append("path")
	    .attr("transform", "translate(0," +  height / 2 + ")")
			// .attr("width", 2)
			// .attr("height", height )

	    .attr("d", arc);

	brushg.selectAll("rect")
	    .attr("height", height);

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
}
