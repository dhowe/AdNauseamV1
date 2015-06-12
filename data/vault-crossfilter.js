console.log('!!! CROSS-FILTER');

var CHART_WIDTH = 800;


function createSlider() {
	//createAdSets(gAds);
	console.log('!!! createSlider');


	vaultCrossfilter();
}

function vaultCrossfilter() {



	
	if(typeof crossfilter==='function') {	

	gAdSets = createAdSets(gAds);
	doLayout(filterAdSets(gAds));

		this._dimensions = [];
		this._charts = [];
		console.log('gAds crossfilter', gAds, crossfilter);
		this.crossfilter = crossfilter(gAds);
		this.groupAll = this.crossfilter.groupAll();
	}


	addDimenssion(function(d) {
	      var matches = d.pageUrl.match(/^https?\:\/\/([^\/?#]+)(?:[\/?#]|$)/i);
	      var domain = matches && matches[1]; 
	      return domain; 
	});

	addDimenssion(function(d) {
	      var matches = d.targetUrl.match(/^https?\:\/\/([^\/?#]+)(?:[\/?#]|$)/i);
	      var domain = matches && matches[1]; 
	      return domain; 
	});


	addDimenssion(function(d) {
	    return new Date(d.foundTs);
	});


	function addDimenssion(accessor) {
	    var dimension = {};
	    // take first value as sample
	    var n = [gAds[0]].map(accessor)[0]; //TODO better ways to get this
	    console.log('n',n);
	    dimension.dim = this.crossfilter.dimension(accessor);
	    dimension.group = dimension.dim.group();
	    dimension.min = d3.min(gAds, accessor);
	    dimension.max = d3.max(gAds, accessor);
	    
	    // check if first value is an integer
	    if(!isNaN(parseFloat(n)) && isFinite(n))
	    {
	      var range = dimension.max - dimension.min;
	      dimension.chart = barChart()
	        .dimension(dimension.dim)
	        .group(dimension.group)
	        .x(d3.scale.linear()
	        //.domain([parseFloat(dimension.min), parseFloat(dimension.max)])//+range*.1])
	        .domain([parseFloat(dimension.min), parseFloat(dimension.max)+range*.1])
	        .range([0, CHART_WIDTH]));
	    }
	    else if (n instanceof Date) {

	      dimension.chart = barChart()
	        .dimension(dimension.dim)
	        .group(dimension.group)
	        .x(d3.time.scale()
	        	.domain([dimension.min, dimension.max])
	        	.range([0, CHART_WIDTH]));

	    }
	    else {
	      var domain = dimension.group.top(Infinity).map(function(item) {return item.key} );
	      console.log('domain', domain);
	      dimension.chart = barChart()
	        .dimension(dimension.dim)
	        .group(dimension.group)
	        .x(d3.scale.ordinal()
	        	.domain(domain)
	        	.rangeRoundPoints([0, CHART_WIDTH]));
	    }
	    this._dimensions.push(dimension);
	    this._charts.push(dimension.chart);	
	};

/*this.selectedLabels.forEach(function(attr) {

     
}
*/
// this._dimensions.forEach(function(dimension) {
//     // if there is a range set as an attribute for this dimension, apply it!
//     var preSetRange = this.selectedRanges[dimension.chart.id()];
//     if(preSetRange) {
//       dimension.chart.filter(preSetRange);
//     }
// }.bind(this));
var charts = [];

var i = 0;

//setTimeout(function() {
  setupCharts(this, charts);
  
//}.bind(this),200);
function setupCharts(self) {
  var chartDivs = document.querySelectorAll('.svg-container');
  charts = d3.selectAll(chartDivs);
        
  charts.data(self._charts);
  // remoe the svgs to force recreation of charts. the selection stays (by selectedRanges)
  charts.selectAll('svg').remove();      
  
  charts.each(function(chart) { chart.on("brush", renderAll).on("brushend", renderAll); });
  
  charts.each(render);
}
function render(method) {
  d3.select(this).call(method);
}
function renderAll() {
    charts.each(render);
}
function barChart() {
    if (!barChart.id) barChart.id = 0;
    var margin = {top: 10, right: 10, bottom: 20, left: 10},
        x,
        y = d3.scale.linear().range([100, 0]),
        id = barChart.id++,
        axis = d3.svg.axis().orient("bottom"),
        brush = d3.svg.brush(),
        brushDirty,
        dimension,
        group,
        round;
    function chart(div, init) {
      var range = x.range(),
          width = range[range.length-1],
          height = y.range()[0];
      y.domain([0, group.top(1)[0].value]);
      div.each(function() {
        var div = d3.select(this),
            g = div.select("g");
        if(g, init)
        {
          g.remove();
        }
        // Create the skeletal chart.
        if (g.empty()) {
          div.select(".title").append("a")
              .attr("href", "javascript:reset(" + id + ")")
              .attr("class", "reset")
              .text("reset")
              .style("display", "none");
          g = div.append("svg")
              .attr("width", width + margin.left + margin.right)
              .attr("height", height + margin.top + margin.bottom)
            .append("g")
              .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
          g.append("clipPath")
              .attr("id", "clip-" + id)
            .append("rect")
              .attr("width", width)
              .attr("height", height);
          g.selectAll(".bar")
              .data(["background", "foreground"])
            .enter().append("path")
              .attr("class", function(d) { return d + " bar"; })
              .datum(group.all());
          g.selectAll(".foreground.bar")
              .attr("clip-path", "url(#clip-" + id + ")");
          g.append("g")
              .attr("class", "axis")
              .attr("transform", "translate(0," + height + ")")
              .call(axis);
          // Initialize the brush component with pretty resize handles.
          var gBrush = g.append("g").attr("class", "brush").call(brush);
          gBrush.selectAll("rect").attr("height", height);
          gBrush.selectAll(".resize").append("path").attr("d", resizePath);
        }
        // Only redraw the brush if set externally.
        if (brushDirty) {
          brushDirty = false;
          g.selectAll(".brush").call(brush);
          //div.select(".title a").style("display", brush.empty() ? "none" : null);
          if (brush.empty()) {
            g.selectAll("#clip-" + id + " rect")
                .attr("x", 0)
                .attr("width", width);
          } else {
            var extent = brush.extent();
            g.selectAll("#clip-" + id + " rect")
                .attr("x", x(extent[0]))
                .attr("width", x(extent[1]) - x(extent[0]));
          }
        }
        g.selectAll(".bar").attr("d", barPath);
      });
      function barPath(groups) {
        var path = [],
            i = -1,
            n = groups.length,
            d;
        while (++i < n) {
          d = groups[i];
          path.push("M", x(d.key), ",", height, "V", y(d.value), "h9V", height);
        }
        return path.join("");
      }
      function resizePath(d) {
        var e = +(d == "e"),
            x = e ? 1 : -1,
            y = height / 3;
        return "M" + (.5 * x) + "," + y
            + "A6,6 0 0 " + e + " " + (6.5 * x) + "," + (y + 6)
            + "V" + (2 * y - 6)
            + "A6,6 0 0 " + e + " " + (.5 * x) + "," + (2 * y)
            + "Z"
            + "M" + (2.5 * x) + "," + (y + 8)
            + "V" + (2 * y - 8)
            + "M" + (4.5 * x) + "," + (y + 8)
            + "V" + (2 * y - 8);
      }
    }
    //end chart
    brush.on("brush.chart", function() {
      
      var g = d3.select(this.parentNode),
          extent = brush.extent();
      if (round) g.select(".brush")
          .call(brush.extent(extent = extent.map(round)))
        .selectAll(".resize")
          .style("display", null);
      // if x scale has rangePints function (x is ordinal) find selection for ordinal scale
      if(typeof x.rangePoints === "function") {
        var ordinalSelection =  x.domain().filter(function(d){return (brush.extent()[0] <= x(d)) && (x(d) <= brush.extent()[1])}); 
        if(ordinalSelection.length===0) {
          return;
        }
        extent = [ordinalSelection[0], ordinalSelection[ordinalSelection.length-1]];
        //use filter function to filter when ordinal
        dimension.filterFunction(function(d) {
          return ordinalSelection.indexOf(d) > -1;
        });
        //TODO clip is slightly off not higlighting when partially selected, but it passes the partially selected value
      }
      else {
        dimension.filterRange(extent);
      }
      g.select("#clip-" + id + " rect")
          .attr("x", x(extent[0]))
          .attr("width", x(extent[1]) - x(extent[0]));
      
      //self.selectedRanges[id] = extent;
      var filtered = dimension.top(Infinity);
      doLayout(filterAdSets(filtered));
    });
    brush.on("brushend.chart", function() {
      if (brush.empty()) {
        var div = d3.select(this.parentNode.parentNode.parentNode);
        div.select("#clip-" + id + " rect").attr("x", null).attr("width", "100%");
        // clear dimension filters
        dimension.filterAll();
        //chart.filter();
        // clear selected ranges
        //self.selectedRanges[id] = null;
        // recalculate output
	      var filtered = dimension.top(Infinity);
       doLayout(filterAdSets(filtered));

      }
    });
    chart.id = function(_) {
      if (!arguments.length) return id;
      id = _;
      return chart;
    };
    chart.margin = function(_) {
      if (!arguments.length) return margin;
      margin = _;
      return chart;
    };
    chart.x = function(_) {
      if (!arguments.length) return x;
      x = _;
      axis.scale(x);
      brush.x(x);
      return chart;
    };
    chart.y = function(_) {
      if (!arguments.length) return y;
      y = _;
      return chart;
    };
    chart.dimension = function(_) {
      if (!arguments.length) return dimension;
      dimension = _;
      return chart;
    };
    chart.filter = function(_) {
      if (_) {
        brush.extent(_);
        dimension.filterRange(_);
        self.output = dimension.top(Infinity);
      } else {
        brush.clear();
        dimension.filterAll();
      }
      brushDirty = true;
      return chart;
    };
    chart.group = function(_) {
      if (!arguments.length) return group;
      group = _;
      return chart;
    };
    chart.round = function(_) {
      if (!arguments.length) return round;
      round = _;
      return chart;
    };
    return d3.rebind(chart, brush, "on");
  }


   function filterAdSets(ads) {

        //log('vault-slider.filterAdSets: '+ads.length+'/'+ gAds.length+' ads');
        console.log(ads);
        
        var sets = [];
        for (var i=0, j = ads.length; i<j; i++) {
        		//console.log(ads[i])
    
            for (var k=0, l = gAdSets.length; k<l; k++) {
                
                if (gAdSets[k].childIdxForId(ads[i].id) > -1) {
                    
                    if (sets.indexOf(gAdSets[k]) < 0)
                        sets.push(gAdSets[k]);
                }
            }
        }

        gAdSets =sets;
        
        return sets;
    }

}