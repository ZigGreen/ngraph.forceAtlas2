var Viva = require('./node_modules/vivagraphjs/src/viva');
var graphGenerator = Viva.Graph.generator();
var graph = graphGenerator.grid(20, 20);
var ForceAtlas2 = require('../Layout');
var agm = require('ngraph.agmgen');
var _ = require('underscore');
var colors = require('./colors');
var rendererSstate = null;

function onLoad() {

    document.querySelector('#setup').onsubmit = function (e) {
        if (rendererSstate) rendererSstate.dispose();

        var communities = document.querySelector('#communities').value;
        var nodesCount = document.querySelector('#nodesCount').value;
        var bridgeCount = document.querySelector('#bridgeCount').value;
        var isAtlas = document.querySelector('#force').checked;
        this.querySelector('[type=submit]').isDisabled = true;
        rendererSstate = init(communities, nodesCount, bridgeCount, isAtlas);
        e.preventDefault();
    }

}


function init(communities, nodesCount, bridgeCount, force2) {
    communities = _.range(communities);
    var nodes = [];
    var graph = Viva.Graph.graph();

    console.time('build graph');
    for (var i = 0, c; i < nodesCount; i++) {
        c = _.random(communities.length - 1);
        graph.addLink('n' + i, 'community' + c);
        nodes[i] = c;
    }
    for (var j = 0, n, cs; j < bridgeCount; j++) {
        n = _.random(nodesCount - 1);
        cs = _.difference(communities, [nodes[n]]);
        graph.addLink('n' + n, 'community' + cs[_.random(cs.length)]);
    }
    console.time('build graphEnd');


    console.time('agm');
    graph = agm(graph, {
        coefficient: 0.3,
        scale: 1
    });
    console.time('agm');


    var layout;
    if (force2)
        layout = ForceAtlas2(graph, {
            gravity: 1,
            linLogMode: false,
            strongGravityMode: false,
            slowDown: 1,
            outboundAttractionDistribution: false,
            iterationsPerRender: 1,
            barnesHutOptimize: false,
            barnesHutTheta: 0.5,
            worker: true
        });

    else
        layout = Viva.Graph.Layout.forceDirected(graph, {
            springLength: 30,
            springCoeff: 0.0008,
            dragCoeff: 0.01,
            gravity: -1.2,
            theta: 1
        });

    var graphics = Viva.Graph.View.webglGraphics()
        , squareNode = Viva.Graph.View.webglSquare;

    graphics
        .node(function (node) {
            return squareNode(
                15
                , Number(("0x" + colors[nodes[node.id.slice(1)]].slice(1) + "FF"))
            );
        });

    var renderer = Viva.Graph.View.renderer(graph, {
        renderLinks: false,
        layout: layout,
        graphics: graphics
        , container: document.querySelector('#cont')
    });


    renderer.run(Infinity);
    return renderer;
}

window.addEventListener('load', onLoad);