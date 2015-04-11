# ForceAtlas2 layout algorithm for ngraph

It's [sigma.js plugin][1] adapted for 
performing [ngraph][2] layout

<a href="https://update-crystal.codio.io/images/100-10000.PNG" title="layout example 10k nodes, 100 communities">
  <img alt="layout example 10k nodes, 100 communities" src="https://update-crystal.codio.io/images/100-10000.PNG" width="150"/>
</a>
<a href="https://update-crystal.codio.io/images/2-4000(1000).PNG" title="layout example 4k nodes, 2 communities">
  <img alt="layout example 4k nodes, 2 communities" src="https://update-crystal.codio.io/images/2-4000(1000).PNG" width="150"/>
</a>
<a href="https://update-crystal.codio.io/images/2-4000(500).PNG" title="layout example 4k nodes, 2 communities">
  <img alt="layout example 4k nodes, 2 communities" src="https://update-crystal.codio.io/images/2-4000(500).PNG" width="150"/>
</a>
<a href="https://update-crystal.codio.io/images/30-4000.PNG" title="layout example 4k nodes, 30 communities">
  <img alt="layout example 4k nodes, 30 communities" src="https://update-crystal.codio.io/images/30-4000.PNG" width="150"/>
</a>
<a href="https://update-crystal.codio.io/images/5-1000.PNG" title="layout example 1k nodes, 5 communities">
  <img alt="layout example 1k nodes, 5 communities" src="https://update-crystal.codio.io/images/5-1000.PNG" width="150"/>
</a>

##Usage

please see the example folder for usage details

[LIVE DEMO](https://update-crystal.codio.io/example/index.html)

### how to build example
```
npm i gulp -g && npm i && gulp watch_browserify
```
## TODO
- handle graph changes 

[1]: https://github.com/jacomyal/sigma.js/tree/master/plugins/sigma.layout.forceAtlas2
[2]: https://github.com/anvaka/ngraph.graph