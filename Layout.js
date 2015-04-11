module.exports = constant;

var merge = require('ngraph.merge');
var random = require('ngraph.random').random;
var centrality = require('ngraph.centrality');
var AtlasSupervisor = require('./supervisor');

/**
 * Does not really perform any layouting algorithm but is compliant
 * with renderer interface. Allowing clients to provide specific positioning
 * callback and get static layout of the graph
 *
 * @param {Viva.Graph.graph} graph to layout
 * @param config
 * @param {Object} userSettings
 */
function constant(graph, config, userSettings) {
    userSettings = merge(userSettings, {
        maxX: 1024,
        maxY: 1024,
        seed: 'Deterministic randomness made me do this'
    });


    var rand = random(userSettings.seed),
        layoutLinks = {},

        generateRandomPosition = function () {
            return {
                x: rand.next(userSettings.maxX/2) - rand.next(userSettings.maxX/2),
                y: rand.next(userSettings.maxY/2) - rand.next(userSettings.maxY/2),
                isPinned: false,
                changed: false
            };
        },


        layoutNodes = typeof Object.create === 'function' ? Object.create(null) : {},
        layoutNodesArray = [],
        layoutLinksArray = [],


        initNode = function (node) {

            var nodeBody = generateRandomPosition();
            nodeBody.id = node.id;
            layoutNodesArray.push(nodeBody);
            layoutNodes[node.id] = nodeBody;

        },


        initLink = function (link) {
            layoutLinks[link.id] = link;
            layoutLinksArray.push(link);
        },


        onGraphChanged = function (changes) {
            console.warn('Not implemented');
            /*for (var i = 0; i < changes.length; ++i) {
             var change = changes[i];
             if (change.node) {
             if (change.changeType === 'add') {
             initNode(change.node);
             } else {
             delete layoutNodes[change.node.id];
             }
             }
             if (change.link) {
             if (change.changeType === 'add') {
             initLink(change.link);
             } else {
             delete layoutLinks[change.link.id];
             }
             }
             }*/
        };


    graph.forEachNode(initNode);
    graph.forEachLink(initLink);

    var degreeCentrality = centrality.degree(graph);

    graph.on('changed', onGraphChanged);

    var supervisor = new AtlasSupervisor({
        nodes: layoutNodesArray,
        edges: layoutLinksArray,
        degree: degreeCentrality
    }, config);


    return {

        config: function (config) {
            supervisor.configure(config)
        },
        /**
         * Attempts to layout graph within given number of iterations.
         *
         * @param {integer} [iterationsCount] number of algorithm's iterations.
         *  The constant layout ignores this parameter.
         */
        run: function (iterationsCount) {
            throw new Error('not implemented');
        },

        /**
         * One step of layout algorithm
         */
        step: function () {

            if (supervisor.isPending()) return;
            supervisor.step();

            return false;
        },

        /**
         * Returns rectangle structure {x1, y1, x2, y2}, which represents
         * current space occupied by graph.
         */
        getGraphRect: function () {
            return supervisor.getGraphRect();
        },

        /**
         * Request to release all resources
         */
        dispose: function () {
            graph.off('change', onGraphChanged);
            supervisor.kill();
        },


        isNodePinned: function (node) {
            return layoutNodes[node.id].isPinned;
        },

        /**
         * Requests layout algorithm to pin/unpin node to its current position
         * Pinned nodes should not be affected by layout algorithm and always
         * remain at their position
         */
        pinNode: function (node, isPinned) {

            var body = layoutNodes[node.id];
            if (body.isPinned !== isPinned) {
                body.isPinned = isPinned;
                body.changed = true;
            }

        },

        /**
         * Gets position of a node by its id. If node was not seen by this
         * layout algorithm undefined value is returned;
         */
        getNodePosition: getNodePosition,

        /**
         * Returns {from, to} position of a link.
         */
        getLinkPosition: function (linkId) {
            var link = layoutLinks[linkId];
            return {
                from: getNodePosition(link.fromId),
                to: getNodePosition(link.toId)
            };
        },

        /**
         * Sets position of a node to a given coordinates
         */
        setNodePosition: function (nodeId, x, y) {
            var body = layoutNodes[nodeId];
            if (body) {
                body.x = x;
                body.y = y;
            }
            body.changed = true;
        }

    };

    function getNodePosition(nodeId) {
        return layoutNodes[nodeId];
    }
}