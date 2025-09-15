/**
 * Railroad Diagram Standalone Library
 * 
 * This file combines TrackBuilder and Diagram functionality into a single
 * browser-compatible script that works with file:// protocol without ES modules.
 * 
 * Dependencies: D3.js (loaded from CDN)
 * Usage: Include this script after D3.js and access via window.RailroadDiagrams
 */

(function(global) {
    'use strict';

    // Direction constants for track building
    const Direction = {
        NORTH: 'north',
        SOUTH: 'south', 
        EAST: 'east',
        WEST: 'west'
    };

    // Utility function for rounding up to even numbers
    function roundUpToEven(value) {
        return value + (value % 2);
    }

    // TrackBuilder class for creating SVG rail paths
    class TrackBuilder {
        constructor(group, gridSize) {
            this.group = group;
            this.gridSize = gridSize;
            this.currentPath = null;
            this.currentX = 0;
            this.currentY = 0;
            this.currentDirection = Direction.EAST;
            this.paths = [];

            this.ARC_TRANSITIONS = {
                'east-north': 'Q {x1} {y1} {x2} {y2}',
                'east-south': 'Q {x1} {y1} {x2} {y2}',
                'west-north': 'Q {x1} {y1} {x2} {y2}',
                'west-south': 'Q {x1} {y1} {x2} {y2}',
                'north-east': 'Q {x1} {y1} {x2} {y2}',
                'north-west': 'Q {x1} {y1} {x2} {y2}',
                'south-east': 'Q {x1} {y1} {x2} {y2}',
                'south-west': 'Q {x1} {y1} {x2} {y2}'
            };
        }

        start(x, y, direction) {
            if (this.currentPath) {
                throw new Error('Path already started. Call finish() before starting a new path.');
            }

            this.currentX = x;
            this.currentY = y;
            this.currentDirection = direction;

            this.currentPath = {
                commands: [`M ${x * this.gridSize} ${y * this.gridSize}`],
                debugSequence: [`start(${x}, ${y}, ${direction})`]
            };

            return this;
        }

        forward(units) {
            if (!this.currentPath) {
                throw new Error('No path started. Call start() first.');
            }

            const deltaX = this._getDirectionDelta(this.currentDirection).x * units;
            const deltaY = this._getDirectionDelta(this.currentDirection).y * units;

            this.currentX += deltaX;
            this.currentY += deltaY;

            this.currentPath.commands.push(`L ${this.currentX * this.gridSize} ${this.currentY * this.gridSize}`);
            this.currentPath.debugSequence.push(`forward(${units})`);

            return this;
        }

        turnLeft() {
            if (!this.currentPath) {
                throw new Error('No path started. Call start() first.');
            }

            const newDirection = this._turnLeft(this.currentDirection);
            this._addArcTransition(this.currentDirection, newDirection);
            this.currentDirection = newDirection;

            this.currentPath.debugSequence.push('turnLeft()');
            return this;
        }

        turnRight() {
            if (!this.currentPath) {
                throw new Error('No path started. Call start() first.');
            }

            const newDirection = this._turnRight(this.currentDirection);
            this._addArcTransition(this.currentDirection, newDirection);
            this.currentDirection = newDirection;

            this.currentPath.debugSequence.push('turnRight()');
            return this;
        }

        _getDirectionDelta(direction) {
            switch (direction) {
                case Direction.NORTH: return { x: 0, y: -1 };
                case Direction.SOUTH: return { x: 0, y: 1 };
                case Direction.EAST: return { x: 1, y: 0 };
                case Direction.WEST: return { x: -1, y: 0 };
                default: throw new Error(`Unknown direction: ${direction}`);
            }
        }

        _turnLeft(direction) {
            switch (direction) {
                case Direction.NORTH: return Direction.WEST;
                case Direction.WEST: return Direction.SOUTH;
                case Direction.SOUTH: return Direction.EAST;
                case Direction.EAST: return Direction.NORTH;
                default: throw new Error(`Unknown direction: ${direction}`);
            }
        }

        _turnRight(direction) {
            switch (direction) {
                case Direction.NORTH: return Direction.EAST;
                case Direction.EAST: return Direction.SOUTH;
                case Direction.SOUTH: return Direction.WEST;
                case Direction.WEST: return Direction.NORTH;
                default: throw new Error(`Unknown direction: ${direction}`);
            }
        }

        _addArcTransition(fromDirection, toDirection) {
            const key = `${fromDirection}-${toDirection}`;
            const arcTemplate = this.ARC_TRANSITIONS[key];

            if (!arcTemplate) {
                throw new Error(`No arc transition defined for ${key}`);
            }

            const fromDelta = this._getDirectionDelta(fromDirection);
            const toDelta = this._getDirectionDelta(toDirection);

            this.currentX += fromDelta.x;
            this.currentY += fromDelta.y;

            const x1 = this.currentX * this.gridSize;
            const y1 = this.currentY * this.gridSize;

            this.currentX += toDelta.x;
            this.currentY += toDelta.y;

            const x2 = this.currentX * this.gridSize;
            const y2 = this.currentY * this.gridSize;

            const arcCommand = arcTemplate
                .replace('{x1}', x1)
                .replace('{y1}', y1)
                .replace('{x2}', x2)
                .replace('{y2}', y2);

            this.currentPath.commands.push(arcCommand);
        }

        finish(className = "rail-track", debugId = null) {
            if (!this.currentPath) {
                throw new Error('No path to finish. Call start() first.');
            }

            const pathElement = this.group.append("path")
                .attr("d", this.currentPath.commands.join(" "))
                .attr("data-seq", this.currentPath.debugSequence.join(" "))
                .classed(className, true);

            if (debugId) {
                pathElement.attr("data-id", debugId);
            }

            this.paths.push({
                element: pathElement,
                data: this.currentPath
            });

            this.currentPath = null;
            return this;
        }

        clearRails() {
            this.group.selectAll("*").remove();
            this.paths = [];
        }

        getCurrentPosition() {
            return {
                x: this.currentX,
                y: this.currentY,
                direction: this.currentDirection
            };
        }
    }

    // Diagram class - main class for creating and rendering railroad diagrams
    class Diagram {
        constructor(containerId, grid, debugMode) {
            this.container = typeof containerId === 'string'
                ? (containerId.startsWith('#')
                    ? document.querySelector(containerId)
                    : document.getElementById(containerId))
                : containerId; // If not a string, assume it's already a DOM element
            if (!this.container) throw new Error('Container not found');

            this.gridSize = grid;
            this.debugMode = debugMode;

            // Remove previous SVG if any
            d3.select(this.container).select("svg").remove();

            // Create SVG element
            this.svg = d3.select(this.container)
                .append("svg")
                .attr("width", 800)
                .attr("height", 600)
                .attr("class", "diagram-svg");

            /**
             * Array of rules to render
             * @type {Array<{title: string, expression: LayoutBox}>}
             */
            this.rules = [];

            this._invalidate();
        }

        addRule(title, expression) {
            this.rules.push({ title, expression });
            this._invalidate();
        }

        _invalidate() {
            this.svg.selectAll("*").remove();

            // Add background grid first if in debug mode (before any content)
            if (this.debugMode) {
                this._addBackgroundGridPattern();
            }

            const x = 1;
            let currentY = 1
            let maxWidth = 0;

            this.rules.forEach(rule => {
                // Create rule container with translation
                const ruleGroup = this.svg.append("g")
                    .attr("class", "rule-group")
                    .attr("transform", `translate(${x * this.gridSize}, ${currentY * this.gridSize})`);

                // Create TrackBuilder for this rule
                const trackBuilder = new TrackBuilder(ruleGroup, this.gridSize);

                // Factory function to create renderChild for any context group
                const createRenderChild = (contextGroup) => {
                    return (child, x, y) => {
                        // Create child group with translation relative to context group
                        const childGroup = contextGroup.append("g")
                            .attr("transform", `translate(${x * this.gridSize}, ${y * this.gridSize})`);

                        // Add debug data attributes if in debug mode
                        if (this.debugMode) {
                            childGroup
                                .attr("data-debug", "true")
                                .attr("data-width", child.width)
                                .attr("data-height", child.height)
                                .attr("data-baseline-y", child.baselineY)
                                .attr("data-grid-size", this.gridSize);
                        }

                        // Create trackbuilder for child
                        const childTrackBuilder = new TrackBuilder(childGroup, this.gridSize);

                        // Create renderChild for this child's context
                        const childRenderChild = createRenderChild(childGroup);

                        // Call child's render method
                        child.render(childGroup, childTrackBuilder, childRenderChild);
                    };
                };

                // Create renderChild for the rule level
                const renderChild = createRenderChild(ruleGroup);

                // Calculate positions for start and end terminals
                const terminalRadius = this.gridSize * 0.75; // Radius = 3/4 grid unit
                const expressionStartX = 2; // Expression starts at grid unit 2 (terminal at 0, rail from 0-2)
                const expressionBaseline = rule.expression.baselineY;

                // Add start terminal (black circle centered on grid point 0)
                ruleGroup.append("circle")
                    .attr("cx", 0) // Centered on grid point 0
                    .attr("cy", expressionBaseline * this.gridSize)
                    .attr("r", terminalRadius)
                    .attr("fill", "black")
                    .attr("class", "start-terminal");

                // Add start connecting rail (from grid 0 to grid 2)
                const startTrackBuilder = new TrackBuilder(ruleGroup, this.gridSize);
                startTrackBuilder
                    .start(0, expressionBaseline, Direction.EAST)
                    .forward(2) // 2 grid units to reach expression start
                    .finish("rail-track", "start-rail");

                // Render the expression with offset to make room for start terminal
                const expressionGroup = ruleGroup.append("g")
                    .attr("transform", `translate(${expressionStartX * this.gridSize}, 0)`);
                const expressionTrackBuilder = new TrackBuilder(expressionGroup, this.gridSize);
                const expressionRenderChild = createRenderChild(expressionGroup);
                rule.expression.render(expressionGroup, expressionTrackBuilder, expressionRenderChild);

                // Add debug data attributes for expression group if in debug mode
                if (this.debugMode) {
                    expressionGroup
                        .attr("data-debug", "true")
                        .attr("data-width", rule.expression.width)
                        .attr("data-height", rule.expression.height)
                        .attr("data-baseline-y", rule.expression.baselineY)
                        .attr("data-grid-size", this.gridSize);
                }

                // Calculate end terminal position (centered on grid point)
                const endTerminalX = expressionStartX + rule.expression.width + 2; // +2 for rail length
                
                // Add end connecting rail (from expression end to terminal)
                startTrackBuilder
                    .start(expressionStartX + rule.expression.width, expressionBaseline, Direction.EAST)
                    .forward(2) // 2 grid units to reach terminal
                    .finish("rail-track", "end-rail");

                // Add end terminal (black circle centered on grid point)
                ruleGroup.append("circle")
                    .attr("cx", endTerminalX * this.gridSize) // Centered on grid point
                    .attr("cy", expressionBaseline * this.gridSize)
                    .attr("r", terminalRadius)
                    .attr("fill", "black")
                    .attr("class", "end-terminal");

                // Track maximum width (terminals are on grid points, so width = start rail + expression + end rail)
                const totalRuleWidth = 2 + rule.expression.width + 2; // 2 + expression + 2
                maxWidth = Math.max(maxWidth, totalRuleWidth + 2); // +2 for side padding

                // For height calculation: just the expression height
                currentY += rule.expression.height;
            });

            // Update SVG dimensions
            // Width: max content width with padding
            // Height: current Y position + bottom padding
            this.svg
                .attr("width", maxWidth * this.gridSize)
                .attr("height", (currentY + 2) * this.gridSize); // Add 2 grid units padding at bottom

            // Update background grid dimensions and add debug overlay
            if (this.debugMode) {
                this._updateBackgroundGridSize();
                this._addDebugOverlay();
            }
        }

        _addBackgroundGridPattern() {
            // Create defs section if it doesn't exist
            let defs = this.svg.select("defs");
            if (defs.empty()) {
                defs = this.svg.append("defs");
            }

            // Create grid pattern
            const pattern = defs.append("pattern")
                .attr("id", "grid-pattern")
                .attr("width", this.gridSize)
                .attr("height", this.gridSize)
                .attr("patternUnits", "userSpaceOnUse");

            // Add vertical and horizontal lines to pattern
            pattern.append("path")
                .attr("d", `M ${this.gridSize} 0 L 0 0 0 ${this.gridSize}`)
                .attr("fill", "none")
                .attr("stroke", "#ddd")
                .attr("stroke-width", "1")
                .attr("opacity", "0.5");

            // Create background rectangle with pattern fill (will be sized later)
            const gridGroup = this.svg.append("g")
                .attr("class", "background-grid");

            gridGroup.append("rect")
                .attr("id", "grid-background")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", 0) // Will be updated when dimensions are known
                .attr("height", 0) // Will be updated when dimensions are known
                .attr("fill", "url(#grid-pattern)");
        }

        _updateBackgroundGridSize() {
            const svgWidth = parseInt(this.svg.attr("width"));
            const svgHeight = parseInt(this.svg.attr("height")) || 600;

            this.svg.select("#grid-background")
                .attr("width", svgWidth)
                .attr("height", svgHeight);
        }

        _addDebugOverlay() {
            // Create debug overlay container
            d3.select(this.container).select(".debug-overlay").remove();

            const debugOverlay = d3.select(this.container)
                .append("div")
                .attr("class", "debug-overlay")
                .style("position", "absolute")
                .style("top", "0")
                .style("left", "0")
                .style("width", "100%")
                .style("height", "100%")
                .style("pointer-events", "none")
                .style("z-index", "10");

            // Find all groups with debug data and create overlay boxes
            this.svg.selectAll("g[data-debug]").each(function () {
                const group = d3.select(this);
                const width = parseInt(group.attr("data-width"));
                const height = parseInt(group.attr("data-height"));
                const baselineY = parseInt(group.attr("data-baseline-y"));
                const gridSize = parseInt(group.attr("data-grid-size"));

                // Get the transform matrix to calculate absolute position
                const transform = this.getCTM();
                const x = transform.e;
                const y = transform.f;

                // Create bounding box overlay
                debugOverlay.append("div")
                    .attr("class", "debug-box-overlay")
                    .style("position", "absolute")
                    .style("left", `${x}px`)
                    .style("top", `${y}px`)
                    .style("width", `${width * gridSize}px`)
                    .style("height", `${height * gridSize}px`)
                    .style("border", "2px dashed hotpink")
                    .style("box-sizing", "border-box")
                    .style("pointer-events", "none");

                // Create baseline indicator
                debugOverlay.append("div")
                    .attr("class", "debug-baseline-overlay")
                    .style("position", "absolute")
                    .style("left", `${x}px`)
                    .style("top", `${y + baselineY * gridSize}px`)
                    .style("width", `${width * gridSize}px`)
                    .style("height", "0")
                    .style("border-top", "1px dotted hotpink")
                    .style("pointer-events", "none");
            });
        }
    }

    // Expression class - static methods for creating railroad diagram expressions
    class Expression {
        
        static textBox(textContent, className) {
            const height = 2;
            const gridSize = 24; // Default grid size
            const textWidth = Expression._measureText(textContent, gridSize, className);
            const width = textWidth + 3; // Add 1 unit on each side for rails, plus 1 for original padding
            // INVARIANT: Ensure total width is even for perfect centering in stacks (Grid Alignment Invariant)
            const adjustedWidth = roundUpToEven(width);

            console.log(`textBox "${textContent}": width=${adjustedWidth}, height=${height}, baselineY=1`);

            return {
                width: adjustedWidth,
                height: height,
                baselineY: 1,
                render(group, trackBuilder, renderChild) {

                    // Add left rail line (1 unit long) - coordinates in grid units
                    trackBuilder
                        .start(0, 1, Direction.EAST)
                        .forward(1)
                        .finish("rail-track", "textbox-left");

                    // Add right rail line (1 unit long) - coordinates in grid units
                    trackBuilder
                        .start(adjustedWidth - 1, 1, Direction.EAST)
                        .forward(1)
                        .finish("rail-track", "textbox-right");

                    // Add the rectangle for the text-box (offset by 1 unit from left) - coordinates in pixels
                    const textboxWidth = adjustedWidth - 2; // Full width minus the 2 rail units (1 left + 1 right)
                    const rect = group.append("rect")
                        .attr("x", 1 * trackBuilder.gridSize)
                        .attr("y", 0)
                        .attr("rx", trackBuilder.gridSize * .9)
                        .attr("ry", trackBuilder.gridSize * .9)
                        .attr("width", textboxWidth * trackBuilder.gridSize) // Use calculated text-box width
                        .attr("height", height * trackBuilder.gridSize)
                        .attr("class", `textbox ${className}`);

                    // Add the text centered in the rectangle (offset by 1 unit from left) - coordinates in pixels
                    const text = group.append("text")
                        .attr("x", (1 + textboxWidth / 2) * trackBuilder.gridSize)  // Center horizontally in text-box
                        .attr("y", (height / 2) * trackBuilder.gridSize)  // Center vertically
                        .attr("text-anchor", "middle")          // Horizontal centering
                        .attr("dominant-baseline", "middle")    // Vertical centering
                        .attr("class", `textbox-text ${className}`)
                        .text(textContent);

                }
            };
        }

        static sequence(...children) {
            // Calculate total width and max height
            const totalWidth = children.reduce((sum, child) => sum + child.width, 0) + (children.length - 1) * 2;
            const maxHeight = Math.max(...children.map(child => child.height));
            const baselineY = Math.max(...children.map(child => child.baselineY));

            return {
                width: totalWidth,
                height: maxHeight,
                baselineY: baselineY,
                render(group, trackBuilder, renderChild) {
                    let currentX = 0;

                    children.forEach((child, index) => {
                        // Calculate child Y position to align baselines (in relative coordinates)
                        const childY = baselineY - child.baselineY;

                        console.log(`sequence child ${index}: width=${child.width}, baselineY=${child.baselineY}, positioning at (${currentX}, ${childY})`);

                        // Call renderChild with child and relative coordinates
                        renderChild(child, currentX, childY);

                        // Add horizontal rail connection to next child (except for the last child)
                        if (index < children.length - 1) {
                            const railStartX = currentX + child.width;
                            const railY = baselineY;

                            console.log(`sequence: adding rail from ${railStartX} to ${railStartX + 2}`);

                            trackBuilder
                                .start(railStartX, railY, Direction.EAST)
                                .forward(2) // 2 unit space
                                .finish("rail-track", `seq-${index}`);
                        }

                        currentX += child.width + 2; // Add 2 for the unit space
                    });

                }
            };
        }

        static stack(...children) {
            const maxChildWidth = roundUpToEven(Math.max(...children.map(child => child.width)));
            const maxWidth = maxChildWidth + 4; // Add 2 units on each side
            const totalHeight = children.reduce((sum, child) => sum + child.height, 0) + (children.length - 1) + 1;
            const baselineY = children[0].baselineY;

            return {
                width: maxWidth,
                height: totalHeight,
                baselineY: baselineY,
                render(group, trackBuilder, renderChild) {
                    let currentY = 0;
                    const leftConnectionX = 0;
                    const rightConnectionX = maxWidth;
                    const mainBaselineY = baselineY;

                    children.forEach((child, index) => {
                        const xOffset = 2 + (maxChildWidth - child.width) / 2;
                        const childX = xOffset;
                        const childBaselineY = currentY + child.baselineY;

                        renderChild(child, childX, currentY);

                        const childLeftX = childX;
                        const childRightX = childX + child.width;

                        if (index === 0) {
                            // For first child: straight line from left connection to child
                            trackBuilder
                                .start(leftConnectionX, mainBaselineY, Direction.EAST)
                                .forward(childLeftX - leftConnectionX)
                                .finish("rail-track", `child${index}-left`);

                            // For first child: straight line from child to right connection
                            trackBuilder
                                .start(childRightX, childBaselineY, Direction.EAST)
                                .forward(rightConnectionX - childRightX)
                                .finish("rail-track", `child${index}-right`);
                        } else {
                            // For other children: create proper branching paths
                            const verticalDistance = childBaselineY - mainBaselineY;
                            const horizontalToChild = childLeftX - leftConnectionX;

                            // Left rail path
                            trackBuilder
                                .start(leftConnectionX, mainBaselineY, Direction.EAST)
                                .turnRight()
                                .forward(verticalDistance - 2)
                                .turnLeft()
                                .forward(horizontalToChild - 2)
                                .finish("rail-track", `child${index}-left`);

                            // Right rail path
                            const horizontalFromChild = rightConnectionX - childRightX;

                            trackBuilder
                                .start(rightConnectionX, mainBaselineY, Direction.WEST)
                                .turnLeft()
                                .forward(verticalDistance - 2)
                                .turnRight()
                                .forward(horizontalFromChild - 2)
                                .finish("rail-track", `child${index}-right`);
                        }

                        currentY += child.height + 1;
                    });
                }
            }
        }

        static bypass(child) {
            const width = roundUpToEven(child.width + 4);
            const height = child.height + 1;
            const baselineY = child.baselineY + 1;

            return {
                width: width,
                height: height,
                baselineY: baselineY,
                render(group, trackBuilder, renderChild) {
                    const mainBaseline = baselineY;
                    const childX = (width - child.width) / 2;

                    renderChild(child, childX, 1);

                    // Draw the bypass path (above the child)
                    trackBuilder
                        .start(0, mainBaseline, Direction.EAST)
                        .turnLeft()
                        .forward(baselineY - 2)
                        .turnRight()
                        .forward(width - 4)
                        .turnRight()
                        .forward(baselineY - 2)
                        .turnLeft()
                        .finish("rail-track", "bypass-path");

                    trackBuilder
                        .start(0, mainBaseline, Direction.EAST)
                        .forward(2)
                        .finish("rail-track", "through-path");
                    trackBuilder
                        .start(width, mainBaseline, Direction.WEST)
                        .forward(2)
                        .finish("rail-track", "through-path");
                }
            }
        }

        static loop(child) {
            const width = roundUpToEven(child.width + 4);
            const height = child.height + 1;
            const baselineY = child.baselineY + 1;

            return {
                width: width,
                height: height,
                baselineY: baselineY,
                render(group, trackBuilder, renderChild) {
                    const mainBaseline = baselineY;
                    const childX = (width - child.width) / 2;

                    renderChild(child, childX, 1);

                    // Draw the loop path
                    trackBuilder
                        .start(2, mainBaseline, Direction.WEST)
                        .turnRight()
                        .forward(baselineY - 2)
                        .turnRight()
                        .forward(width - 4)
                        .turnRight()
                        .forward(baselineY - 2)
                        .turnRight()
                        .finish("rail-track", "loop-path");

                    trackBuilder
                        .start(0, mainBaseline, Direction.EAST)
                        .forward(2)
                        .finish("rail-track", "through-path");
                    trackBuilder
                        .start(width, mainBaseline, Direction.WEST)
                        .forward(2)
                        .finish("rail-track", "through-path");
                }
            }
        }

        static _measureText(textContent, gridSize, className) {
            let svg = d3.select("body").select("svg.temp-measure-svg");
            if (svg.empty()) {
                svg = d3.select("body")
                    .append("svg")
                    .attr("class", "temp-measure-svg")
                    .style("position", "absolute")
                    .style("visibility", "hidden");
            }

            const text = svg.append("text")
                .attr("class", `textbox-text ${className}`)
                .text(textContent);

            const bbox = text.node().getBBox();
            text.remove();
            return Math.ceil(bbox.width / gridSize);
        }
    }

    // Function to render a single railroad diagram
    function renderRailroadDiagram(config) {
        const {
            containerId,
            expressionCode,
            ruleName,
            gridSize = 24,
            debugMode = false
        } = config;

        try {
            // Create diagram instance
            const diagram = new Diagram(containerId, gridSize, debugMode);

            // Evaluate the expression code in context with our functions
            const expression = eval(`(function() {
                const textBox = Expression.textBox;
                const sequence = Expression.sequence;
                const stack = Expression.stack;
                const bypass = Expression.bypass;
                const loop = Expression.loop;
                return ${expressionCode};
            })()`);
            diagram.addRule(ruleName, expression);

            return diagram;
        } catch (error) {
            console.error(`Error rendering diagram for rule "${ruleName}":`, error);

            // Get container element for error display
            const container = typeof containerId === 'string'
                ? (containerId.startsWith('#')
                    ? document.querySelector(containerId)
                    : document.getElementById(containerId))
                : containerId;

            if (container) {
                container.innerHTML = `<div class="error">Error: ${error.message}</div>`;
            }
            throw error;
        }
    }

    // Function to automatically discover and render all diagram script tags
    function renderDiagramScripts(config = {}) {
        const { gridSize = 24, debugMode = false } = config;

        function doRender() {
            const scriptTags = document.querySelectorAll('script[type="text/railroad"]');
            console.log(`Found ${scriptTags.length} diagram script tags`);

            scriptTags.forEach((scriptTag, index) => {
                const ruleName = scriptTag.dataset.rule;
                const expressionCode = scriptTag.textContent.trim();
                console.log(`Processing rule: ${ruleName}, code: ${expressionCode}`);

                // Create container for this diagram
                const container = document.createElement('div');
                container.className = 'diagram-container';
                container.id = `diagram-${ruleName}`;

                // Insert the container after the script tag's parent
                const ruleDiv = scriptTag.closest('.syntax-rule');
                if (ruleDiv) {
                    ruleDiv.appendChild(container);

                    try {
                        renderRailroadDiagram({
                            containerId: container,
                            expressionCode,
                            ruleName,
                            gridSize,
                            debugMode
                        });
                    } catch (error) {
                        console.error(`Error rendering diagram for rule "${ruleName}":`, error);
                    }
                } else {
                    console.error('Could not find .syntax-rule parent for script tag');
                }
            });
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', doRender);
        } else {
            doRender();
        }
    }

    // Expose to global scope
    global.RailroadDiagrams = {
        Direction,
        TrackBuilder,
        Diagram,
        Expression,
        renderRailroadDiagram,
        renderDiagramScripts
    };

})(window);