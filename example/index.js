var Viva = require('./node_modules/vivagraphjs/src/viva');
var graphGenerator = Viva.Graph.generator();
var graph = graphGenerator.grid(20, 20);
var ForceAtlas2 = require('../Layout');

function onLoad() {
    var layout = ForceAtlas2(graph, {
        gravity: 1,
        linLogMode: false,
        strongGravityMode: false,
        slowDown: 0.5,
        outboundAttractionDistribution: false,
        startingIterations: 1,
        iterationsPerRender: 1,
        barnesHutOptimize: false,
        barnesHutTheta: 0.5,
        worker: true
    });

/*    var layout = Viva.Graph.Layout.forceDirected(graph, {
        springLength : 30,
        springCoeff : 0.0008,
        dragCoeff : 0.01,
        gravity : -1.2,
        theta : 1
    });*/

    var graphics = Viva.Graph.View.webglGraphics();

    var renderer =  Viva.Graph.View.renderer(graph, {
        layout: layout,
        graphics: graphics
    });

    renderer.run(Infinity);

}

window.addEventListener('load', onLoad);