// TODO consider forming a Graph object or integrate with backbone
document.onload = (function(d3, saveAs, Blob, undefined){
  "use strict";

  /** PREP **/
  var consts = {
    selectedClass: "selected",
    connectClass: "connect-node",
    circleGClass: "conceptG",
    graphClass: "graph",
    activeEditId: "active-editing",
    BACKSPACE_KEY: 8,
    DELETE_KEY: 46,
    ENTER_KEY: 13,
    nodeRadius: 50
  };

  var state = {
    selectedNode: null,
    selectedEdge: null,
    mouseDownNode: null,
    mouseDownLink: null,
    justDragged: false,
    justScaleTransGraph: false,
    lastKeyDown: -1,
    shiftNodeDrag: false,
    selectedText: null
  };

  var docEl = document.documentElement,
      bodyEl = document.getElementsByTagName('body')[0];
  
  var width = window.innerWidth || docEl.clientWidth || bodyEl.clientWidth,
      height =  window.innerHeight|| docEl.clientHeight|| bodyEl.clientHeight;

  var xLoc = width/2 - consts.nodeRadius/2,
      yLoc = 100;

  // initial node data
  var idct = 0;
  var nodes = [{title: "new concept", id: idct++, x: xLoc, y: yLoc},
               {title: "new concept", id: idct++, x: xLoc, y: yLoc + consts.nodeRadius*4}];
  var edges = [{source: nodes[1], target: nodes[0]}];


  /** MAIN SVG **/
  var svg = d3.select("body").append("svg")
        .attr("width", width)
        .attr("height", height);
  
  // define arrow markers for graph links
  var defs = svg.append('svg:defs');
  defs.append('svg:marker')
    .attr('id', 'end-arrow')
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', "32")
    .attr('markerWidth', 3.5)
    .attr('markerHeight', 3.5)
    .attr('orient', 'auto')
    .append('svg:path')
    .attr('d', 'M0,-5L10,0L0,5');

  // define arrow markers for leading arrow
  defs.append('svg:marker')
    .attr('id', 'mark-end-arrow')
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 0)
    .attr('markerWidth', 3.5)
    .attr('markerHeight', 3.5)
    .attr('orient', 'auto')
    .append('svg:path')
    .attr('d', 'M0,-5L10,0L0,5');

  var svgG = svg.append("g")
               .classed(consts.graphClass, true);

  // displayed when dragging between nodes
  var dragLine = svgG.append('svg:path')
        .attr('class', 'link dragline hidden')
        .attr('d', 'M0,0L0,0')
        .style('marker-end', 'url(#mark-end-arrow)');

  // svg nodes and edges 
  var paths = svgG.append("g").selectAll("g"),
      circles = svgG.append("g").selectAll("g");
  
  var drag = d3.behavior.drag()
        .origin(function(d){
          return {x: d.x, y: d.y};
        })
        .on("drag", function(args){
          state.justDragged = true;
          dragmove.call(this, args);
        })
        .on("dragend", function() {
          // todo check if edge-mode is selected
        });

  function dragmove(d) {
    if (state.shiftNodeDrag){
      dragLine.attr('d', 'M' + d.x + ',' + d.y + 'L' + d3.mouse(svgG.node())[0] + ',' + d3.mouse(svgG.node())[1]);
    } else{
      d.x += d3.event.dx;
      d.y +=  d3.event.dy;
      updateGraph();
    }
  }

  function deleteGraph(skipPrompt){
    var doDelete = true;
    if (!skipPrompt){
      doDelete = window.confirm("Press OK to delete this graph");
    }
    nodes = [];
    edges = [];
    updateGraph();
  }

  /* select all text in element: taken from http://stackoverflow.com/questions/6139107/programatically-select-text-in-a-contenteditable-html-element */
  function selectElementContents(el) {
    var range = document.createRange();
    range.selectNodeContents(el);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  /* insert svg line breaks: taken from http://stackoverflow.com/questions/13241475/how-do-i-include-newlines-in-labels-in-d3-charts */
  var insertTitleLinebreaks = function (gEl, title) {
    var words = title.split(/\s+/g),
        nwords = words.length;
    var el = gEl.append("text")
          .attr("text-anchor","middle")
          .attr("dy", "-" + (nwords-1)*7.5);

    for (var i = 0; i < words.length; i++) {
        var tspan = el.append('tspan').text(words[i]);
        if (i > 0)
            tspan.attr('x', 0).attr('dy', '15');
    }
  };
  
  // remove edges associated with a node
  function spliceLinksForNode(node) {
    var toSplice = edges.filter(function(l) {
      return (l.source === node || l.target === node);
    });
    toSplice.map(function(l) {
      edges.splice(edges.indexOf(l), 1);
    });
  }

  function replaceSelectEdge(d3Path, edgeData){
    d3Path.classed(consts.selectedClass, true);
    if (state.selectedEdge){
      removeSelectFromEdge();
    }
    state.selectedEdge = edgeData;
  }

  function replaceSelectNode(d3Node, nodeData){
    d3Node.classed(consts.selectedClass, true);
    if (state.selectedNode){
      removeSelectFromNode();
    }
    state.selectedNode = nodeData;
  }
  
  function removeSelectFromNode(){
    circles.filter(function(cd){
      return cd.id === state.selectedNode.id;
    }).classed(consts.selectedClass, false);
    state.selectedNode = null;
  }

  function removeSelectFromEdge(){
    paths.filter(function(cd){
      return cd === state.selectedEdge;
    }).classed(consts.selectedClass, false);
    state.selectedEdge = null;
  }

  function pathMouseDown(d){
    d3.event.stopPropagation();
    state.mouseDownLink = d;
    var d3this = d3.select(this);

    if (state.selectedNode){
      removeSelectFromNode();
    }
    
    var prevEdge = state.selectedEdge;  
    if (!prevEdge || prevEdge !== d){
      replaceSelectEdge(d3this, d);
    } else{
      removeSelectFromEdge();
    }
  }

  // mousedown on node
  function circleMouseDown(d){
    d3.event.stopPropagation();
    state.mouseDownNode = d;
    if (d3.event.shiftKey){
      state.shiftNodeDrag = d3.event.shiftKey;
      // reposition dragged directed edge
      dragLine.classed('hidden', false)
        .attr('d', 'M' + d.x + ',' + d.y + 'L' + d.x + ',' + d.y);
      return;
    }
  }

  // mouseup on nodes
  function circleMouseUp(d){
    // reset the states
    state.shiftNodeDrag = false;
    var d3this = d3.select(this);
    d3this.classed(consts.connectClass, false);
    
    var mouseDownNode = state.mouseDownNode;
    
    if (!mouseDownNode) return;

    dragLine.classed("hidden", true);

    if (mouseDownNode !== d){
      // we're in a different node: create new edge for mousedown edge and add to graph
      var newEdge = {source: mouseDownNode, target: d};
      var filtRes = paths.filter(function(d){
        if (d.source === newEdge.target && d.target === newEdge.source){
          edges.splice(edges.indexOf(d), 1);
        }
        return d.source === newEdge.source && d.target === newEdge.target;
      });
      if (!filtRes[0].length){
        edges.push(newEdge);
        updateGraph();
      }
    } else{
      // we're in the same node
      if (state.justDragged) {
        // dragged, not clicked
        state.justDragged = false;
      } else{
        // clicked, not dragged
        if (d3.event.shiftKey){
          // shift-clicked node: edit text content

          d3this.selectAll("text").remove();
          
          var nodeBCR = this.getBoundingClientRect();
          var curScale = nodeBCR.width/consts.nodeRadius;
          var placePad  =  5*curScale,
              useHW = curScale > 1 ? nodeBCR.width*0.71 : consts.nodeRadius*1.42;
          // replace with editableconent text
          var d3txt = svg.selectAll("foreignObject")
            .data([d])
            .enter()
            .append("foreignObject")
            .attr("x", nodeBCR.left + placePad )
            .attr("y", nodeBCR.top + placePad)
            .attr("height", 2*useHW)
            .attr("width", useHW)
            .append("xhtml:p")
            .attr("id", consts.activeEditId)
            .attr("contentEditable", "true")
            .text(d.title)
            .on("mousedown", function(d){
              d3.event.stopPropagation();
            })
            .on("keydown", function(d){
              d3.event.stopPropagation();
              if (d3.event.keyCode == consts.ENTER_KEY && !d3.event.shiftKey){
                this.blur();
              }
            })
            .on("blur", function(d){
                d.title = this.textContent;
                insertTitleLinebreaks(d3this, d.title);
                d3.select(this.parentElement).remove();
              });
          var txtNode = d3txt.node();
          selectElementContents(txtNode);
          txtNode.focus();
        } else{
          if (state.selectedEdge){
            removeSelectFromEdge();
          }
          var prevNode = state.selectedNode;            
          
          if (!prevNode || prevNode.id !== d.id){
            replaceSelectNode(d3this, d);
          } else{
            removeSelectFromNode();
          }
        }
      }
    }

    state.mouseDownNode = null;
    return;
    
  } // end of circles mouseup

  // mousedown on main svg
  function svgMouseDown(){
    state.graphMouseDown = true;
  }

  // mouseup on main svg
  function svgMouseUp(){
    if (state.justScaleTransGraph) {
      // dragged not clicked
      state.justScaleTransGraph = false;
    } else if (state.graphMouseDown){
      // clicked not dragged from svg
      var xycoords = d3.mouse(svgG.node());
      nodes.push({id: idct++, title: "new concept", x: xycoords[0], y: xycoords[1]});
      updateGraph();
    } else if (state.shiftNodeDrag){
      // dragged from node
      state.shiftNodeDrag = false;
      dragLine.classed("hidden", true);
    }
    state.graphMouseDown = false;
  }

  // keydown on main svg
  function svgKeyDown() {
    // make sure repeated key presses don't register for each keydown
    if(state.lastKeyDown !== -1) return;

    state.lastKeyDown = d3.event.keyCode;
    var selectedNode = state.selectedNode,
        selectedEdge = state.selectedEdge;

    switch(d3.event.keyCode) {
    case consts.BACKSPACE_KEY:
    case consts.DELETE_KEY:
      d3.event.preventDefault();
      if (selectedNode){
        nodes.splice(nodes.indexOf(selectedNode), 1);
        spliceLinksForNode(selectedNode);
        state.selectedNode = null;
        updateGraph();
      } else if (selectedEdge){
        edges.splice(edges.indexOf(selectedEdge), 1);
        state.selectedEdge = null;
        updateGraph();
      }
      break;
    }
  }

  function svgKeyUp() {
    state.lastKeyDown = -1;
  }

  // call to propagate changes to graph
  function updateGraph(){

    paths = paths.data(edges);
    
    // update existing paths
    paths.style('marker-end', 'url(#end-arrow)')
      .classed(consts.selectedClass, function(d){
        return d === state.selectedEdge;
      })
      .attr("d", function(d){
        return "M" + d.source.x + "," + d.source.y + "L" + d.target.x + "," + d.target.y;
      });

    // add new paths
    paths.enter()
      .append("path")
      .style('marker-end','url(#end-arrow)')
      .classed("link", true)
      .attr("d", function(d){
        return "M" + d.source.x + "," + d.source.y + "L" + d.target.x + "," + d.target.y;
      })
      .on("mousedown", pathMouseDown)
      .on("mouseup", function(d){
        state.mouseDownLink = null;
      });

    // remove old links
    paths.exit().remove();
    
    // update existing nodes
    circles = circles.data(nodes, function(d){ return d.id;});
    circles.attr("transform", function(d){return "translate(" + d.x + "," + d.y + ")";});

    // add new nodes
    var newGs= circles.enter()
          .append("g");

    newGs.classed(consts.circleGClass, true)
      .attr("transform", function(d){return "translate(" + d.x + "," + d.y + ")";})
      .on("mouseover", function(d){        
        if (state.shiftNodeDrag){
          d3.select(this).classed(consts.connectClass, true);
        }
      })
      .on("mouseout", function(d){
        d3.select(this).classed(consts.connectClass, false);
      })
      .on("mousedown", circleMouseDown)
      .on("mouseup", circleMouseUp)
      .call(drag);

    newGs.append("circle")
      .attr("r", String(consts.nodeRadius));

    newGs.each(function(d){
      insertTitleLinebreaks(d3.select(this), d.title);
    });

    // remove old nodes
    circles.exit().remove();
  }

  // listen for key events
  d3.select(window).on("keydown", svgKeyDown).on("keyup", svgKeyUp);
  svg.on("mousedown", svgMouseDown);
  svg.on("mouseup", svgMouseUp);

  // listen for dragging
  var dragSvg = d3.behavior.zoom()
        .on("zoom", zoomed)
        .on("zoomstart", function(){
          d3.select('body').style("cursor", "move");
        })
        .on("zoomend", function(){
          d3.select('body').style("cursor", "auto");
        });
  function zoomed(){
    var ael = d3.select("#" + consts.activeEditId).node();
    if (ael){
      ael.blur();
    }
    state.justScaleTransGraph = true;
      d3.select("." + consts.graphClass)
    .attr("transform", "translate(" + d3.event.translate + ") scale(" + d3.event.scale + ")"); 
  }
              
  svg.call(dragSvg);
  
  function updateWindow(){
    var docEl = document.documentElement,
        bodyEl = document.getElementsByTagName('body')[0];
    var x = window.innerWidth || docEl.clientWidth || bodyEl.clientWidth;
    var y = window.innerHeight|| docEl.clientHeight|| bodyEl.clientHeight;
    svg.attr("width", x).attr("height", y);
  }
  window.onresize = updateWindow;

  // handle download data
  d3.select("#download-input").on("click", function(){
    var saveEdges = [];
    edges.forEach(function(val, i){
      saveEdges.push({source: val.source.id, target: val.target.id});
    });
    var blob = new Blob([window.JSON.stringify({"nodes": nodes, "edges": saveEdges})], {type: "text/plain;charset=utf-8"});
    saveAs(blob, "mydag.json");
  });

  // handle uploaded data
  d3.select("#upload-input").on("click", function(){
    document.getElementById("hidden-file-upload").click();
    });
  d3.select("#hidden-file-upload").on("change", function(){
    if (window.File && window.FileReader && window.FileList && window.Blob) {
      var uploadFile = this.files[0];
      var filereader = new window.FileReader();
            
      filereader.onload = function(){
        var txtRes = filereader.result;
        // TODO better error handling
        try{
          var jsonObj = JSON.parse(txtRes);
          deleteGraph(true);
          nodes = jsonObj.nodes;
          edges = jsonObj.edges;
          edges.forEach(function(e, i){
            edges[i] = {source: nodes.filter(function(n){return n.id == e.source;})[0],
                        target: nodes.filter(function(n){return n.id == e.target;})[0]};
          });
          updateGraph();
         }catch(err){
           window.alert("Error parsing uploaded file\nerror message: " + err.message);
           return;
         }
      };
      filereader.readAsText(uploadFile);
  
    } else {
      alert("Your browser won't let you save this graph -- try upgrading your browser to IE 10+ or Chrome or Firefox.");
    }
  });

  // handle delete graph
  d3.select("#delete-graph").on("click", deleteGraph);

  // warn the user when leaving
  window.onbeforeunload = function(){
    return "Make sure to save your graph locally before leaving :-)";
  };
  /** START THE APP **/
  updateGraph();

})(window.d3, window.saveAs, window.Blob);
