/**
 * Railroad Diagram Standalone Library
 * 
 * A complete JavaScript library for generating railroad syntax diagrams.
 * Browser-compatible script that works with file:// protocol without ES modules.
 * 
 * Dependencies: D3.js (loaded from CDN)
 * Usage: Include this script after D3.js and access via window.RailroadDiagrams
 * 
 * Security: Expression code is validated to prevent code injection attacks
 */

(function(global) {
    'use strict';

    /**
     * @typedef {Object} LayoutBox
     * @property {number} width - Width in grid units
     * @property {number} height - Height in grid units  
     * @property {number} baseline - Y coordinate of the main rail line in grid units
     * @property {function(RenderContext): void} render - Function to render this layout using the given context
     */

    /**
     * Direction constants for track building
     * @readonly
     * @enum {string}
     */
    const Direction = {
        /** @type {string} North direction for vertical movement up */
        NORTH: 'north',
        /** @type {string} South direction for vertical movement down */
        SOUTH: 'south',
        /** @type {string} East direction for horizontal movement right */
        EAST: 'east',
        /** @type {string} West direction for horizontal movement left */
        WEST: 'west'
    };

    /**
     * Utility function for rounding up to even numbers
     * Used to ensure grid alignment for perfect centering in stacks
     * @param {number} value - The number to round up to even
     * @returns {number} The next even number >= value
     * @example
     * roundUpToEven(5) // returns 6
     * roundUpToEven(4) // returns 4
     */
    function roundUpToEven(value) {
        return value + (value % 2);
    }

    /**
     * TrackBuilder class for creating SVG rail paths with fluent API
     * Manages SVG path creation with coordinate tracking and direction awareness
     * @class
     */
    class TrackBuilder {
        /**
         * Create a new TrackBuilder instance
         * @param {d3.Selection} group - D3 selection of SVG group element to append paths to
         * @param {number} gridSize - Size of grid units in pixels
         */
        constructor(group, gridSize) {
            this.group = group;
            this.gridSize = gridSize;
            this.currentPath = null;
            this.currentX = 0;
            this.currentY = 0;
            this.currentDirection = Direction.EAST;
            this.paths = [];
            
            // Constant for rail track CSS class
            this.RAIL_TRACK_CLASS = "rail-track";

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

        /**
         * Start a new path at the specified coordinates
         * @param {number} x - X coordinate in grid units
         * @param {number} y - Y coordinate in grid units
         * @param {string} direction - Initial direction (Direction enum value)
         * @returns {TrackBuilder} This instance for method chaining
         * @throws {Error} If a path is already started
         */
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

        /**
         * Move forward in the current direction by specified units
         * @param {number} units - Number of grid units to move forward
         * @returns {TrackBuilder} This instance for method chaining
         * @throws {Error} If no path is started
         */
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

        /**
         * Finish the current path and add it to the SVG
         * @param {string|null} [debugId=null] - Optional debug ID for the path element
         * @returns {TrackBuilder} This instance for method chaining
         * @throws {Error} If no path is started
         */
        finish(debugId = null) {
            if (!this.currentPath) {
                throw new Error('No path to finish. Call start() first.');
            }

            const pathElement = this.group.append("path")
                .attr("d", this.currentPath.commands.join(" "))
                .attr("data-seq", this.currentPath.debugSequence.join(" "))
                .classed(this.RAIL_TRACK_CLASS, true);

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

    /**
     * RenderContext class - provides optimized rendering interface with cached CSS properties
     * Manages coordinate transformations, child rendering, and CSS property caching for performance
     * @class
     */
    class RenderContext {
        /**
         * Create a new RenderContext instance
         * @param {d3.Selection} group - D3 selection of SVG group element
         * @param {number} gridSize - Size of grid units in pixels
         * @param {boolean} showBounds - Whether to show debug bounding boxes
         * @param {RenderContext|null} parentContext - Parent context for CSS property inheritance
         */
        constructor(group, gridSize, showBounds, parentContext = null) {
            this.group = group;
            this.gridSize = gridSize;
            this.showBounds = showBounds;
            this.trackBuilder = new TrackBuilder(group, gridSize);
            
            // Cache CSS properties: either inherit from parent or read from CSS
            if (parentContext) {
                // Inherit cached values from parent context (optimization)
                this.terminalRadius = parentContext.terminalRadius;
                this.nonterminalRadius = parentContext.nonterminalRadius;
            } else {
                // Read CSS properties once at root level
                this._cacheCSSProperties();
            }
        }

        _cacheCSSProperties() {
            const rootStyle = getComputedStyle(document.documentElement);
            
            // Cache corner radius values
            const terminalRadiusStr = rootStyle.getPropertyValue('--rail-terminal-radius').trim();
            const nonterminalRadiusStr = rootStyle.getPropertyValue('--rail-nonterminal-radius').trim();
            
            this.terminalRadius = parseInt(terminalRadiusStr) || (this.gridSize * 0.9);
            this.nonterminalRadius = parseInt(nonterminalRadiusStr) || (this.gridSize * 0.6);
        }

        renderChild(child, x, y) {
            // Create child group with translation relative to context group
            const childGroup = this.group.append("g")
                .attr("transform", `translate(${x * this.gridSize}, ${y * this.gridSize})`);

            // Add debug data attributes if showBounds is enabled
            if (this.showBounds) {
                childGroup
                    .attr("data-debug", "true")
                    .attr("data-width", child.width)
                    .attr("data-height", child.height)
                    .attr("data-baseline-y", child.baseline)
                    .attr("data-grid-size", this.gridSize);
            }

            // Create RenderContext for this child's context, inheriting cached values
            const childRenderContext = new RenderContext(childGroup, this.gridSize, this.showBounds, this);

            // Call child's render method with new context
            child.render(childRenderContext);
        }

        renderTextBox(textContent, className, width) {
            const height = 2;
            const adjustedWidth = width; // Width should already be adjusted by caller

            // Add left rail line (1 unit long) - coordinates in grid units
            this.trackBuilder
                .start(0, 1, Direction.EAST)
                .forward(1)
                .finish("textbox-left");

            // Add right rail line (1 unit long) - coordinates in grid units
            this.trackBuilder
                .start(adjustedWidth - 1, 1, Direction.EAST)
                .forward(1)
                .finish("textbox-right");

            // Add the rectangle for the text-box (offset by 1 unit from left) - coordinates in pixels
            const textboxWidth = adjustedWidth - 2; // Full width minus the 2 rail units (1 left + 1 right)
            
            // Use cached corner radius value
            const cornerRadius = className === 'nonterminal' ? this.nonterminalRadius : this.terminalRadius;
            
            const rect = this.group.append("rect")
                .attr("x", 1 * this.gridSize)
                .attr("y", 0)
                .attr("rx", cornerRadius)
                .attr("ry", cornerRadius)
                .attr("width", textboxWidth * this.gridSize) // Use calculated text-box width
                .attr("height", height * this.gridSize)
                .attr("class", `textbox ${className}`);

            // Add the text centered in the rectangle (offset by 1 unit from left) - coordinates in pixels
            const text = this.group.append("text")
                .attr("x", (1 + textboxWidth / 2) * this.gridSize)  // Center horizontally in text-box
                .attr("y", (height / 2) * this.gridSize)  // Center vertically
                .attr("text-anchor", "middle")          // Horizontal centering
                .attr("dominant-baseline", "middle")    // Vertical centering
                .attr("class", `textbox-text ${className}`)
                .text(textContent);

            // Add data attribute for nonterminals to enable click navigation
            if (className === 'nonterminal') {
                text.attr("data-rule", textContent);
            }
        }
    }

    /**
     * Diagram class - main class for creating and rendering railroad diagrams
     * Manages SVG creation, rule layout, and coordinate system for multiple syntax rules
     * @class
     */
    class Diagram {
        /**
         * Create a new Diagram instance
         * @param {string|HTMLElement} containerId - CSS selector, element ID, or DOM element for container
         * @param {number} grid - Size of grid units in pixels
         * @param {boolean} showGrid - Whether to show background grid pattern
         * @param {boolean} showBounds - Whether to show debug bounding boxes
         * @throws {Error} When container element cannot be found
         */
        constructor(containerId, grid, showGrid, showBounds) {
            this.container = typeof containerId === 'string'
                ? (containerId.startsWith('#')
                    ? document.querySelector(containerId)
                    : document.getElementById(containerId))
                : containerId; // If not a string, assume it's already a DOM element
            if (!this.container) throw new Error('Container not found');

            this.gridSize = grid;
            this.showGrid = showGrid;
            this.showBounds = showBounds;

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

        /**
         * Add a syntax rule to the diagram
         * @param {string} title - Name of the syntax rule
         * @param {LayoutBox} expression - Layout expression for the rule
         */
        addRule(title, expression) {
            this.rules.push({ title, expression });
            this._invalidate();
        }

        _invalidate() {
            this.svg.selectAll("*").remove();

            // Add background grid first if showGrid is enabled (before any content)
            if (this.showGrid) {
                this._addBackgroundGridPattern();
            }

            const x = 1;
            let currentY = 1
            let maxWidth = 0;

            this.rules.forEach(rule => {
                const result = this._renderRule(rule, x, currentY);
                maxWidth = Math.max(maxWidth, result.totalRuleWidth + 2); // +2 for side padding
                currentY += result.ruleHeight;
            });

            // Update SVG dimensions
            // Width: max content width with padding
            // Height: current Y position + bottom padding
            this.svg
                .attr("width", maxWidth * this.gridSize)
                .attr("height", (currentY + 2) * this.gridSize); // Add 2 grid units padding at bottom

            // Update background grid dimensions and add debug overlay
            if (this.showGrid) {
                this._updateBackgroundGridSize();
            }
            if (this.showBounds) {
                this._addDebugOverlay();
            }
        }

        /**
         * Render a single syntax rule with terminals and rails
         * @param {Object} rule - Rule object with title and expression properties
         * @param {number} x - X position in grid units for rule placement
         * @param {number} currentY - Y position in grid units for rule placement
         * @returns {{totalRuleWidth: number, ruleHeight: number}} Rule dimensions for layout calculation
         * @private
         */
        _renderRule(rule, x, currentY) {
            // Create rule container with translation
            const ruleGroup = this.svg.append("g")
                .attr("class", "rule-group")
                .attr("transform", `translate(${x * this.gridSize}, ${currentY * this.gridSize})`);

            // Setup layout constants
            const expressionStartX = 2; // Expression starts at grid unit 2 (terminal at 0, rail from 0-2)
            const expressionBaseline = rule.expression.baseline;

            // Render terminals and connecting rails
            this._renderRuleTerminals(ruleGroup, rule.expression, expressionStartX, expressionBaseline);

            // Render the core expression
            this._renderRuleExpression(ruleGroup, rule.expression, expressionStartX);

            // Calculate and return dimensions
            const totalRuleWidth = 2 + rule.expression.width + 2; // start rail + expression + end rail
            const ruleHeight = rule.expression.height;

            return { totalRuleWidth, ruleHeight };
        }

        /**
         * Render start and end terminals with connecting rails for a rule
         * @param {d3.Selection} ruleGroup - SVG group for the rule
         * @param {LayoutBox} expression - The rule's expression layout
         * @param {number} expressionStartX - X position where expression starts
         * @param {number} baseline - Y position of the main rail line
         * @private
         */
        _renderRuleTerminals(ruleGroup, expression, expressionStartX, baseline) {
            const terminalRadius = this.gridSize * 0.75; // Radius = 3/4 grid unit
            const endTerminalX = expressionStartX + expression.width + 2; // +2 for end rail length

            // Add start terminal (black circle at grid point 0)
            ruleGroup.append("circle")
                .attr("cx", 0)
                .attr("cy", baseline * this.gridSize)
                .attr("r", terminalRadius)
                .attr("fill", "black")
                .attr("class", "start-terminal");

            // Add end terminal (black circle at calculated end position)
            ruleGroup.append("circle")
                .attr("cx", endTerminalX * this.gridSize)
                .attr("cy", baseline * this.gridSize)
                .attr("r", terminalRadius)
                .attr("fill", "black")
                .attr("class", "end-terminal");

            // Add connecting rails
            const trackBuilder = new TrackBuilder(ruleGroup, this.gridSize);
            
            // Start rail: from terminal to expression start
            trackBuilder
                .start(0, baseline, Direction.EAST)
                .forward(2)
                .finish("start-rail");

            // End rail: from expression end to terminal
            trackBuilder
                .start(expressionStartX + expression.width, baseline, Direction.EAST)
                .forward(2)
                .finish("end-rail");
        }

        /**
         * Render the rule's expression content within the rule container
         * @param {d3.Selection} ruleGroup - SVG group for the rule
         * @param {LayoutBox} expression - The rule's expression layout
         * @param {number} expressionStartX - X position where expression starts
         * @private
         */
        _renderRuleExpression(ruleGroup, expression, expressionStartX) {
            // Create expression group with translation offset
            const expressionGroup = ruleGroup.append("g")
                .attr("transform", `translate(${expressionStartX * this.gridSize}, 0)`);
            
            // Add debug data attributes if enabled
            if (this.showBounds) {
                expressionGroup
                    .attr("data-debug", "true")
                    .attr("data-width", expression.width)
                    .attr("data-height", expression.height)
                    .attr("data-baseline-y", expression.baseline)
                    .attr("data-grid-size", this.gridSize);
            }

            // Create RenderContext and render the expression
            const expressionRenderContext = new RenderContext(expressionGroup, this.gridSize, this.showBounds);
            expression.render(expressionRenderContext);
        }

        _addBackgroundGridPattern() {
            // Create defs section if it doesn't exist
            let defs = this.svg.select("defs");
            if (defs.empty()) {
                defs = this.svg.append("defs");
            }

            // Remove any existing pattern
            defs.select("#grid-pattern").remove();

            // Create grid pattern with small crosses at grid points
            const pattern = defs.append("pattern")
                .attr("id", "grid-pattern")
                .attr("x", -this.gridSize / 2) // Offset pattern by half grid size
                .attr("y", -this.gridSize / 2) // Offset pattern by half grid size
                .attr("width", this.gridSize)
                .attr("height", this.gridSize)
                .attr("patternUnits", "userSpaceOnUse");

            // Cross size (small lines extending from center)
            const crossSize = 4; // 4 pixels in each direction from center            
            // Place cross at the center of the pattern tile
            const centerX = this.gridSize / 2;
            const centerY = this.gridSize / 2;
            
            // Add horizontal line of cross
            pattern.append("line")
                .attr("x1", centerX - crossSize)
                .attr("y1", centerY)
                .attr("x2", centerX + crossSize)
                .attr("y2", centerY)
                .attr("stroke", "#ddd")
                .attr("stroke-width", ".2");

            // Add vertical line of cross
            pattern.append("line")
                .attr("x1", centerX)
                .attr("y1", centerY - crossSize)
                .attr("x2", centerX)
                .attr("y2", centerY + crossSize)
                .attr("stroke", "#ddd")
                .attr("stroke-width", ".2");

            // Create background rectangle with pattern fill (will be sized later)
            const gridGroup = this.svg.insert("g", ":first-child")
                .attr("class", "background-grid");

            gridGroup.append("rect")
                .attr("id", "grid-background")
                .attr("x", 0) // No offset needed on rect - pattern handles it
                .attr("y", 0) // No offset needed on rect - pattern handles it
                .attr("width", 0) // Will be updated when dimensions are known
                .attr("height", 0) // Will be updated when dimensions are known
                .attr("fill", "url(#grid-pattern)");
        }

        _updateBackgroundGridSize() {
            const svgWidth = parseInt(this.svg.attr("width"));
            const svgHeight = parseInt(this.svg.attr("height")) || 600;

            // Update the background rectangle size to cover the full SVG area
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

    /**
     * Expression class - static factory methods for creating railroad diagram expressions
     * Provides a fluent API for building syntax diagrams using layout objects
     * All methods return LayoutBox objects with width, height, baseline, and render() method
     * @class
     */
    class Expression {
        
        /**
         * Create a text box layout for terminal or nonterminal elements
         * @param {string} textContent - Text to display in the box
         * @param {string} className - CSS class: 'terminal' for literals, 'nonterminal' for rule references
         * @returns {LayoutBox} Layout object with render method
         * @example
         * Expression.textBox('"SELECT"', 'terminal')     // Literal keyword
         * Expression.textBox('column_name', 'nonterminal') // Rule reference
         */
        static textBox(textContent, className) {
            const height = 2;
            const gridSize = getGridSizeFromCSS(); // Use actual grid size from CSS
            const textWidth = Expression._measureText(textContent, gridSize, className);
            const width = textWidth + 3; // Add 1 unit on each side for rails, plus 1 for original padding
            // INVARIANT: Ensure total width is even for perfect centering in stacks (Grid Alignment Invariant)
            const adjustedWidth = roundUpToEven(width);

            return {
                width: adjustedWidth,
                height: height,
                baseline: 1,
                render(renderContext) {
                    renderContext.renderTextBox(textContent, className, adjustedWidth);
                }
            };
        }

        /**
         * Create a horizontal sequence of layout elements
         * Elements are connected by rail lines with proper spacing
         * @param {...LayoutBox} children - Variable number of layout elements to sequence
         * @returns {LayoutBox} Layout object containing the sequence
         * @example
         * Expression.sequence(
         *   Expression.textBox('SELECT', 'terminal'),
         *   Expression.textBox('column_name', 'nonterminal')
         * )
         */
        static sequence(...children) {
            // Calculate total width and max height
            const totalWidth = children.reduce((sum, child) => sum + child.width, 0) + (children.length - 1) * 2;
            const maxHeight = Math.max(...children.map(child => child.height));
            const baseline = Math.max(...children.map(child => child.baseline));

            return {
                width: totalWidth,
                height: maxHeight,
                baseline: baseline,
                render(renderContext) {
                    let currentX = 0;

                    children.forEach((child, index) => {
                        // Calculate child Y position to align baselines (in relative coordinates)
                        const childY = baseline - child.baseline;

                        // Call renderChild with child and relative coordinates
                        renderContext.renderChild(child, currentX, childY);

                        // Add horizontal rail connection to next child (except for the last child)
                        if (index < children.length - 1) {
                            const railStartX = currentX + child.width;
                            const railY = baseline;

                            renderContext.trackBuilder
                                .start(railStartX, railY, Direction.EAST)
                                .forward(2) // 2 unit space
                                .finish(`seq-${index}`);
                        }

                        currentX += child.width + 2; // Add 2 for the unit space
                    });

                }
            };
        }

        /**
         * Create a vertical stack of layout elements (choice alternatives)
         * All alternatives share the same entry and exit points with branching rails
         * @param {...LayoutBox} children - Variable number of alternative layout elements
         * @returns {LayoutBox} Layout object containing the stack
         * @example
         * Expression.stack(
         *   Expression.textBox('ASC', 'terminal'),
         *   Expression.textBox('DESC', 'terminal')
         * )
         */
        static stack(...children) {
            const maxChildWidth = roundUpToEven(Math.max(...children.map(child => child.width)));
            const maxWidth = maxChildWidth + 4; // Add 2 units on each side
            const totalHeight = children.reduce((sum, child) => sum + child.height, 0) + (children.length - 1) + 1;
            const baseline = children[0].baseline;

            return {
                width: maxWidth,
                height: totalHeight,
                baseline: baseline,
                render(renderContext) {
                    let currentY = 0;
                    const leftConnectionX = 0;
                    const rightConnectionX = maxWidth;
                    const mainBaseline = baseline;

                    children.forEach((child, index) => {
                        const xOffset = 2 + (maxChildWidth - child.width) / 2;
                        const childX = xOffset;
                        const childBaseline = currentY + child.baseline;

                        renderContext.renderChild(child, childX, currentY);

                        const childLeftX = childX;
                        const childRightX = childX + child.width;

                        if (index === 0) {
                            // For first child: straight line from left connection to child
                            renderContext.trackBuilder
                                .start(leftConnectionX, mainBaseline, Direction.EAST)
                                .forward(childLeftX - leftConnectionX)
                                .finish(`child${index}-left`);

                            // For first child: straight line from child to right connection
                            renderContext.trackBuilder
                                .start(childRightX, childBaseline, Direction.EAST)
                                .forward(rightConnectionX - childRightX)
                                .finish(`child${index}-right`);
                        } else {
                            // For other children: create proper branching paths
                            const verticalDistance = childBaseline - mainBaseline;
                            const horizontalToChild = childLeftX - leftConnectionX;

                            // Left rail path
                            renderContext.trackBuilder
                                .start(leftConnectionX, mainBaseline, Direction.EAST)
                                .turnRight()
                                .forward(verticalDistance - 2)
                                .turnLeft()
                                .forward(horizontalToChild - 2)
                                .finish(`child${index}-left`);

                            // Right rail path
                            const horizontalFromChild = rightConnectionX - childRightX;

                            renderContext.trackBuilder
                                .start(rightConnectionX, mainBaseline, Direction.WEST)
                                .turnLeft()
                                .forward(verticalDistance - 2)
                                .turnRight()
                                .forward(horizontalFromChild - 2)
                                .finish(`child${index}-right`);
                        }

                        currentY += child.height + 1;
                    });
                }
            }
        }

        /**
         * Create a bypass layout for optional elements
         * Adds a rail path above the element allowing it to be skipped
         * @param {LayoutBox} child - The optional layout element
         * @returns {LayoutBox} Layout object with bypass path
         * @example
         * Expression.bypass(Expression.textBox('DISTINCT', 'terminal'))
         */
        static bypass(child) {
            const width = roundUpToEven(child.width + 4);
            const height = child.height + 1;
            const baseline = child.baseline + 1;

            return {
                width: width,
                height: height,
                baseline: baseline,
                render(renderContext) {
                    const mainBaseline = baseline;
                    const childX = (width - child.width) / 2;

                    renderContext.renderChild(child, childX, 1);

                    // Draw the bypass path (above the child)
                    renderContext.trackBuilder
                        .start(0, mainBaseline, Direction.EAST)
                        .turnLeft()
                        .forward(baseline - 2)
                        .turnRight()
                        .forward(width - 4)
                        .turnRight()
                        .forward(baseline - 2)
                        .turnLeft()
                        .finish("bypass-path");

                    renderContext.trackBuilder
                        .start(0, mainBaseline, Direction.EAST)
                        .forward(2)
                        .finish("through-path");
                    renderContext.trackBuilder
                        .start(width, mainBaseline, Direction.WEST)
                        .forward(2)
                        .finish("through-path");
                }
            }
        }

        /**
         * Create a loop layout for repeatable elements
         * Adds a rail path below the element allowing repetition
         * @param {LayoutBox} child - The repeatable layout element
         * @returns {LayoutBox} Layout object with loop path
         * @example
         * Expression.loop(Expression.textBox(',', 'terminal'))
         */
        static loop(child) {
            const width = roundUpToEven(child.width + 4);
            const height = child.height + 1;
            const baseline = child.baseline + 1;

            return {
                width: width,
                height: height,
                baseline: baseline,
                render(renderContext) {
                    const mainBaseline = baseline;
                    const childX = (width - child.width) / 2;

                    renderContext.renderChild(child, childX, 1);

                    // Draw the loop path
                    renderContext.trackBuilder
                        .start(2, mainBaseline, Direction.WEST)
                        .turnRight()
                        .forward(baseline - 2)
                        .turnRight()
                        .forward(width - 4)
                        .turnRight()
                        .forward(baseline - 2)
                        .turnRight()
                        .finish("loop-path");

                    renderContext.trackBuilder
                        .start(0, mainBaseline, Direction.EAST)
                        .forward(2)
                        .finish("through-path");
                    renderContext.trackBuilder
                        .start(width, mainBaseline, Direction.WEST)
                        .forward(2)
                        .finish("through-path");
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

    /**
     * Validate expression code for security to prevent code injection attacks
     * Checks for allowed function names and blocks dangerous patterns
     * @param {string} code - JavaScript code string to validate
     * @returns {boolean} True if validation passes
     * @throws {Error} When code contains disallowed functions or dangerous patterns
     */
    function validateExpressionCode(code) {
        // Remove whitespace and comments for analysis
        const cleanCode = code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').trim();
        
        // Define allowed function names
        const allowedFunctions = ['textBox', 'sequence', 'stack', 'bypass', 'loop'];
        
        // Extract all function calls (word followed by opening parenthesis)
        const functionCalls = cleanCode.match(/\b(\w+)\s*\(/g);
        if (functionCalls) {
            for (const call of functionCalls) {
                const funcName = call.replace(/\s*\(/, '');
                if (!allowedFunctions.includes(funcName)) {
                    throw new Error(`Disallowed function call: ${funcName}`);
                }
            }
        }
        
        // Check for dangerous patterns
        const dangerousPatterns = [
            /\beval\s*\(/,
            /\bFunction\s*\(/,
            /\bsetTimeout\s*\(/,
            /\bsetInterval\s*\(/,
            /\bdocument\./,
            /\bwindow\./,
            /\blocation\./,
            /\bfetch\s*\(/,
            /\bXMLHttpRequest\s*\(/,
            /\balert\s*\(/,
            /\bconsole\./,
            /javascript:/,
            /data:/
        ];
        
        for (const pattern of dangerousPatterns) {
            if (pattern.test(cleanCode)) {
                throw new Error(`Expression contains disallowed pattern: ${pattern.source}`);
            }
        }
        
        return true;
    }

    /**
     * Read grid size from CSS custom properties
     * @returns {number} Grid size in pixels, defaults to 16 if not found
     */
    function getGridSizeFromCSS() {
        const rootStyle = getComputedStyle(document.documentElement);
        const gridSizeStr = rootStyle.getPropertyValue('--rail-grid-size').trim();
        return parseInt(gridSizeStr) || 16; // fallback to 16px if not found
    }

    /**
     * Render a single railroad diagram from expression code
     * @param {Object} config - Configuration object
     * @param {string|HTMLElement} config.containerId - Container element or selector
     * @param {string} config.expressionCode - JavaScript expression code using Expression API
     * @param {string} config.ruleName - Name of the syntax rule being rendered
     * @param {number} [config.gridSize=24] - Size of grid units in pixels
     * @param {boolean} [config.showGrid=false] - Whether to show background grid
     * @param {boolean} [config.showBounds=false] - Whether to show debug bounds
     * @returns {Diagram} The created diagram instance
     * @throws {Error} When expression code is invalid or container not found
     */
    function renderRailroadDiagram(config) {
        const {
            containerId,
            expressionCode,
            ruleName,
            gridSize = 24,
            showGrid = false,
            showBounds = false
        } = config;

        try {
            // Validate the expression code for security
            validateExpressionCode(expressionCode);
            
            // Create diagram instance
            const diagram = new Diagram(containerId, gridSize, showGrid, showBounds);

            // Evaluate the expression code in context with our functions
            const expression = eval(`(function() {
                const { textBox, sequence, stack, bypass, loop } = Expression;
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

    /**
     * Automatically discover and render all diagram script tags in the document
     * Searches for <script type="text/railroad" data-rule="ruleName"> elements
     * and renders them as railroad diagrams within their parent .syntax-rule containers
     * @param {Object} [config={}] - Configuration object
     * @param {boolean} [config.showGrid=false] - Whether to show background grid on all diagrams
     * @param {boolean} [config.showBounds=false] - Whether to show debug bounds on all diagrams
     * @example
     * // Call after DOM is ready, or include in script at end of body
     * RailroadDiagrams.renderDiagramScripts({ showGrid: true });
     */
    function renderDiagramScripts(config = {}) {
        const { showGrid = false, showBounds = false } = config;
        // Always read grid size from CSS custom properties
        const gridSize = getGridSizeFromCSS();

        function doRender() {
            const scriptTags = document.querySelectorAll('script[type="text/railroad"]');

            scriptTags.forEach((scriptTag, index) => {
                const ruleName = scriptTag.dataset.rule;
                const expressionCode = scriptTag.textContent.trim();

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
                            showGrid,
                            showBounds
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

    // Click handler for nonterminal navigation
    function setupClickHandlers() {
        // Use event delegation to handle clicks on nonterminal text elements
        document.addEventListener('click', function(event) {
            // Check if clicked element is a nonterminal text
            if (event.target.classList.contains('textbox-text') && 
                event.target.classList.contains('nonterminal') &&
                event.target.hasAttribute('data-rule')) {
                
                const ruleName = event.target.getAttribute('data-rule');
                
                // Look for element with matching prefixed id (anchor-based navigation)
                const targetElement = document.getElementById(`syntax-rule-${ruleName}`);
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'auto', block: 'start' });
                } else {
                    console.warn(`No anchor found for rule: ${ruleName} (add id="syntax-rule-${ruleName}" to the target element)`);
                }
            }
        });
    }

    // Set up click handlers when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupClickHandlers);
    } else {
        setupClickHandlers();
    }

    // Expose minimal public API to global scope
    global.RailroadDiagrams = {
        // High-level functions (most common usage)
        renderDiagramScripts,
        renderRailroadDiagram,
        
        // Factory for building expressions programmatically
        Expression,
        
        // Advanced: Direct diagram manipulation (rare usage)
        Diagram
    };

})(window);